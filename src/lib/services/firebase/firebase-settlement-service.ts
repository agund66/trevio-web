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
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { SettlementService } from "../interfaces/settlement-service";
import type { Member, Settlement, SimplifiedDebt, SettlementMethod, SplitEntry } from "../../types";
import { calculateBalances, simplifyDebts } from "../../utils/calculations";

type SplitMap = Record<string, SplitEntry>;

export class FirebaseSettlementService implements SettlementService {
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
    if (params.fromUid === params.toUid) throw new Error("Cannot settle with yourself");

    const groupRef = doc(db, "groups", params.groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const now = new Date();
    const settlementRef = doc(collection(groupRef, "settlements"));

    const settlementData: Record<string, unknown> = {
      fromUid: params.fromUid,
      toUid: params.toUid,
      amount: params.amount,
      currency: params.currency,
      method: params.method || "cash",
      date: now,
      createdBy: uid,
      createdAt: now,
    };

    if (params.upiRefId) {
      settlementData.upiRefId = params.upiRefId;
    }

    const fromUserDoc = await getDoc(doc(db, "users", params.fromUid));
    const fromUserName = (fromUserDoc.data()?.displayName as string) ?? "Someone";
    const toUserDoc = await getDoc(doc(db, "users", params.toUid));
    const toUserName = (toUserDoc.data()?.displayName as string) ?? "Someone";

    const batch = writeBatch(db);
    batch.set(settlementRef, settlementData);
    batch.set(doc(collection(groupRef, "activities")), {
      type: "settlement_added",
      description: `${fromUserName} settled ${params.currency} ${params.amount} with ${toUserName}`,
      userId: uid,
      data: {
        settlementId: settlementRef.id,
        fromUid: params.fromUid,
        toUid: params.toUid,
        amount: params.amount,
      },
      createdAt: now,
    });

    await batch.commit();
    await this.recalculateBalances(params.groupId);

    await setDoc(doc(collection(db, "users", params.toUid, "notifications")), {
      type: "settlement",
      title: "Payment Received",
      body: `${fromUserName} recorded a payment of ${params.currency} ${params.amount} to you`,
      data: {
        groupId: params.groupId,
        groupName: (groupDoc.data()?.name as string) ?? "",
        settlementId: settlementRef.id,
        type: "settlement",
      },
      read: false,
      createdAt: now,
    });

    return settlementRef.id;
  }

  async getSimplifiedDebts(groupId: string): Promise<SimplifiedDebt[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const debts = await this.calculateSimplifiedDebts(groupId);

    const enrichedDebts = await Promise.all(
      debts.map(async (debt) => {
        const [fromDoc, toDoc] = await Promise.all([
          getDoc(doc(db, "users", debt.fromUid)),
          getDoc(doc(db, "users", debt.toUid)),
        ]);
        const fromData = fromDoc.data() as Record<string, unknown> | undefined;
        const toData = toDoc.data() as Record<string, unknown> | undefined;
        return {
          ...debt,
          fromName: (fromData?.displayName as string) ?? "Unknown",
          toName: (toData?.displayName as string) ?? "Unknown",
          fromPhotoURL: (fromData?.photoURL as string) ?? "",
          toPhotoURL: (toData?.photoURL as string) ?? "",
          toUpiId: (toData?.upiId as string) ?? "",
          fromUpiId: (fromData?.upiId as string) ?? "",
          toPhoneNumber: (toData?.phoneNumber as string) ?? "",
          toCountryCode: (toData?.countryCode as string) ?? "",
        } as SimplifiedDebt;
      })
    );

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

    const members = await Promise.all(
      membersSnapshot.docs.map(async (d) => {
        const data = d.data() as Record<string, unknown>;
        const userDoc = await getDoc(doc(db, "users", d.id));
        const userData = userDoc.data() as Record<string, unknown> | undefined;
        return {
          uid: d.id,
          displayName: (userData?.displayName as string) ?? "Unknown",
          username: (userData?.username as string) ?? "",
          photoURL: (userData?.photoURL as string) ?? "",
          balance: (data.balance as number) ?? 0,
          role: (data.role as string) ?? "member",
          status: (data.status as string) ?? "active",
        } as Member;
      })
    );

    return members;
  }

  async getSettlementHistory(groupId: string): Promise<Settlement[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const snapshot = await getDocs(
      firestoreQuery(
        collection(groupRef, "settlements"),
        orderBy("date", "desc"),
        limit(50)
      )
    );

    const settlements = await Promise.all(
      snapshot.docs.map(async (d) => {
        const data = d.data() as Record<string, unknown>;
        const [fromDoc, toDoc] = await Promise.all([
          getDoc(doc(db, "users", data.fromUid as string)),
          getDoc(doc(db, "users", data.toUid as string)),
        ]);
        return {
          settlementId: d.id,
          fromUid: (data.fromUid as string) ?? "",
          toUid: (data.toUid as string) ?? "",
          fromName: (fromDoc.data()?.displayName as string) ?? "Unknown",
          toName: (toDoc.data()?.displayName as string) ?? "Unknown",
          amount: (data.amount as number) ?? 0,
          currency: (data.currency as string) ?? "",
          method: (data.method as SettlementMethod) ?? "cash",
          upiRefId: (data.upiRefId as string) ?? "",
        } as Settlement;
      })
    );

    return settlements;
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

    const batch = writeBatch(db);
    balances.forEach((balance, memberUid) => {
      batch.update(doc(groupRef, "members", memberUid), {
        balance: Math.round(balance * 100) / 100,
      });
    });
    await batch.commit();
  }
}
