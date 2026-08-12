import type {
  Expense,
  Member,
  CategoryBreakdown,
  MonthlyTrend,
  MemberSpending,
  GroupAnalytics,
  UserAnalytics,
} from "../types";
import { MONTH_LABELS } from "./date";
import { round2 } from "./math";

export function computeCategoryBreakdown(expenses: Expense[]): CategoryBreakdown[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const cat = e.category || "other";
    const existing = map.get(cat) || { total: 0, count: 0 };
    existing.total += e.amount;
    existing.count += 1;
    map.set(cat, existing);
  }
  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const result: CategoryBreakdown[] = [];
  for (const [category, { total, count }] of Array.from(map.entries())) {
    result.push({
      category,
      totalAmount: round2(total),
      expenseCount: count,
      percentage: grandTotal > 0 ? round2((total / grandTotal) * 100) : 0,
    });
  }
  return result.sort((a, b) => b.totalAmount - a.totalAmount);
}

export function computeMonthlyTrends(expenses: Expense[], months = 6): MonthlyTrend[] {
  const now = new Date();
  const trends: MonthlyTrend[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    trends.push({
      month: key,
      label: `${MONTH_LABELS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      totalAmount: 0,
      expenseCount: 0,
    });
  }
  const trendMap = new Map(trends.map((t) => [t.month, t]));
  for (const e of expenses) {
    const date = e.date ? new Date(e.date) : new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const trend = trendMap.get(key);
    if (trend) {
      trend.totalAmount += e.amount;
      trend.expenseCount += 1;
    }
  }
  for (const t of trends) {
    t.totalAmount = round2(t.totalAmount);
  }
  return trends;
}

export function computeMemberSpending(
  expenses: Expense[],
  members: Member[],
  currentUserId: string
): MemberSpending[] {
  const map = new Map<string, MemberSpending>();
  for (const m of members) {
    map.set(m.uid, {
      uid: m.uid,
      displayName: m.displayName,
      photoURL: m.photoURL,
      totalPaid: 0,
      totalShare: 0,
      expenseCount: 0,
      netBalance: m.balance,
    });
  }
  for (const e of expenses) {
    const payer = map.get(e.paidBy);
    if (payer) {
      payer.totalPaid += e.amount;
      payer.expenseCount += 1;
    }
    if (e.splits) {
      for (const [uid, split] of Object.entries(e.splits)) {
        const member = map.get(uid);
        if (member) {
          member.totalShare += split.amount;
        }
      }
    }
  }
  const result = Array.from(map.values());
  for (const m of result) {
    m.totalPaid = round2(m.totalPaid);
    m.totalShare = round2(m.totalShare);
  }
  return result.sort((a, b) => b.totalPaid - a.totalPaid);
}

export function computeGroupAnalytics(
  groupId: string,
  groupName: string,
  expenses: Expense[],
  members: Member[],
  currentUserId: string
): GroupAnalytics {
  // Filter to only "expense" type for spending analytics.
  // Income entries should not be counted in spending totals.
  const spendingExpenses = expenses.filter((e) => (e.transactionType ?? "expense") === "expense");

  const totalExpenses = round2(spendingExpenses.reduce((s, e) => s + e.amount, 0));
  const expenseCount = spendingExpenses.length;
  const avgExpenseAmount = expenseCount > 0 ? round2(totalExpenses / expenseCount) : 0;

  let highestExpense: GroupAnalytics["highestExpense"] = null;
  if (spendingExpenses.length > 0) {
    const highest = spendingExpenses.reduce((max, e) => (e.amount > max.amount ? e : max), spendingExpenses[0]);
    highestExpense = {
      description: highest.description,
      amount: highest.amount,
      date: highest.date || 0,
    };
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentExpenses = spendingExpenses.filter((e) => (e.date || 0) >= thirtyDaysAgo);
  const recentActivityRate = expenseCount > 0 ? round2((recentExpenses.length / expenseCount) * 100) : 0;

  return {
    groupId,
    groupName,
    totalExpenses,
    expenseCount,
    categoryBreakdown: computeCategoryBreakdown(spendingExpenses),
    monthlyTrends: computeMonthlyTrends(spendingExpenses),
    memberSpending: computeMemberSpending(spendingExpenses, members, currentUserId),
    avgExpenseAmount,
    highestExpense,
    recentActivityRate,
  };
}

export function computeUserAnalytics(
  groups: { groupId: string; groupName: string; yourBalance: number; totalExpenses: number; archived: boolean }[],
  allExpensesByGroup: Map<string, Expense[]>,
  currentUserId: string
): UserAnalytics {
  let totalSpent = 0;
  let totalPaid = 0;
  let expenseCount = 0;
  const allExpenses: Expense[] = [];
  const groupSpendingMap = new Map<string, { groupId: string; groupName: string; totalSpent: number; expenseCount: number }>();

  for (const g of groups) {
    if (g.archived) continue;
    const expenses = allExpensesByGroup.get(g.groupId) || [];
    // Filter to only "expense" type for spending analytics.
    // Income entries should not be counted in spending totals.
    const spendingExpenses = expenses.filter(
      (e) => (e.transactionType ?? "expense") === "expense"
    );
    for (const e of spendingExpenses) {
      allExpenses.push(e);
      totalSpent += e.amount;
      expenseCount += 1;
      if (e.paidBy === currentUserId) {
        totalPaid += e.amount;
      }
    }
    const groupTotal = spendingExpenses.reduce((s, e) => s + e.amount, 0);
    groupSpendingMap.set(g.groupId, {
      groupId: g.groupId,
      groupName: g.groupName,
      totalSpent: round2(groupTotal),
      expenseCount: spendingExpenses.length,
    });
  }

  const totalOwed = groups.filter((g) => g.yourBalance > 0).reduce((s, g) => s + g.yourBalance, 0);
  const totalOwing = groups.filter((g) => g.yourBalance < 0).reduce((s, g) => s + Math.abs(g.yourBalance), 0);

  const topGroups = Array.from(groupSpendingMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return {
    totalSpent: round2(totalSpent),
    totalPaid: round2(totalPaid),
    totalOwed: round2(totalOwed),
    totalOwing: round2(totalOwing),
    netBalance: round2(totalOwed - totalOwing),
    groupCount: groups.filter((g) => !g.archived).length,
    expenseCount,
    categoryBreakdown: computeCategoryBreakdown(allExpenses),
    monthlyTrends: computeMonthlyTrends(allExpenses),
    topGroups,
  };
}
