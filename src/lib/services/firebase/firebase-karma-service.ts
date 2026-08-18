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
import type { KarmaService } from "../interfaces/karma-service";
import type { KarmaBreakdown, KarmaComponents } from "../../types";

export class FirebaseKarmaService implements KarmaService {
  async getKarmaBreakdown(): Promise<KarmaBreakdown> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const breakdownDoc = await getDoc(doc(db, "users", uid, "karma", "breakdown"));
    if (breakdownDoc.exists()) {
      const data = breakdownDoc.data() as Record<string, unknown>;
      return {
        uid,
        score: (data.score as number) || 0,
        tier: (data.tier as string) || "bronze",
        components: (data.components as KarmaComponents) || {
          reliabilityScore: 0,
          generosityScore: 0,
          consistencyScore: 0,
          settlementSpeedScore: 0,
          groupHealthScore: 0,
        },
        updatedAt: (data.updatedAt as number) || 0,
      };
    }

    return this.refreshKarma();
  }

  async refreshKarma(): Promise<KarmaBreakdown> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

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

    // Accumulators for karma computation
    let totalPaidForOthers = 0;
    let totalSpent = 0;
    let expenseCount = 0;
    let settledDebts = 0;
    let outstandingDebts = 0;
    let staleDebtCount = 0;
    let settlementDaysSum = 0;
    let settlementPairCount = 0;

    for (const groupId of groupIds) {
      // Read expenses (last 500, ordered by date desc) and settlements
      const expensesRef = collection(db, "groups", groupId, "expenses");
      const expensesQuery = firestoreQuery(expensesRef, orderBy("date", "desc"), limit(500));

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
          amount: (data.amountInGroupCurrency as number) ?? ((data.amount as number) || 0),
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

      // Compute group-level values
      let groupBalance = 0;

      for (const expense of groupExpenses) {
        // Only count "expense" transactions for spending totals
        if (expense.transactionType !== "expense") continue;

        expenseCount++;
        totalSpent += expense.amount;

        const ratio = expense.amount !== 0 ? expense.amountInGroupCurrency / expense.amount : 1;
        const userShare = (expense.splits[uid]?.amount || 0) * ratio;
        if (expense.paidBy === uid) {
          totalPaidForOthers += Math.max(0, expense.amount - userShare);
        }

        // Track user's balance contribution from this expense
        if (expense.paidBy === uid) {
          groupBalance += expense.amount - userShare;
        } else {
          groupBalance -= userShare;
        }

        // Settlement speed: find settlements after this expense date
        for (const settlement of groupSettlements) {
          if (settlement.date >= expense.date && settlement.amount > 0) {
            const daysDiff = (settlement.date - expense.date) / (1000 * 60 * 60 * 24);
            if (daysDiff >= 0) {
              settlementDaysSum += daysDiff;
              settlementPairCount++;
            }
          }
        }
      }

      // Settled debts: settlements where user is the payer
      for (const settlement of groupSettlements) {
        if (settlement.fromUid === uid) {
          settledDebts += settlement.amount;
        }
      }

      // Outstanding debts: negative balance means user owes money
      if (groupBalance < 0) {
        outstandingDebts += Math.abs(groupBalance);
        staleDebtCount++;
      }
    }

    // Compute karma components
    const totalDebts = settledDebts + outstandingDebts;
    const reliabilityScore = Math.min(300, (settledDebts / Math.max(totalDebts, 1)) * 300);

    const generosityScore = Math.min(250, (totalPaidForOthers / Math.max(totalSpent, 1)) * 250);

    const consistencyScore = Math.min(200, (expenseCount / 50) * 200);

    let settlementSpeedScore = 0;
    if (settlementPairCount > 0) {
      const avgSettlementDays = settlementDaysSum / settlementPairCount;
      if (avgSettlementDays <= 30) {
        settlementSpeedScore = Math.min(150, Math.max(0, 150 - avgSettlementDays * 5));
      }
    }

    const groupHealthScore = Math.min(100, Math.max(0, 100 - staleDebtCount * 10));

    const components: KarmaComponents = {
      reliabilityScore: Math.round(reliabilityScore),
      generosityScore: Math.round(generosityScore),
      consistencyScore: Math.round(consistencyScore),
      settlementSpeedScore: Math.round(settlementSpeedScore),
      groupHealthScore: Math.round(groupHealthScore),
    };

    const totalScore = Math.min(1000, Math.max(0, Math.round(
      components.reliabilityScore +
      components.generosityScore +
      components.consistencyScore +
      components.settlementSpeedScore +
      components.groupHealthScore
    )));

    let tier: string;
    if (totalScore <= 200) {
      tier = "bronze";
    } else if (totalScore <= 450) {
      tier = "silver";
    } else if (totalScore <= 700) {
      tier = "gold";
    } else {
      tier = "platinum";
    }

    const now = Date.now();

    const breakdown: KarmaBreakdown = {
      uid,
      score: totalScore,
      tier,
      components,
      updatedAt: now,
    };

    // Cache the breakdown
    await setDoc(doc(db, "users", uid, "karma", "breakdown"), breakdown);

    // Update the user doc with karma summary
    await updateDoc(doc(db, "users", uid), {
      karmaScore: totalScore,
      karmaTier: tier,
      karmaUpdatedAt: now,
    });

    return breakdown;
  }

  async setKarmaPublic(isPublic: boolean): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    await updateDoc(doc(db, "users", uid), {
      karmaPublic: isPublic,
      updatedAt: Date.now(),
    });
  }

  async getPublicKarma(uid: string): Promise<KarmaBreakdown | null> {
    if (!uid) throw new Error("User ID is required");

    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data() as Record<string, unknown>;
    const isPublic = userData.karmaPublic === true;
    if (!isPublic) return null;

    const breakdownDoc = await getDoc(doc(db, "users", uid, "karma", "breakdown"));
    if (!breakdownDoc.exists()) return null;

    const data = breakdownDoc.data() as Record<string, unknown>;
    return {
      uid,
      score: (data.score as number) || 0,
      tier: (data.tier as string) || "bronze",
      components: (data.components as KarmaComponents) || {
        reliabilityScore: 0,
        generosityScore: 0,
        consistencyScore: 0,
        settlementSpeedScore: 0,
        groupHealthScore: 0,
      },
      updatedAt: (data.updatedAt as number) || 0,
    };
  }
}
