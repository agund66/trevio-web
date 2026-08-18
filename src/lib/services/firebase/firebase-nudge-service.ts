import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  collectionGroup,
  query as firestoreQuery,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { NudgeService } from "../interfaces/nudge-service";
import type { Nudge } from "../../types";
import { formatCurrencySymbol } from "@/lib/utils/currency";
import { DEFAULT_CURRENCY } from "@/lib/constants/currency";
import { FirebaseExchangeRateService } from "./firebase-exchange-rate-service";

async function formatAmount(amountInGroupCurrency: number, groupCurrency: string, userCurrency: string, exchangeRateService: FirebaseExchangeRateService): Promise<string> {
  if (groupCurrency === userCurrency) return formatCurrencySymbol(amountInGroupCurrency, groupCurrency);
  try {
    const rate = await exchangeRateService.getRate(groupCurrency, userCurrency);
    return formatCurrencySymbol(Math.round(amountInGroupCurrency * rate * 100) / 100, userCurrency);
  } catch {
    return formatCurrencySymbol(amountInGroupCurrency, groupCurrency);
  }
}

export class FirebaseNudgeService implements NudgeService {
  async getActiveNudges(): Promise<Nudge[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const nudgesRef = collection(db, "users", uid, "nudges");
    const q = firestoreQuery(
      nudgesRef,
      where("dismissedAt", "==", 0),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];

    const nudges: Nudge[] = [];
    snapshot.forEach((nudgeDoc) => {
      const data = nudgeDoc.data() as Record<string, unknown>;
      nudges.push({
        nudgeId: nudgeDoc.id,
        uid: (data.uid as string) || uid,
        type: (data.type as string) || "",
        title: (data.title as string) || "",
        body: (data.body as string) || "",
        groupId: (data.groupId as string) || "",
        groupName: (data.groupName as string) || "",
        severity: (data.severity as "info" | "warning" | "positive") || "info",
        actionLabel: (data.actionLabel as string) || "",
        actionType: (data.actionType as string) || "",
        actionData: (data.actionData as Record<string, string>) || {},
        createdAt: (data.createdAt as number) || 0,
        readAt: (data.readAt as number) || 0,
        dismissedAt: (data.dismissedAt as number) || 0,
      });
    });

    return nudges;
  }

