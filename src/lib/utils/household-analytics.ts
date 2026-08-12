// ─── Household Analytics (pure functions) ────────────────────────
// Mirrors the Android HouseholdAnalytics.kt implementation.

import type {
  Expense,
  Member,
  TransactionType,
  CategoryBreakdown,
  DailySummary,
  DailyTrend,
  HouseholdGamification,
  MemberContribution,
  MonthComparison,
  MonthlyReport,
} from "../types";
import { getCategoryLabel } from "./household-categories";
import { formatCurrencySymbol, getLocaleForCurrency } from "./currency";
import { BASE_CURRENCY } from "../constants/currency";
import { MONTH_LABELS, FULL_MONTH_LABELS, isSameDay, isSameMonth, startOfDay } from "./date";
import { round2 } from "./math";

function formatDateLabel(timestamp: number): string {
  const cal = new Date(timestamp);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const day = cal.getDate();
  const month = MONTH_LABELS[cal.getMonth()];

  if (isSameDay(timestamp, now.getTime())) {
    return `Today, ${day} ${month}`;
  }
  if (isSameDay(timestamp, yesterday.getTime())) {
    return `Yesterday, ${day} ${month}`;
  }

  const weekday = cal.toLocaleDateString(getLocaleForCurrency(BASE_CURRENCY), { weekday: "short" });
  return `${weekday}, ${day} ${month}`;
}

function getTransactionType(expense: Expense): TransactionType {
  return expense.transactionType ?? "expense";
}

// ─── Daily Summary ───────────────────────────────────────────────

