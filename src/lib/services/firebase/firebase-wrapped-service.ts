import {
  doc,
  getDoc,
  setDoc,
  collection,
  collectionGroup,
  query as firestoreQuery,
  where,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { WrappedService } from "../interfaces/wrapped-service";
import type { WrappedSummary, MonthlyRecap } from "../../types";
import { DEFAULT_CURRENCY } from "../../constants/currency";
import { FirebaseExchangeRateService } from "./firebase-exchange-rate-service";

export class FirebaseWrappedService implements WrappedService {
  async getWrappedSummary(year: number): Promise<WrappedSummary> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const wrappedDoc = await getDoc(doc(db, "users", uid, "wrapped", String(year)));
    if (wrappedDoc.exists()) {
      return wrappedDoc.data() as WrappedSummary;
    }

    return this.generateWrappedSummary(year);
  }

  async generateWrappedSummary(year: number): Promise<WrappedSummary> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const startOfYear = new Date(year, 0, 1).getTime();
    const endOfYear = new Date(year + 1, 0, 1).getTime() - 1;
    const userDoc = await getDoc(doc(db, "users", uid));
    const userCurrency = (userDoc.data()?.defaultCurrency as string) || DEFAULT_CURRENCY;
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

    // Accumulators
    let totalSpent = 0;
    let totalPaid = 0;
    let expenseCount = 0;
    let largestExpense = 0;
    let largestExpenseDesc = "";
    const categoryBreakdown: Record<string, number> = {};
    const monthlyBreakdown: Record<number, number> = {};
    const groupBreakdown: Record<string, number> = {};
    const groupNameMap: Record<string, string> = {};

    for (const groupId of groupIds) {
      // Fetch group name
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      const groupName = (groupDoc.data()?.name as string) || groupId;
      const groupCurrency = (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY;
      const groupToUserRate = await exchangeRateService.getRate(groupCurrency, userCurrency);
      groupNameMap[groupId] = groupName;

      // Read all expenses for the given year
      const expensesRef = collection(db, "groups", groupId, "expenses");
      const expensesQuery = firestoreQuery(
        expensesRef,
        where("date", ">=", startOfYear),
        where("date", "<=", endOfYear),
        orderBy("date", "desc"),
        limit(1000)
      );

      const expensesSnapshot = await getDocs(expensesQuery);

      let groupSpent = 0;

      expensesSnapshot.forEach((expenseDoc) => {
        const data = expenseDoc.data() as Record<string, unknown>;
        const transactionType = (data.transactionType as string) || "expense";

        // Only count "expense" transactions
        if (transactionType !== "expense") return;

        const groupAmount = (data.amountInGroupCurrency as number) ?? ((data.amount as number) || 0);
        const rawAmount = (data.amount as number) || groupAmount;
        const amount = groupAmount * groupToUserRate;
        const paidBy = (data.paidBy as string) || "";
        const splits = (data.splits as Record<string, { amount: number }>) || {};
        const date = (data.date as number) || 0;
        const category = (data.category as string) || "uncategorized";
        const description = (data.description as string) || "";

        expenseCount++;

        const splitRatio = rawAmount !== 0 ? groupAmount / rawAmount : 1;
        const userShare = (splits[uid]?.amount || 0) * splitRatio * groupToUserRate;
        totalSpent += userShare;

        if (paidBy === uid) {
          totalPaid += amount;
        }

        // Category breakdown
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + userShare;

        // Monthly breakdown
        const month = new Date(date).getMonth() + 1;
        monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + userShare;

        // Group breakdown
        groupSpent += userShare;

        // Largest expense the user was involved in
        if (userShare > 0 && amount > largestExpense) {
          largestExpense = amount;
          largestExpenseDesc = description;
        }
      });

      groupBreakdown[groupName] = (groupBreakdown[groupName] || 0) + groupSpent;
    }

    const totalOwed = totalPaid - totalSpent;
    const groupCount = groupIds.length;
    const avgExpense = expenseCount > 0 ? totalSpent / expenseCount : 0;

    // Top category
    let topCategory = "uncategorized";
    let topCategoryAmount = 0;
    for (const [category, amount] of Object.entries(categoryBreakdown)) {
      if (amount > topCategoryAmount) {
        topCategory = category;
        topCategoryAmount = amount;
      }
    }

    // Top group
    let topGroup = "";
    let topGroupAmount = 0;
    for (const [groupName, amount] of Object.entries(groupBreakdown)) {
      if (amount > topGroupAmount) {
        topGroup = groupName;
        topGroupAmount = amount;
      }
    }

    // Busiest month
    let busiestMonth = 0;
    let busiestMonthAmount = 0;
    for (const [month, amount] of Object.entries(monthlyBreakdown)) {
      if (amount > busiestMonthAmount) {
        busiestMonth = Number(month);
        busiestMonthAmount = amount;
      }
    }

    // Determine personality
    let personality: string;
    let personalityDesc: string;
    if (totalPaid > totalSpent * 1.5) {
      personality = "The Generous One";
      personalityDesc = "You fronted the bill more often than not. Your friends appreciate you!";
    } else if (expenseCount > 100) {
      personality = "The Active Splitter";
      personalityDesc = "You're always splitting bills. Consistency is your superpower!";
    } else if (largestExpense > totalSpent * 0.3) {
      personality = "The Big Spender";
      personalityDesc = "You're not afraid of big expenses. You make things happen!";
    } else if (groupCount > 5) {
      personality = "The Social Butterfly";
      personalityDesc = "You're in many groups, splitting bills with everyone.";
    } else {
      personality = "The Steady Splitter";
      personalityDesc = "You keep it balanced and steady. Reliable and fair.";
    }

    const summary: WrappedSummary = {
      uid,
      currency: userCurrency,
      year,
      totalSpent: Math.round(totalSpent),
      totalPaid: Math.round(totalPaid),
      totalOwed: Math.round(totalOwed),
      expenseCount,
      groupCount,
      topCategory,
      topCategoryAmount: Math.round(topCategoryAmount),
      topGroup,
      topGroupAmount: Math.round(topGroupAmount),
      busiestMonth,
      busiestMonthAmount: Math.round(busiestMonthAmount),
      avgExpense: Math.round(avgExpense),
      largestExpense: Math.round(largestExpense),
      largestExpenseDesc,
      personality,
      personalityDesc,
      categoryBreakdown,
      monthlyBreakdown,
      groupBreakdown,
      generatedAt: Date.now(),
    };

    await setDoc(doc(db, "users", uid, "wrapped", String(year)), summary);

    return summary;
  }

  async getMonthlyRecap(year: number, month: number): Promise<MonthlyRecap> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const recapDoc = await getDoc(doc(db, "users", uid, "wrapped", `${year}_${month}`));
    if (recapDoc.exists()) {
      return recapDoc.data() as MonthlyRecap;
    }

    return this.generateMonthlyRecap(year, month);
  }

  async generateMonthlyRecap(year: number, month: number): Promise<MonthlyRecap> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const startOfMonth = new Date(year, month - 1, 1).getTime();
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    const userDoc = await getDoc(doc(db, "users", uid));
    const userCurrency = (userDoc.data()?.defaultCurrency as string) || DEFAULT_CURRENCY;
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

    // Accumulators
    let totalSpent = 0;
    let expenseCount = 0;
    let largestExpense = 0;
    const categoryBreakdown: Record<string, number> = {};
    const groupBreakdown: Record<string, number> = {};

    for (const groupId of groupIds) {
      // Fetch group name
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      const groupName = (groupDoc.data()?.name as string) || groupId;
      const groupCurrency = (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY;
      const groupToUserRate = await exchangeRateService.getRate(groupCurrency, userCurrency);

      // Read all expenses for the given month
      const expensesRef = collection(db, "groups", groupId, "expenses");
      const expensesQuery = firestoreQuery(
        expensesRef,
        where("date", ">=", startOfMonth),
        where("date", "<=", endOfMonth),
        orderBy("date", "desc"),
        limit(1000)
      );

      const expensesSnapshot = await getDocs(expensesQuery);

      let groupSpent = 0;

      expensesSnapshot.forEach((expenseDoc) => {
        const data = expenseDoc.data() as Record<string, unknown>;
        const transactionType = (data.transactionType as string) || "expense";

        // Only count "expense" transactions
        if (transactionType !== "expense") return;

        const groupAmount = (data.amountInGroupCurrency as number) ?? ((data.amount as number) || 0);
        const rawAmount = (data.amount as number) || groupAmount;
        const amount = groupAmount * groupToUserRate;
        const splits = (data.splits as Record<string, { amount: number }>) || {};
        const category = (data.category as string) || "uncategorized";

        expenseCount++;

        const splitRatio = rawAmount !== 0 ? groupAmount / rawAmount : 1;
        const userShare = (splits[uid]?.amount || 0) * splitRatio * groupToUserRate;
        totalSpent += userShare;

        // Category breakdown
        categoryBreakdown[category] = (categoryBreakdown[category] || 0) + userShare;

        // Group breakdown
        groupSpent += userShare;

        // Largest expense the user was involved in
        if (userShare > 0 && amount > largestExpense) {
          largestExpense = amount;
        }
      });

      groupBreakdown[groupName] = (groupBreakdown[groupName] || 0) + groupSpent;
    }

    const groupCount = groupIds.length;

    // Top category
    let topCategory = "uncategorized";
    let topCategoryAmount = 0;
    for (const [category, amount] of Object.entries(categoryBreakdown)) {
      if (amount > topCategoryAmount) {
        topCategory = category;
        topCategoryAmount = amount;
      }
    }

    // Top group
    let topGroup = "";
    let topGroupAmount = 0;
    for (const [groupName, amount] of Object.entries(groupBreakdown)) {
      if (amount > topGroupAmount) {
        topGroup = groupName;
        topGroupAmount = amount;
      }
    }

    // Determine personality (scaled for monthly data)
    let personality: string;
    let personalityDesc: string;
    if (expenseCount > 100) {
      personality = "The Active Splitter";
      personalityDesc = "You're always splitting bills. Consistency is your superpower!";
    } else if (largestExpense > totalSpent * 0.3) {
      personality = "The Big Spender";
      personalityDesc = "You're not afraid of big expenses. You make things happen!";
    } else if (groupCount > 5) {
      personality = "The Social Butterfly";
      personalityDesc = "You're in many groups, splitting bills with everyone.";
    } else {
      personality = "The Steady Splitter";
      personalityDesc = "You keep it balanced and steady. Reliable and fair.";
    }

    const recap: MonthlyRecap = {
      uid,
      currency: userCurrency,
      year,
      month,
      totalSpent: Math.round(totalSpent),
      expenseCount,
      topCategory,
      topCategoryAmount: Math.round(topCategoryAmount),
      topGroup,
      topGroupAmount: Math.round(topGroupAmount),
      personality,
      personalityDesc,
      generatedAt: Date.now(),
    };

    await setDoc(doc(db, "users", uid, "wrapped", `${year}_${month}`), recap);

    return recap;
  }
}