  async generateNudges(): Promise<Nudge[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const userDocSnap = await getDoc(doc(db, "users", uid));
    const userCurrency = (userDocSnap.data()?.defaultCurrency as string) || DEFAULT_CURRENCY;
    const exchangeRateService = new FirebaseExchangeRateService();

    // Find all groups the user is an active member of
    const membersSnapshot = await getDocs(
      firestoreQuery(
        collectionGroup(db, "members"),
        where("uid", "==", uid),
        where("status", "==", "active")
      )
    );

    const groupIds: string[] = [];
    membersSnapshot.forEach((memberDoc) => {
      const pathSegments = memberDoc.ref.path.split("/");
      const groupId = pathSegments[1];
      if (groupId && !groupIds.includes(groupId)) {
        groupIds.push(groupId);
      }
    });

    // Fetch existing active nudges for deduplication
    const existingNudgesSnapshot = await getDocs(
      firestoreQuery(
        collection(db, "users", uid, "nudges"),
        where("dismissedAt", "==", 0)
      )
    );

    const existingNudges: Nudge[] = [];
    existingNudgesSnapshot.forEach((nudgeDoc) => {
      const data = nudgeDoc.data() as Record<string, unknown>;
      existingNudges.push({
        nudgeId: nudgeDoc.id,
        uid: (data.uid as string) || uid,
        type: (data.type as string) || "",
        title: (data.title as string) || "",
        body: (data.body as string) || "",
        groupId: (data.groupId as string) || "",
        groupName: (data.groupName as string) || "",
        severity: (data.severity as "info" | "warning" | "positive") || "info",
        actionLabel: (data.actionLabel as string) || "",
        actionType: (data.actionType as string) || "",
        actionData: (data.actionData as Record<string, string>) || {},
        createdAt: (data.createdAt as number) || 0,
        readAt: (data.readAt as number) || 0,
        dismissedAt: (data.dismissedAt as number) || 0,
      });
    });

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const fourteenDays = 14 * 24 * 60 * 60 * 1000;

    const generatedNudges: Nudge[] = [];

    const hasRecentNudge = (type: string, groupId: string): boolean => {
      return existingNudges.some(
        (n) =>
          n.type === type &&
          n.groupId === groupId &&
          now - n.createdAt < twentyFourHours
      );
    };

    // Track all expense dates across groups for streak detection
    const allExpenseDates: number[] = [];

    for (const groupId of groupIds) {
      // Read group info for the group name
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      const groupName = (groupDoc.data()?.name as string) || groupId;
      const groupCurrency = (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY;

      // Read expenses (last 100, ordered by date desc) and settlements
      const expensesRef = collection(db, "groups", groupId, "expenses");
      const expensesQuery = firestoreQuery(
        expensesRef,
        orderBy("date", "desc"),
        limit(100)
      );

      const settlementsRef = collection(db, "groups", groupId, "settlements");

      const [expensesSnapshot, settlementsSnapshot] = await Promise.all([
        getDocs(expensesQuery),
        getDocs(settlementsRef),
      ]);

      // Parse expenses
      const groupExpenses: {
        amount: number;
        amountInGroupCurrency: number;
        paidBy: string;
        splits: Record<string, { amount: number }>;
        date: number;
        transactionType: string;
        createdBy: string;
      }[] = [];

      expensesSnapshot.forEach((expenseDoc) => {
        const data = expenseDoc.data() as Record<string, unknown>;
        const transactionType = (data.transactionType as string) || "expense";
        groupExpenses.push({
          amount: (data.amount as number) || 0,
          amountInGroupCurrency: (data.amountInGroupCurrency as number) ?? ((data.amount as number) || 0),
          paidBy: (data.paidBy as string) || "",
          splits: (data.splits as Record<string, { amount: number }>) || {},
          date: (data.date as number) || 0,
          transactionType,
          createdBy: (data.createdBy as string) || "",
        });
      });

      // Parse settlements
      const groupSettlements: {
        fromUid: string;
        toUid: string;
        amount: number;
        date: number;
      }[] = [];

      settlementsSnapshot.forEach((settlementDoc) => {
        const data = settlementDoc.data() as Record<string, unknown>;
        groupSettlements.push({
          fromUid: (data.fromUid as string) || "",
          toUid: (data.toUid as string) || "",
          amount: (data.amount as number) || 0,
          date: (data.date as number) || 0,
        });
      });

      // Compute user's balance in the group's permanent calculation currency.
      let balance = 0;
      for (const expense of groupExpenses) {
        if (expense.transactionType !== "expense") continue;
        const ratio = expense.amount !== 0 ? expense.amountInGroupCurrency / expense.amount : 1;
        const userShare = (expense.splits[uid]?.amount || 0) * ratio;
        if (expense.paidBy === uid) {
          balance += expense.amountInGroupCurrency - userShare;
        } else {
          balance -= userShare;
        }
      }
      for (const settlement of groupSettlements) {
        if (settlement.fromUid === uid) {
          balance += settlement.amount;
        }
        if (settlement.toUid === uid) {
          balance -= settlement.amount;
        }
      }
      balance = Math.round(balance * 100) / 100;

      // Collect expense dates for streak detection (only expenses created by user)
      for (const expense of groupExpenses) {
        if (expense.transactionType !== "expense") continue;
        if (expense.createdBy === uid) {
          allExpenseDates.push(expense.date);
        }
      }

      // Find oldest unsettled expense date (where user owes money)
      let oldestUnsettledDate = 0;
      if (balance < 0) {
        for (const expense of groupExpenses) {
          if (expense.transactionType !== "expense") continue;
          const userShare = expense.splits[uid]?.amount || 0;
          if (expense.paidBy !== uid && userShare > 0) {
            if (oldestUnsettledDate === 0 || expense.date < oldestUnsettledDate) {
              oldestUnsettledDate = expense.date;
            }
          }
        }
      }

      // a) STALE_DEBT: User owes money and oldest unsettled expense >14 days old
      if (
        balance < 0 &&
        oldestUnsettledDate > 0 &&
        now - oldestUnsettledDate > fourteenDays
      ) {
        if (!hasRecentNudge("STALE_DEBT", groupId)) {
          const nudge: Nudge = {
            nudgeId: "",
            uid,
            type: "STALE_DEBT",
            title: `You have a pending balance in ${groupName}`,
            body: `You owe ${await formatAmount(Math.abs(balance), groupCurrency, userCurrency, exchangeRateService)} in ${groupName}. Settle up to keep things fair.`,
            groupId,
            groupName,
            severity: "warning",
            actionLabel: "Settle Up",
            actionType: "settle_up",
            actionData: { groupId },
            createdAt: now,
            readAt: 0,
            dismissedAt: 0,
          };
          generatedNudges.push(nudge);
        }
      }

      // b) LARGE_EXPENSE: Expense over 120 units of the group's currency in last 7 days.
      const LARGE_EXPENSE_THRESHOLD_GROUP = 120;
      for (const expense of groupExpenses) {
        if (expense.transactionType !== "expense") continue;
        if (expense.paidBy === uid && expense.amountInGroupCurrency > LARGE_EXPENSE_THRESHOLD_GROUP && now - expense.date < sevenDays) {
          if (!hasRecentNudge("LARGE_EXPENSE", groupId)) {
            const nudge: Nudge = {
              nudgeId: "",
              uid,
              type: "LARGE_EXPENSE",
              title: `Big expense in ${groupName}`,
              body: `You fronted ${await formatAmount(expense.amountInGroupCurrency, groupCurrency, userCurrency, exchangeRateService)} for ${groupName}. Consider requesting settlements.`,
              groupId,
              groupName,
              severity: "info",
              actionLabel: "View Group",
              actionType: "view_group",
              actionData: { groupId },
              createdAt: now,
              readAt: 0,
              dismissedAt: 0,
            };
            generatedNudges.push(nudge);
            break;
          }
        }
      }

      // c) INACTIVE_GROUP: No expenses in 30 days but has unsettled balances
      const hasRecentExpense = groupExpenses.some(
        (e) => e.transactionType === "expense" && now - e.date < thirtyDays
      );
      if (!hasRecentExpense && balance !== 0) {
        if (!hasRecentNudge("INACTIVE_GROUP", groupId)) {
          const nudge: Nudge = {
            nudgeId: "",
            uid,
            type: "INACTIVE_GROUP",
            title: `${groupName} has been quiet`,
            body: `No activity in 30 days but there are pending balances. Time to settle up?`,
            groupId,
            groupName,
            severity: "info",
            actionLabel: "View Group",
            actionType: "view_group",
            actionData: { groupId },
            createdAt: now,
            readAt: 0,
            dismissedAt: 0,
          };
          generatedNudges.push(nudge);
        }
      }

      // d) SETTLEMENT_REMINDER: User is owed money for >30 days
      if (balance > 0) {
        let oldestOwedDate = 0;
        for (const expense of groupExpenses) {
          if (expense.transactionType !== "expense") continue;
          const userShare = expense.splits[uid]?.amount || 0;
          const ratio = expense.amount !== 0 ? expense.amountInGroupCurrency / expense.amount : 1;
          if (expense.paidBy === uid && expense.amountInGroupCurrency - userShare * ratio > 0) {
            if (oldestOwedDate === 0 || expense.date < oldestOwedDate) {
              oldestOwedDate = expense.date;
            }
          }
        }
        if (oldestOwedDate > 0 && now - oldestOwedDate > thirtyDays) {
          if (!hasRecentNudge("SETTLEMENT_REMINDER", groupId)) {
            const nudge: Nudge = {
              nudgeId: "",
              uid,
              type: "SETTLEMENT_REMINDER",
              title: `You're owed money in ${groupName}`,
              body: `${await formatAmount(balance, groupCurrency, userCurrency, exchangeRateService)} has been pending for over 30 days. Send a friendly reminder?`,
              groupId,
              groupName,
              severity: "info",
              actionLabel: "Remind",
              actionType: "send_reminder",
              actionData: { groupId },
              createdAt: now,
              readAt: 0,
              dismissedAt: 0,
            };
            generatedNudges.push(nudge);
          }
        }
      }

      // f) GENEROSITY_BADGE: User paid >60% of expenses in a group in last 30 days
      let userPaidCount = 0;
      let totalPaidCount = 0;
      for (const expense of groupExpenses) {
        if (expense.transactionType !== "expense") continue;
        if (now - expense.date < thirtyDays) {
          totalPaidCount++;
          if (expense.paidBy === uid) {
            userPaidCount++;
          }
        }
      }
      if (totalPaidCount > 0) {
        const percent = Math.round((userPaidCount / totalPaidCount) * 100);
        if (percent > 60) {
          if (!hasRecentNudge("GENEROSITY_BADGE", groupId)) {
            const nudge: Nudge = {
              nudgeId: "",
              uid,
              type: "GENEROSITY_BADGE",
              title: `You're the generous one in ${groupName}`,
              body: `You've covered ${percent}% of expenses this month. Your group appreciates you!`,
              groupId,
              groupName,
              severity: "positive",
              actionLabel: "",
              actionType: "",
              actionData: {},
              createdAt: now,
              readAt: 0,
              dismissedAt: 0,
            };
            generatedNudges.push(nudge);
          }
        }
      }
    }

    // e) POSITIVE_STREAK: User logged expenses in 3+ consecutive days
    if (allExpenseDates.length > 0) {
      // Get unique day timestamps (start of day)
      const daySet = new Set<number>();
      for (const ts of allExpenseDates) {
        const dayStart = Math.floor(ts / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
        daySet.add(dayStart);
      }
      const sortedDays = Array.from(daySet).sort((a, b) => b - a); // desc

      // Check for 3+ consecutive days ending today or yesterday
      const todayStart = Math.floor(now / (24 * 60 * 60 * 1000)) * (24 * 60 * 60 * 1000);
      const oneDay = 24 * 60 * 60 * 1000;

      let streak = 0;
      let checkDay = todayStart;
      // Allow streak to start from today or yesterday
      if (!sortedDays.includes(checkDay)) {
        checkDay = todayStart - oneDay;
      }
      while (sortedDays.includes(checkDay)) {
        streak++;
        checkDay -= oneDay;
      }

      if (streak >= 3) {
        if (!hasRecentNudge("POSITIVE_STREAK", "")) {
          const nudge: Nudge = {
            nudgeId: "",
            uid,
            type: "POSITIVE_STREAK",
            title: `You're on a 3-day logging streak!`,
            body: `Keep it up! Consistent logging helps keep group finances transparent.`,
            groupId: "",
            groupName: "",
            severity: "positive",
            actionLabel: "",
            actionType: "",
            actionData: {},
            createdAt: now,
            readAt: 0,
            dismissedAt: 0,
          };
          generatedNudges.push(nudge);
        }
      }
    }

    // Write new nudges to Firestore
    const savedNudges: Nudge[] = [];
    for (const nudge of generatedNudges) {
      const nudgeRef = doc(collection(db, "users", uid, "nudges"));
      const nudgeId = nudgeRef.id;
      const nudgeWithId: Nudge = { ...nudge, nudgeId };
      await setDoc(nudgeRef, nudgeWithId);
      savedNudges.push(nudgeWithId);
    }

    return savedNudges;
  }

  async dismissNudge(nudgeId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!nudgeId) throw new Error("Nudge ID is required");

    await updateDoc(doc(db, "users", uid, "nudges", nudgeId), {
      dismissedAt: Date.now(),
    });
  }

  async markNudgeRead(nudgeId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!nudgeId) throw new Error("Nudge ID is required");

    await updateDoc(doc(db, "users", uid, "nudges", nudgeId), {
      readAt: Date.now(),
    });
  }
}