export function computeDailySummary(
  allExpenses: Expense[],
  date: number = Date.now()
): DailySummary {
  const dayExpenses = allExpenses
    .filter((e) => isSameDay(e.date ?? 0, date))
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0));

  const totalSpent = dayExpenses
    .filter((e) => getTransactionType(e) === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  const totalReceived = dayExpenses
    .filter((e) => getTransactionType(e) === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  return {
    date,
    dateLabel: formatDateLabel(date),
    totalSpent: round2(totalSpent),
    totalReceived: round2(totalReceived),
    netAmount: round2(totalReceived - totalSpent),
    entryCount: dayExpenses.length,
    entries: dayExpenses,
  };
}

// ─── Monthly Report ──────────────────────────────────────────────

export function computeMonthlyReport(
  allExpenses: Expense[],
  members: Member[],
  year: number,
  month: number,
  monthlyBudget?: number
): MonthlyReport {
  const monthExpenses = allExpenses.filter((e) => isSameMonth(e.date ?? 0, year, month));

  const expenseEntries = monthExpenses.filter((e) => getTransactionType(e) === "expense");
  const incomeEntries = monthExpenses.filter((e) => getTransactionType(e) === "income");

  const totalSpent = expenseEntries.reduce((sum, e) => sum + e.amount, 0);
  const totalReceived = incomeEntries.reduce((sum, e) => sum + e.amount, 0);

  const spentByCategory = computeHouseholdCategoryBreakdown(expenseEntries);
  const receivedByCategory = computeHouseholdCategoryBreakdown(incomeEntries);
  const memberContributions = computeMemberContributions(monthExpenses, members);
  const dailyTrend = computeDailyTrend(allExpenses, year, month);

  const budgetProgress =
    monthlyBudget != null && monthlyBudget > 0
      ? round2((totalSpent / monthlyBudget) * 100)
      : 0;

  const budgetRemaining =
    monthlyBudget != null ? round2(monthlyBudget - totalSpent) : 0;

  const comparison = computeMonthComparison(allExpenses, year, month) ?? undefined;

  const monthLabel = `${FULL_MONTH_LABELS[month]} ${year}`;

  return {
    month: `${String(year).padStart(4, "0")}-${String(month + 1).padStart(2, "0")}`,
    monthLabel,
    totalSpent: round2(totalSpent),
    totalReceived: round2(totalReceived),
    netAmount: round2(totalReceived - totalSpent),
    entryCount: monthExpenses.length,
    spentByCategory,
    receivedByCategory,
    memberContributions,
    dailyTrend,
    budget: monthlyBudget,
    budgetProgress,
    budgetRemaining,
    comparisonWithLastMonth: comparison,
  };
}

// ─── Category Breakdown for Household ────────────────────────────

export function computeHouseholdCategoryBreakdown(expenses: Expense[]): CategoryBreakdown[] {
  if (expenses.length === 0) return [];
  const map = new Map<string, { total: number; count: number }>();
  for (const e of expenses) {
    const cat = e.category && e.category.length > 0 ? e.category : "other";
    const existing = map.get(cat) ?? { total: 0, count: 0 };
    map.set(cat, { total: existing.total + e.amount, count: existing.count + 1 });
  }
  const grandTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
  return Array.from(map.entries())
    .map(([category, { total, count }]) => ({
      category,
      totalAmount: round2(total),
      expenseCount: count,
      percentage: grandTotal > 0 ? round2((total / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

// ─── Member Contributions ────────────────────────────────────────

export function computeMemberContributions(
  expenses: Expense[],
  members: Member[]
): MemberContribution[] {
  const map = new Map<string, MemberContribution>();
  const activeMembers = members.filter((m) => m.status === "active");

  for (const m of activeMembers) {
    map.set(m.uid, {
      uid: m.uid,
      displayName: m.displayName,
      photoURL: m.photoURL,
      totalSpent: 0,
      totalReceived: 0,
      entryCount: 0,
      spentPercentage: 0,
      rank: 0,
    });
  }

  const totalSpentAll = expenses
    .filter((e) => getTransactionType(e) === "expense")
    .reduce((sum, e) => sum + e.amount, 0);

  for (const e of expenses) {
    const member = map.get(e.paidBy);
    if (!member) continue;
    const type = getTransactionType(e);
    if (type === "expense") {
      map.set(e.paidBy, {
        ...member,
        totalSpent: member.totalSpent + e.amount,
        entryCount: member.entryCount + 1,
      });
    } else {
      map.set(e.paidBy, {
        ...member,
        totalReceived: member.totalReceived + e.amount,
        entryCount: member.entryCount + 1,
      });
    }
  }

  return Array.from(map.values())
    .map((m) => ({
      ...m,
      totalSpent: round2(m.totalSpent),
      totalReceived: round2(m.totalReceived),
      spentPercentage: totalSpentAll > 0 ? round2((m.totalSpent / totalSpentAll) * 100) : 0,
    }))
    .sort((a, b) => b.totalSpent - a.totalSpent)
    .map((m, index) => ({ ...m, rank: index + 1 }));
}

// ─── Daily Trend (for monthly bar chart) ─────────────────────────

export function computeDailyTrend(
  allExpenses: Expense[],
  year: number,
  month: number
): DailyTrend[] {
  const cal = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const trends: DailyTrend[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    const dayCal = new Date(year, month, day, 0, 0, 0, 0);
    trends.push({
      day,
      date: dayCal.getTime(),
      totalSpent: 0,
      totalReceived: 0,
    });
  }

  const trendMap = new Map<number, DailyTrend>(trends.map((t) => [t.day, t]));

  for (const e of allExpenses) {
    if (!isSameMonth(e.date ?? 0, year, month)) continue;
    const expCal = new Date(e.date ?? 0);
    const day = expCal.getDate();
    const trend = trendMap.get(day);
    if (!trend) continue;

    const type = getTransactionType(e);
    if (type === "expense") {
      trendMap.set(day, { ...trend, totalSpent: trend.totalSpent + e.amount });
    } else {
      trendMap.set(day, { ...trend, totalReceived: trend.totalReceived + e.amount });
    }
  }

  return trends.map((t) => {
    const updated = trendMap.get(t.day) ?? t;
    return {
      ...updated,
      totalSpent: round2(updated.totalSpent),
      totalReceived: round2(updated.totalReceived),
    };
  });
}

// ─── Month Comparison ────────────────────────────────────────────

export function computeMonthComparison(
  allExpenses: Expense[],
  year: number,
  month: number
): MonthComparison | null {
  const currentMonthExpenses = allExpenses.filter((e) => isSameMonth(e.date ?? 0, year, month));
  const currentSpent = currentMonthExpenses
    .filter((e) => getTransactionType(e) === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  const currentReceived = currentMonthExpenses
    .filter((e) => getTransactionType(e) === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  const lastMonthCal = new Date(year, month, 1);
  lastMonthCal.setMonth(lastMonthCal.getMonth() - 1);
  const lastYear = lastMonthCal.getFullYear();
  const lastMonth = lastMonthCal.getMonth();

  const lastMonthExpenses = allExpenses.filter((e) => isSameMonth(e.date ?? 0, lastYear, lastMonth));
  const lastSpent = lastMonthExpenses
    .filter((e) => getTransactionType(e) === "expense")
    .reduce((sum, e) => sum + e.amount, 0);
  const lastReceived = lastMonthExpenses
    .filter((e) => getTransactionType(e) === "income")
    .reduce((sum, e) => sum + e.amount, 0);

  if (lastSpent === 0 && lastReceived === 0) return null;

  const spentChange = currentSpent - lastSpent;
  const spentChangePercent = lastSpent > 0 ? round2((spentChange / lastSpent) * 100) : 0;
  const receivedChange = currentReceived - lastReceived;

  return {
    lastMonthSpent: round2(lastSpent),
    spentChange: round2(spentChange),
    spentChangePercent,
    lastMonthReceived: round2(lastReceived),
    receivedChange: round2(receivedChange),
  };
}

// ─── Gamification ────────────────────────────────────────────────

export function computeGamification(
  allExpenses: Expense[],
  members: Member[],
  monthlyBudget?: number,
  monthlySpent: number = 0,
  currency: string = BASE_CURRENCY
): HouseholdGamification {
  const activeMembers = members.filter((m) => m.status === "active");
  const totalMembers = activeMembers.length;
  const safeTotalMembers = Math.max(totalMembers, 1);

  // Streak: consecutive days (ending today or yesterday) with >=1 entry
  const streak = computeLoggingStreak(allExpenses);

  // Participation today: how many members logged today
  const today = Date.now();
  const todayExpenses = allExpenses.filter((e) => isSameDay(e.date ?? 0, today));
  const membersLoggedToday = new Set(todayExpenses.map((e) => e.paidBy)).size;
  const participationToday =
    totalMembers > 0 ? round2((membersLoggedToday / safeTotalMembers) * 100) : 0;

  // Monthly badge
  const monthlyBadge = computeMonthlyBadge(
    streak.count,
    monthlyBudget,
    monthlySpent,
    totalMembers,
    membersLoggedToday
  );

  // Insight message
  const insightMessage = computeInsightMessage(allExpenses, monthlyBudget, monthlySpent, currency);

  return {
    loggingStreak: streak.count,
    streakStartDate: streak.startDate ?? undefined,
    monthlyBadge: monthlyBadge ?? undefined,
    participationToday,
    membersLoggedToday,
    totalMembers,
    insightMessage: insightMessage ?? undefined,
  };
}

interface StreakResult {
  count: number;
  startDate: number | null;
}

function computeLoggingStreak(allExpenses: Expense[]): StreakResult {
  if (allExpenses.length === 0) return { count: 0, startDate: null };

  // Get unique dates with entries (as day timestamps)
  const entryDates = allExpenses
    .filter((e) => (e.date ?? 0) > 0)
    .map((e) => startOfDay(new Date(e.date ?? 0)).getTime())
    .filter((value, index, self) => self.indexOf(value) === index)
    .sort((a, b) => b - a);

  if (entryDates.length === 0) return { count: 0, startDate: null };

  // Check if the most recent entry is today or yesterday
  const today = startOfDay(new Date()).getTime();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterday = today - oneDayMs;

  if (entryDates[0] !== today && entryDates[0] !== yesterday) {
    return { count: 0, startDate: null };
  }

  // Count consecutive days
  let streak = 0;
  let streakStart: number | null = null;
  let checkDate = entryDates[0];

  for (const entryDate of entryDates) {
    if (entryDate === checkDate) {
      streak++;
      streakStart = entryDate;
      checkDate -= oneDayMs;
    } else if (entryDate < checkDate) {
      break;
    }
  }

  return { count: streak, startDate: streakStart };
}

function computeMonthlyBadge(
  streak: number,
  monthlyBudget: number | undefined,
  monthlySpent: number,
  totalMembers: number,
  membersLoggedToday: number
): string | null {
  const badges: string[] = [];

  if (streak >= 30) badges.push("streak_champion");
  if (monthlyBudget != null && monthlyBudget > 0 && monthlySpent <= monthlyBudget) {
    badges.push("budget_master");
  }
  if (totalMembers > 0 && membersLoggedToday === totalMembers) {
    badges.push("all_stars");
  }

  return badges.length > 0 ? badges[0] : null;
}

function computeInsightMessage(
  allExpenses: Expense[],
  monthlyBudget: number | undefined,
  monthlySpent: number,
  currency: string = BASE_CURRENCY
): string | null {
  // Budget insight
  if (monthlyBudget != null && monthlyBudget > 0) {
    const progress = (monthlySpent / monthlyBudget) * 100;
    if (progress >= 100) {
      return `You've exceeded your monthly budget by ${formatCurrencySymbol(round2(monthlySpent - monthlyBudget), currency)}`;
    }
    if (progress >= 80) {
      return `You've used ${round2(progress)}% of your budget. ${formatCurrencySymbol(round2(monthlyBudget - monthlySpent), currency)} left.`;
    }
  }

  // Category insight
  const now = new Date();
  const monthExpenses = allExpenses.filter(
    (e) =>
      isSameMonth(e.date ?? 0, now.getFullYear(), now.getMonth()) &&
      getTransactionType(e) === "expense"
  );
  if (monthExpenses.length > 0) {
    const breakdown = computeHouseholdCategoryBreakdown(monthExpenses);
    const topCategory = breakdown[0];
    if (topCategory && topCategory.percentage >= 40) {
      const label = getCategoryLabel(topCategory.category);
      return `${label} is ${round2(topCategory.percentage)}% of your spending this month`;
    }
  }

  return null;
}

// ─── Category Usage Count (for smart ordering) ───────────────────

export function computeCategoryUsageCount(expenses: Expense[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const e of expenses) {
    const cat = e.category && e.category.length > 0 ? e.category : "other";
    map[cat] = (map[cat] ?? 0) + 1;
  }
  return map;
}

// ─── Description Autocomplete ────────────────────────────────────

export function suggestDescriptions(
  expenses: Expense[],
  prefix: string,
  limit: number = 5
): string[] {
  if (!prefix || prefix.trim().length === 0) return [];
  const lower = prefix.trim().toLowerCase();
  return expenses
    .map((e) => e.description)
    .filter((d) => d && d.trim().length > 0 && d.toLowerCase().startsWith(lower))
    .filter((value, index, self) => self.indexOf(value) === index)
    .slice(0, limit);
}
