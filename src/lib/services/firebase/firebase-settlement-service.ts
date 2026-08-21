import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { SettlementService } from "../interfaces/settlement-service";
import type { Member, Settlement, SimplifiedDebt, SettlementMethod, SplitEntry } from "../../types";
import { calculateBalances, simplifyDebts } from "../../utils/calculations";
import { FirebaseExchangeRateService } from "./firebase-exchange-rate-service";
import { FIRESTORE_BATCH_LIMIT } from "../../constants/firestore";
import { DEFAULT_CURRENCY } from "../../constants/currency";

type SplitMap = Record<string, SplitEntry>;

export class FirebaseSettlementService implements SettlementService {
  private exchangeRateService = new FirebaseExchangeRateService();

  async addSettlement(params: {
    groupId: string;
    fromUid: string;
    toUid: string;
    amount: number;
    currency: string;
    method: SettlementMethod;
    upiRefId?: string;
  }): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!params.groupId || !params.fromUid || !params.toUid || !params.amount) {
      throw new Error("Missing required fields");
    }
    if (params.amount <= 0) {
      throw new Error("Settlement amount must be greater than 0");
    }
    if (params.fromUid === params.toUid) throw new Error("Cannot settle with yourself");

    const groupRef = doc(db, "groups", params.groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    // Reject settlements in archived groups
    if (groupDoc.data()?.archived === true) {
      throw new Error("Cannot settle up in an archived group");
    }

    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    // Allow settlement if the user is a party to it OR is a group admin
    const isAdmin = memberDoc.data()?.role === "admin";
    if (uid !== params.fromUid && uid !== params.toUid && !isAdmin) {
      throw new Error("You can only record settlements involving yourself or be a group admin");
    }

    const [fromMember, toMember] = await Promise.all([
      getDoc(doc(groupRef, "members", params.fromUid)),
      getDoc(doc(groupRef, "members", params.toUid)),
    ]);
    if (!fromMember.exists() || !toMember.exists()) {
      throw new Error("Both parties must be group members");
    }

    const groupCurrency = (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY;
    const rateToGroupCurrency = await this.exchangeRateService.getRate(params.currency, groupCurrency);
    const amountInGroupCurrency = Math.round((params.amount * rateToGroupCurrency) * 100) / 100;

    const now = Date.now();
    const settlementRef = doc(collection(groupRef, "settlements"));

    const settlementData: Record<string, unknown> = {
      fromUid: params.fromUid,
      toUid: params.toUid,
      amount: amountInGroupCurrency,
      currency: groupCurrency,
      originalAmount: params.amount,
      originalCurrency: params.currency,
      exchangeRateToGroupCurrency: rateToGroupCurrency,
      amountInGroupCurrency,
      method: params.method || "cash",
      date: now,
      createdBy: uid,
      createdAt: now,
    };

    if (params.upiRefId) {
      settlementData.upiRefId = params.upiRefId;
    }

    const [fromUserDoc, fromMemberDoc, toUserDoc, toMemberDoc] = await Promise.all([
      getDoc(doc(db, "users", params.fromUid)),
      getDoc(doc(groupRef, "members", params.fromUid)),
      getDoc(doc(db, "users", params.toUid)),
      getDoc(doc(groupRef, "members", params.toUid)),
    ]);
    const fromIsOffline = fromMemberDoc.data()?.isOffline === true;
    const fromUserName = fromIsOffline
      ? (fromMemberDoc.data()?.displayName as string) ?? "Someone"
      : (fromUserDoc.data()?.displayName as string) ?? "Someone";
    const toIsOffline = toMemberDoc.data()?.isOffline === true;
    const toUserName = toIsOffline
      ? (toMemberDoc.data()?.displayName as string) ?? "Someone"
      : (toUserDoc.data()?.displayName as string) ?? "Someone";

    // Denormalize payer/payee display names onto the settlement doc
    // for read-path efficiency (avoids per-doc member lookups).
    settlementData.fromName = fromUserName;
    settlementData.toName = toUserName;

    const batch = writeBatch(db);
    batch.set(settlementRef, settlementData);
    batch.set(doc(collection(groupRef, "activities")), {
      type: "settlement_added",
      description: `${fromUserName} settled ${params.currency} ${params.amount} with ${toUserName}`,
      userId: uid,
      userName: (memberDoc.data()?.displayName as string) ?? "",
      userPhotoURL: (memberDoc.data()?.photoURL as string) ?? "",
      data: {
        settlementId: settlementRef.id,
        fromUid: params.fromUid,
        toUid: params.toUid,
        amount: amountInGroupCurrency,
      },
      createdAt: now,
    });

    await batch.commit();
    await this.recalculateBalances(params.groupId);

    // Notify the receiver and/or payer (non-blocking — don't fail settlement creation if notification fails)
    // Skip self-notification: don't notify the user who is recording the settlement
    try {
      const groupName = (groupDoc.data()?.name as string) ?? "";
      const notifyUids: string[] = [];
      if (params.toUid !== uid) notifyUids.push(params.toUid);
      if (params.fromUid !== uid && !notifyUids.includes(params.fromUid)) notifyUids.push(params.fromUid);

      for (const notifyUid of notifyUids) {
        const isReceiver = notifyUid === params.toUid;
        await setDoc(doc(collection(db, "users", notifyUid, "notifications")), {
          type: "settlement",
          title: isReceiver ? "Payment Received" : "Payment Recorded",
          body: isReceiver
            ? `${fromUserName} recorded a payment of ${params.currency} ${params.amount} to you`
            : `You paid ${toUserName} ${params.currency} ${params.amount} (recorded by ${fromUserName === toUserName ? "them" : fromUserName})`,
          data: {
            groupId: params.groupId,
            groupName,
            settlementId: settlementRef.id,
            type: "settlement",
          },
          read: false,
          createdAt: now,
        });
      }
    } catch (notifError) {
      console.warn("Failed to send settlement notification:", notifError);
    }

    return settlementRef.id;
  }

  async getSimplifiedDebts(groupId: string): Promise<SimplifiedDebt[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    // Read simplifiedDebts from the group doc (stored during recalculateBalances).
    // Fall back to full computation for older docs that don't have the field.
    const groupDoc = await getDoc(groupRef);
    const storedDebts = groupDoc.data()?.simplifiedDebts as
      | Array<{ fromUid: string; toUid: string; amount: number }>
      | undefined;
    const debts = storedDebts && Array.isArray(storedDebts)
      ? storedDebts
      : await this.calculateSimplifiedDebts(groupId);

    const allUids = debts.flatMap((d) => [d.fromUid, d.toUid]).filter(Boolean);
    const uniqueUids = [...new Set(allUids)];

    const [memberDocs, userDocs] = await Promise.all([
      Promise.all(uniqueUids.map((uid) => getDoc(doc(groupRef, "members", uid)))),
      Promise.all(uniqueUids.map((uid) => getDoc(doc(db, "users", uid)))),
    ]);

    const memberMap = new Map<string, Record<string, unknown>>();
    memberDocs.forEach((d, i) => {
      if (d.exists()) memberMap.set(uniqueUids[i], d.data() as Record<string, unknown>);
    });
    const userMap = new Map<string, Record<string, unknown>>();
    userDocs.forEach((d, i) => {
      if (d.exists()) userMap.set(uniqueUids[i], d.data() as Record<string, unknown>);
    });

    const enrichedDebts = debts.map((debt) => {
      const fromMemberData = memberMap.get(debt.fromUid);
      const toMemberData = memberMap.get(debt.toUid);
      const fromIsOffline = fromMemberData?.isOffline === true;
      const toIsOffline = toMemberData?.isOffline === true;

      const fromName = (fromMemberData?.displayName as string) ?? "Unknown";
      const fromPhotoURL = (fromMemberData?.photoURL as string) ?? "";
      const fromUpiId = fromIsOffline ? "" : ((userMap.get(debt.fromUid)?.upiId as string) ?? "");

      const toName = (toMemberData?.displayName as string) ?? "Unknown";
      const toPhotoURL = (toMemberData?.photoURL as string) ?? "";
      const toUpiId = toIsOffline ? "" : ((userMap.get(debt.toUid)?.upiId as string) ?? "");
      const toPhoneNumber = toIsOffline ? "" : ((userMap.get(debt.toUid)?.phoneNumber as string) ?? "");
      const toCountryCode = toIsOffline ? "" : ((userMap.get(debt.toUid)?.countryCode as string) ?? "");

      return {
        ...debt,
        fromName,
        toName,
        fromPhotoURL,
        toPhotoURL,
        fromUpiId,
        toUpiId,
        toPhoneNumber,
        toCountryCode,
      } as SimplifiedDebt;
    });

    return enrichedDebts;
  }

  async getGroupBalances(groupId: string): Promise<Member[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const membersSnapshot = await getDocs(
      firestoreQuery(
        collection(groupRef, "members"),
        where("status", "in", ["active", "pending"])
      )
    );

    const members = membersSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const isOffline = data.isOffline === true;
      return {
        uid: d.id,
        displayName: (data.displayName as string) ?? "Unknown",
        username: (data.username as string) ?? "",
        photoURL: (data.photoURL as string) ?? "",
        balance: (data.balance as number) ?? 0,
        role: (data.role as string) ?? "member",
        status: (data.status as string) ?? "active",
        isOffline,
        currency: (data.currency as string) ?? DEFAULT_CURRENCY,
      } as Member;
    });

    return members;
  }

  async getSettlementHistory(groupId: string, pageSize: number = 50, lastSettlementId?: string): Promise<{ settlements: Settlement[]; hasMore: boolean; lastSettlementId: string | null }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    let q = firestoreQuery(
      collection(groupRef, "settlements"),
      orderBy("date", "desc"),
      limit(pageSize)
    );

    if (lastSettlementId) {
      const lastDoc = await getDoc(doc(groupRef, "settlements", lastSettlementId));
      if (lastDoc.exists()) {
        q = firestoreQuery(
          collection(groupRef, "settlements"),
          orderBy("date", "desc"),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }
    }

    const snapshot = await getDocs(q);

    const allUids = snapshot.docs.flatMap((d) => {
      const data = d.data() as Record<string, unknown>;
      return [(data.fromUid as string) ?? "", (data.toUid as string) ?? ""];
    }).filter(Boolean);
    const uniqueUids = [...new Set(allUids)];

    const memberDocs = await Promise.all(
      uniqueUids.map((u) => getDoc(doc(groupRef, "members", u)))
    );

    const memberMap = new Map<string, Record<string, unknown>>();
    memberDocs.forEach((d, i) => {
      if (d.exists()) memberMap.set(uniqueUids[i], d.data() as Record<string, unknown>);
    });

    const settlements = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const fromUid = (data.fromUid as string) ?? "";
      const toUid = (data.toUid as string) ?? "";

      // Prefer denormalized names on the settlement doc; fall back to
      // member-doc lookups for older docs that don't have these fields.
      const fromMemberData = memberMap.get(fromUid);
      const toMemberData = memberMap.get(toUid);

      const fromName = (data.fromName as string) ?? (fromMemberData?.displayName as string) ?? "Unknown";
      const toName = (data.toName as string) ?? (toMemberData?.displayName as string) ?? "Unknown";

      return {
        settlementId: d.id,
        fromUid,
        toUid,
        fromName,
        toName,
        amount: (data.amount as number) ?? 0,
        currency: (data.currency as string) ?? DEFAULT_CURRENCY,
        originalAmount: (data.originalAmount as number) ?? undefined,
        originalCurrency: (data.originalCurrency as string) ?? undefined,
        exchangeRateToGroupCurrency: (data.exchangeRateToGroupCurrency as number) ?? 1,
        amountInGroupCurrency: (data.amountInGroupCurrency as number) ?? ((data.amount as number) || 0),
        method: (data.method as SettlementMethod) ?? "cash",
        upiRefId: (data.upiRefId as string) ?? "",
        date: (data.date as number) ?? 0,
        createdBy: (data.createdBy as string) ?? "",
      } as Settlement;
    });

    return {
      settlements,
      hasMore: snapshot.size === pageSize,
      lastSettlementId: snapshot.size > 0 ? snapshot.docs[snapshot.size - 1].id : null,
    };
  }

  private async calculateSimplifiedDebts(groupId: string): Promise<Array<{ fromUid: string; toUid: string; amount: number }>> {
    const groupRef = doc(db, "groups", groupId);

    const [expensesSnapshot, settlementsSnapshot, membersSnapshot] = await Promise.all([
      getDocs(collection(groupRef, "expenses")),
      getDocs(collection(groupRef, "settlements")),
      getDocs(firestoreQuery(collection(groupRef, "members"), where("status", "==", "active"))),
    ]);

    const memberUids = membersSnapshot.docs.map((d) => d.id);

    const expenses = expensesSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        paidBy: data.paidBy as string,
        splits: data.splits as SplitMap,
        amount: data.amount as number,
        amountInGroupCurrency: (data.amountInGroupCurrency as number) ?? ((data.amount as number) || 0),
      };
    });

    const settlements = settlementsSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        fromUid: data.fromUid as string,
        toUid: data.toUid as string,
        amount: data.amount as number,
      };
    });

    const balances = calculateBalances(expenses, settlements, memberUids);
    return simplifyDebts(balances);
  }

  private async recalculateBalances(groupId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);

    const [expensesSnapshot, settlementsSnapshot, membersSnapshot] = await Promise.all([
      getDocs(collection(groupRef, "expenses")),
      getDocs(collection(groupRef, "settlements")),
      getDocs(firestoreQuery(collection(groupRef, "members"), where("status", "==", "active"))),
    ]);

    const memberUids = membersSnapshot.docs.map((d) => d.id);

    const expenses = expensesSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        paidBy: data.paidBy as string,
        splits: data.splits as SplitMap,
        amount: data.amount as number,
        amountInGroupCurrency: (data.amountInGroupCurrency as number) ?? ((data.amount as number) || 0),
      };
    });

    const settlements = settlementsSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        fromUid: data.fromUid as string,
        toUid: data.toUid as string,
        amount: data.amount as number,
      };
    });

    const balances = calculateBalances(expenses, settlements, memberUids);
    const simplifiedDebts = simplifyDebts(balances);

    const balanceEntries = Array.from(balances.entries());

    // If there are no balance entries, still store simplifiedDebts on the group doc
    if (balanceEntries.length === 0) {
      const batch = writeBatch(db);
      batch.update(groupRef, { simplifiedDebts });
      await batch.commit();
      return;
    }

    for (let i = 0; i < balanceEntries.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = balanceEntries.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      // Store simplifiedDebts on the group doc in the first batch
      if (i === 0) {
        batch.update(groupRef, { simplifiedDebts });
      }
      for (const [memberUid, balance] of chunk) {
        batch.update(doc(groupRef, "members", memberUid), {
          balance: Math.round(balance * 100) / 100,
        });
      }
      await batch.commit();
    }
  }
}
