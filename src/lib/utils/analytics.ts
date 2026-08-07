import type {
  Expense,
  Member,
  CategoryBreakdown,
  MonthlyTrend,
  MemberSpending,
  GroupAnalytics,
  UserAnalytics,
} from "../types";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
      totalAmount: Math.round(total * 100) / 100,
      expenseCount: count,
      percentage: grandTotal > 0 ? Math.round((total / grandTotal) * 10000) / 100 : 0,
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
    t.totalAmount = Math.round(t.totalAmount * 100) / 100;
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
    m.totalPaid = Math.round(m.totalPaid * 100) / 100;
    m.totalShare = Math.round(m.totalShare * 100) / 100;
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
  const totalExpenses = Math.round(expenses.reduce((s, e) => s + e.amount, 0) * 100) / 100;
  const expenseCount = expenses.length;
  const avgExpenseAmount = expenseCount > 0 ? Math.round((totalExpenses / expenseCount) * 100) / 100 : 0;

  let highestExpense: GroupAnalytics["highestExpense"] = null;
  if (expenses.length > 0) {
    const highest = expenses.reduce((max, e) => (e.amount > max.amount ? e : max), expenses[0]);
    highestExpense = {
      description: highest.description,
      amount: highest.amount,
      date: highest.date || 0,
    };
  }

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const recentExpenses = expenses.filter((e) => (e.date || 0) >= thirtyDaysAgo);
  const recentActivityRate = expenseCount > 0 ? Math.round((recentExpenses.length / expenseCount) * 10000) / 100 : 0;

  return {
    groupId,
    groupName,
    totalExpenses,
    expenseCount,
    categoryBreakdown: computeCategoryBreakdown(expenses),
    monthlyTrends: computeMonthlyTrends(expenses),
    memberSpending: computeMemberSpending(expenses, members, currentUserId),
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
    for (const e of expenses) {
      allExpenses.push(e);
      totalSpent += e.amount;
      expenseCount += 1;
      if (e.paidBy === currentUserId) {
        totalPaid += e.amount;
      }
    }
    const groupTotal = expenses.reduce((s, e) => s + e.amount, 0);
    groupSpendingMap.set(g.groupId, {
      groupId: g.groupId,
      groupName: g.groupName,
      totalSpent: Math.round(groupTotal * 100) / 100,
      expenseCount: expenses.length,
    });
  }

  const totalOwed = groups.filter((g) => g.yourBalance > 0).reduce((s, g) => s + g.yourBalance, 0);
  const totalOwing = groups.filter((g) => g.yourBalance < 0).reduce((s, g) => s + Math.abs(g.yourBalance), 0);

  const topGroups = Array.from(groupSpendingMap.values())
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .slice(0, 5);

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    totalOwed: Math.round(totalOwed * 100) / 100,
    totalOwing: Math.round(totalOwing * 100) / 100,
    netBalance: Math.round((totalOwed - totalOwing) * 100) / 100,
    groupCount: groups.filter((g) => !g.archived).length,
    expenseCount,
    categoryBreakdown: computeCategoryBreakdown(allExpenses),
    monthlyTrends: computeMonthlyTrends(allExpenses),
    topGroups,
  };
}
