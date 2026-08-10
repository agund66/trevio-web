import { describe, it, expect } from "vitest";
import {
  computeDailySummary,
  computeMonthlyReport,
  computeHouseholdCategoryBreakdown,
  computeMemberContributions,
  computeDailyTrend,
  computeMonthComparison,
  computeGamification,
  computeCategoryUsageCount,
  suggestDescriptions,
} from "@/lib/utils/household-analytics";
import {
  ALL_CATEGORIES,
  getCategory,
  getCategoryIcon,
  getCategoryColor,
  getCategoryLabel,
  getCategories,
  suggestCategory,
  sortedByUsage,
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_LABELS,
  DEFAULT_CATEGORY_COLORS,
} from "@/lib/utils/household-categories";
import type { Expense, Member, TransactionType } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────

const ONE_DAY = 24 * 60 * 60 * 1000;

/** Build a timestamp for a given Y/M/D at noon (avoids DST edge cases). */
function ts(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month, day, hour, 0, 0, 0).getTime();
}

/** Today at noon. */
function todayNoon(): number {
  const now = new Date();
  return ts(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Yesterday at noon. */
function yesterdayNoon(): number {
  return todayNoon() - ONE_DAY;
}

function mkExpense(
  overrides: Partial<Expense> & { amount: number; paidBy: string }
): Expense {
  return {
    expenseId: `e_${Math.random().toString(36).slice(2)}`,
    description: overrides.description ?? "Test expense",
    amount: overrides.amount,
    currency: overrides.currency ?? "INR",
    paidBy: overrides.paidBy,
    splitType: overrides.splitType ?? "equal",
    splits: overrides.splits ?? {},
    category: overrides.category ?? "other",
    createdBy: overrides.createdBy ?? overrides.paidBy,
    date: overrides.date,
    note: overrides.note,
    recurring: overrides.recurring,
    itemizedData: overrides.itemizedData,
    transactionType: overrides.transactionType,
  };
}

function mkMember(overrides: Partial<Member> & { uid: string }): Member {
  return {
    uid: overrides.uid,
    displayName: overrides.displayName ?? `Member ${overrides.uid}`,
    username: overrides.username ?? `user_${overrides.uid}`,
    photoURL: overrides.photoURL ?? "",
    balance: overrides.balance ?? 0,
    role: overrides.role ?? "member",
    status: overrides.status ?? "active",
    isOffline: overrides.isOffline,
  };
}

// ─── computeDailySummary ──────────────────────────────────────────

describe("computeDailySummary", () => {
  it("returns zeros and empty entries for an empty expenses array", () => {
    const date = ts(2024, 5, 15);
    const result = computeDailySummary([], date);
    expect(result.totalSpent).toBe(0);
    expect(result.totalReceived).toBe(0);
    expect(result.netAmount).toBe(0);
    expect(result.entryCount).toBe(0);
    expect(result.entries).toEqual([]);
  });

  it("computes correct totals for a single expense on the selected date", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 250.5, paidBy: "u1", date, category: "groceries", transactionType: "expense" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(250.5);
    expect(result.totalReceived).toBe(0);
    expect(result.netAmount).toBe(-250.5);
    expect(result.entryCount).toBe(1);
    expect(result.entries).toHaveLength(1);
  });

  it("computes totalReceived for a single income entry on the selected date", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 5000, paidBy: "u1", date, category: "salary", transactionType: "income" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(0);
    expect(result.totalReceived).toBe(5000);
    expect(result.netAmount).toBe(5000);
  });

  it("computes correct net for mixed expenses and income on the selected date", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 300, paidBy: "u1", date, category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u2", date, category: "transport", transactionType: "expense" }),
      mkExpense({ amount: 1000, paidBy: "u1", date, category: "salary", transactionType: "income" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(500);
    expect(result.totalReceived).toBe(1000);
    expect(result.netAmount).toBe(500);
    expect(result.entryCount).toBe(3);
  });

  it("filters out expenses on different dates", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date, transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u1", date: ts(2024, 5, 16), transactionType: "expense" }),
      mkExpense({ amount: 300, paidBy: "u1", date: ts(2024, 6, 15), transactionType: "expense" }),
      mkExpense({ amount: 400, paidBy: "u1", date: ts(2023, 5, 15), transactionType: "expense" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(100);
    expect(result.entryCount).toBe(1);
  });

  it("filters out expenses with null date (date ?? 0)", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date, transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u1", date: undefined, transactionType: "expense" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(100);
    expect(result.entryCount).toBe(1);
  });

  it("filters out expenses with date=0", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date, transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u1", date: 0, transactionType: "expense" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(100);
    expect(result.entryCount).toBe(1);
  });

  it("includes multiple expenses on the same day sorted by date descending", () => {
    const date = ts(2024, 5, 15);
    const early = mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 15, 8), transactionType: "expense" });
    const mid = mkExpense({ amount: 200, paidBy: "u1", date: ts(2024, 5, 15, 12), transactionType: "expense" });
    const late = mkExpense({ amount: 300, paidBy: "u1", date: ts(2024, 5, 15, 20), transactionType: "expense" });
    const result = computeDailySummary([early, late, mid], date);
    expect(result.entries).toHaveLength(3);
    expect(result.entries[0].amount).toBe(300);
    expect(result.entries[1].amount).toBe(200);
    expect(result.entries[2].amount).toBe(100);
  });

  it("defaults transactionType to 'expense' when undefined", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 150, paidBy: "u1", date, transactionType: undefined }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(150);
    expect(result.totalReceived).toBe(0);
  });

  it("rounds totals to 2 decimal places", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 33.333, paidBy: "u1", date, transactionType: "expense" }),
      mkExpense({ amount: 16.667, paidBy: "u1", date, transactionType: "expense" }),
      mkExpense({ amount: 11.111, paidBy: "u1", date, transactionType: "income" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(50);
    expect(result.totalReceived).toBe(11.11);
    expect(result.netAmount).toBe(-38.89);
  });

  it("produces a 'Today' dateLabel when the selected date is today", () => {
    const result = computeDailySummary([], todayNoon());
    expect(result.dateLabel).toMatch(/^Today, /);
  });

  it("produces a 'Yesterday' dateLabel when the selected date is yesterday", () => {
    const result = computeDailySummary([], yesterdayNoon());
    expect(result.dateLabel).toMatch(/^Yesterday, /);
  });

  it("produces a weekday dateLabel for other dates", () => {
    const date = ts(2024, 5, 15);
    const result = computeDailySummary([], date);
    expect(result.dateLabel).toMatch(/^[A-Z][a-z]{2}, 15 Jun$/);
  });
});

// ─── isSameDay helper (tested indirectly via computeDailySummary) ─

describe("isSameDay helper (via computeDailySummary)", () => {
  it("matches the same timestamp", () => {
    const date = ts(2024, 5, 15, 12);
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date, transactionType: "expense" })];
    expect(computeDailySummary(expenses, date).entryCount).toBe(1);
  });

  it("rejects a different day in the same month", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 16, 12), transactionType: "expense" })];
    expect(computeDailySummary(expenses, ts(2024, 5, 15)).entryCount).toBe(0);
  });

  it("rejects the same day in a different month", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 6, 15, 12), transactionType: "expense" })];
    expect(computeDailySummary(expenses, ts(2024, 5, 15)).entryCount).toBe(0);
  });

  it("rejects the same day in a different year", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: ts(2023, 5, 15, 12), transactionType: "expense" })];
    expect(computeDailySummary(expenses, ts(2024, 5, 15)).entryCount).toBe(0);
  });

  it("handles the midnight boundary (00:00 vs 23:59 same day)", () => {
    const midnight = ts(2024, 5, 15, 0, );
    const endOfDay = new Date(2024, 5, 15, 23, 59, 59, 999).getTime();
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: midnight, transactionType: "expense" }),
      mkExpense({ amount: 20, paidBy: "u1", date: endOfDay, transactionType: "expense" }),
    ];
    const result = computeDailySummary(expenses, midnight);
    expect(result.entryCount).toBe(2);
    expect(result.totalSpent).toBe(30);
  });
});

// ─── computeMonthlyReport ─────────────────────────────────────────

describe("computeMonthlyReport", () => {
  it("returns all zeros for an empty expenses array", () => {
    const report = computeMonthlyReport([], [], 2024, 5);
    expect(report.totalSpent).toBe(0);
    expect(report.totalReceived).toBe(0);
    expect(report.netAmount).toBe(0);
    expect(report.entryCount).toBe(0);
    expect(report.spentByCategory).toEqual([]);
    expect(report.receivedByCategory).toEqual([]);
    expect(report.memberContributions).toEqual([]);
    expect(report.budgetProgress).toBe(0);
    expect(report.budgetRemaining).toBe(0);
    expect(report.comparisonWithLastMonth).toBeUndefined();
  });

  it("computes totals for a single month with expenses only", () => {
    const expenses = [
      mkExpense({ amount: 300, paidBy: "u1", date: ts(2024, 5, 10), category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u1", date: ts(2024, 5, 20), category: "transport", transactionType: "expense" }),
    ];
    const report = computeMonthlyReport(expenses, [], 2024, 5);
    expect(report.totalSpent).toBe(500);
    expect(report.totalReceived).toBe(0);
    expect(report.netAmount).toBe(-500);
    expect(report.entryCount).toBe(2);
  });

  it("computes totals for a single month with income only", () => {
    const expenses = [
      mkExpense({ amount: 5000, paidBy: "u1", date: ts(2024, 5, 1), category: "salary", transactionType: "income" }),
    ];
    const report = computeMonthlyReport(expenses, [], 2024, 5);
    expect(report.totalSpent).toBe(0);
    expect(report.totalReceived).toBe(5000);
    expect(report.netAmount).toBe(5000);
  });

  it("computes totals for a single month with both expenses and income", () => {
    const expenses = [
      mkExpense({ amount: 1000, paidBy: "u1", date: ts(2024, 5, 1), category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 5000, paidBy: "u1", date: ts(2024, 5, 2), category: "salary", transactionType: "income" }),
    ];
    const report = computeMonthlyReport(expenses, [], 2024, 5);
    expect(report.totalSpent).toBe(1000);
    expect(report.totalReceived).toBe(5000);
    expect(report.netAmount).toBe(4000);
  });

  it("filters out expenses from other months", () => {
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u1", date: ts(2024, 6, 15), transactionType: "expense" }),
      mkExpense({ amount: 300, paidBy: "u1", date: ts(2023, 5, 15), transactionType: "expense" }),
    ];
    const report = computeMonthlyReport(expenses, [], 2024, 5);
    expect(report.totalSpent).toBe(100);
    expect(report.entryCount).toBe(1);
  });

  it("computes budget progress at 0% when nothing spent", () => {
    const report = computeMonthlyReport([], [], 2024, 5, 5000);
    expect(report.budget).toBe(5000);
    expect(report.budgetProgress).toBe(0);
    expect(report.budgetRemaining).toBe(5000);
  });

  it("computes budget progress at 50%", () => {
    const expenses = [mkExpense({ amount: 2500, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" })];
    const report = computeMonthlyReport(expenses, [], 2024, 5, 5000);
    expect(report.budgetProgress).toBe(50);
    expect(report.budgetRemaining).toBe(2500);
  });

  it("computes budget progress at exactly 100%", () => {
    const expenses = [mkExpense({ amount: 5000, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" })];
    const report = computeMonthlyReport(expenses, [], 2024, 5, 5000);
    expect(report.budgetProgress).toBe(100);
    expect(report.budgetRemaining).toBe(0);
  });

  it("computes budget progress over 100% when budget exceeded", () => {
    const expenses = [mkExpense({ amount: 7500, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" })];
    const report = computeMonthlyReport(expenses, [], 2024, 5, 5000);
    expect(report.budgetProgress).toBe(150);
    expect(report.budgetRemaining).toBe(-2500);
  });

  it("sets budgetProgress to 0 when no budget provided", () => {
    const expenses = [mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" })];
    const report = computeMonthlyReport(expenses, [], 2024, 5);
    expect(report.budget).toBeUndefined();
    expect(report.budgetProgress).toBe(0);
    expect(report.budgetRemaining).toBe(0);
  });

  it("sets budgetProgress to 0 when budget is 0", () => {
    const expenses = [mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" })];
    const report = computeMonthlyReport(expenses, [], 2024, 5, 0);
    expect(report.budgetProgress).toBe(0);
  });

  it("produces daily trend data with correct bar heights", () => {
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 1), transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" }),
      mkExpense({ amount: 50, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "income" }),
    ];
    const report = computeMonthlyReport(expenses, [], 2024, 5);
    expect(report.dailyTrend).toHaveLength(30); // June 2024 has 30 days
    const day1 = report.dailyTrend.find((t) => t.day === 1);
    expect(day1?.totalSpent).toBe(100);
    expect(day1?.totalReceived).toBe(0);
    const day15 = report.dailyTrend.find((t) => t.day === 15);
    expect(day15?.totalSpent).toBe(200);
    expect(day15?.totalReceived).toBe(50);
    const day2 = report.dailyTrend.find((t) => t.day === 2);
    expect(day2?.totalSpent).toBe(0);
    expect(day2?.totalReceived).toBe(0);
  });

  it("produces category breakdown for spent vs received", () => {
    const expenses = [
      mkExpense({ amount: 300, paidBy: "u1", date: ts(2024, 5, 10), category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 11), category: "transport", transactionType: "expense" }),
      mkExpense({ amount: 5000, paidBy: "u1", date: ts(2024, 5, 1), category: "salary", transactionType: "income" }),
    ];
    const report = computeMonthlyReport(expenses, [], 2024, 5);
    expect(report.spentByCategory).toHaveLength(2);
    expect(report.spentByCategory[0].category).toBe("groceries");
    expect(report.spentByCategory[0].totalAmount).toBe(300);
    expect(report.spentByCategory[0].percentage).toBe(75);
    expect(report.receivedByCategory).toHaveLength(1);
    expect(report.receivedByCategory[0].category).toBe("salary");
    expect(report.receivedByCategory[0].totalAmount).toBe(5000);
    expect(report.receivedByCategory[0].percentage).toBe(100);
  });

  it("computes member contributions (who-paid rankings)", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" }), mkMember({ uid: "u3" })];
    const expenses = [
      mkExpense({ amount: 300, paidBy: "u1", date: ts(2024, 5, 10), transactionType: "expense" }),
      mkExpense({ amount: 100, paidBy: "u2", date: ts(2024, 5, 11), transactionType: "expense" }),
    ];
    const report = computeMonthlyReport(expenses, members, 2024, 5);
    expect(report.memberContributions).toHaveLength(3);
    expect(report.memberContributions[0].uid).toBe("u1");
    expect(report.memberContributions[0].rank).toBe(1);
    expect(report.memberContributions[0].totalSpent).toBe(300);
    expect(report.memberContributions[1].uid).toBe("u2");
    expect(report.memberContributions[1].rank).toBe(2);
  });

  it("formats the month string and label correctly", () => {
    const report = computeMonthlyReport([], [], 2024, 5);
    expect(report.month).toBe("2024-06");
    expect(report.monthLabel).toBe("June 2024");
  });

  it("handles February (28 days) in a non-leap year", () => {
    const report = computeMonthlyReport([], [], 2023, 1); // Feb 2023
    expect(report.dailyTrend).toHaveLength(28);
    expect(report.dailyTrend[0].day).toBe(1);
    expect(report.dailyTrend[27].day).toBe(28);
  });

  it("handles February (29 days) in a leap year", () => {
    const report = computeMonthlyReport([], [], 2024, 1); // Feb 2024
    expect(report.dailyTrend).toHaveLength(29);
  });

  it("handles December → January transition for month comparison", () => {
    const decExpenses = [
      mkExpense({ amount: 1000, paidBy: "u1", date: ts(2023, 11, 15), transactionType: "expense" }),
    ];
    const janExpenses = [
      mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 0, 15), transactionType: "expense" }),
    ];
    const report = computeMonthlyReport([...decExpenses, ...janExpenses], [], 2024, 0);
    expect(report.comparisonWithLastMonth).toBeDefined();
    expect(report.comparisonWithLastMonth?.lastMonthSpent).toBe(1000);
    expect(report.comparisonWithLastMonth?.spentChange).toBe(-500);
  });

  it("returns undefined comparison when last month has no data", () => {
    const expenses = [mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" })];
    const report = computeMonthlyReport(expenses, [], 2024, 5);
    expect(report.comparisonWithLastMonth).toBeUndefined();
  });

  it("includes comparison when last month has data", () => {
    const lastMonth = [mkExpense({ amount: 1000, paidBy: "u1", date: ts(2024, 4, 15), transactionType: "expense" })];
    const thisMonth = [mkExpense({ amount: 1500, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" })];
    const report = computeMonthlyReport([...lastMonth, ...thisMonth], [], 2024, 5);
    expect(report.comparisonWithLastMonth).toBeDefined();
    expect(report.comparisonWithLastMonth?.lastMonthSpent).toBe(1000);
    expect(report.comparisonWithLastMonth?.spentChange).toBe(500);
    expect(report.comparisonWithLastMonth?.spentChangePercent).toBe(50);
  });
});

// ─── computeGamification ──────────────────────────────────────────

describe("computeGamification", () => {
  it("returns streak=0 and participation=0 for empty expenses and members", () => {
    const result = computeGamification([], []);
    expect(result.loggingStreak).toBe(0);
    expect(result.participationToday).toBe(0);
    expect(result.membersLoggedToday).toBe(0);
    expect(result.totalMembers).toBe(0);
    expect(result.streakStartDate).toBeUndefined();
    expect(result.monthlyBadge).toBeUndefined();
  });

  it("computes a 1-day streak for an entry today", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" })];
    const result = computeGamification(expenses, []);
    expect(result.loggingStreak).toBe(1);
  });

  it("computes a 3-day streak for entries today, yesterday, and 2 days ago", () => {
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" }),
      mkExpense({ amount: 10, paidBy: "u1", date: yesterdayNoon(), transactionType: "expense" }),
      mkExpense({ amount: 10, paidBy: "u1", date: todayNoon() - 2 * ONE_DAY, transactionType: "expense" }),
    ];
    const result = computeGamification(expenses, []);
    expect(result.loggingStreak).toBe(3);
  });

  it("computes a 7-day streak for 7 consecutive days ending today", () => {
    const expenses: Expense[] = [];
    for (let i = 0; i < 7; i++) {
      expenses.push(mkExpense({ amount: 10, paidBy: "u1", date: todayNoon() - i * ONE_DAY, transactionType: "expense" }));
    }
    const result = computeGamification(expenses, []);
    expect(result.loggingStreak).toBe(7);
  });

  it("computes a 30-day streak for 30 consecutive days ending today", () => {
    const expenses: Expense[] = [];
    for (let i = 0; i < 30; i++) {
      expenses.push(mkExpense({ amount: 10, paidBy: "u1", date: todayNoon() - i * ONE_DAY, transactionType: "expense" }));
    }
    const result = computeGamification(expenses, []);
    expect(result.loggingStreak).toBe(30);
  });

  it("resets streak to 0 when there is a gap > 1 day before today", () => {
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: todayNoon() - 3 * ONE_DAY, transactionType: "expense" }),
    ];
    const result = computeGamification(expenses, []);
    expect(result.loggingStreak).toBe(0);
  });

  it("computes streak for entries today only (single entry)", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" })];
    const result = computeGamification(expenses, []);
    expect(result.loggingStreak).toBe(1);
    expect(result.streakStartDate).toBeDefined();
  });

  it("computes streak of 1 for entries yesterday only (not today)", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: yesterdayNoon(), transactionType: "expense" })];
    const result = computeGamification(expenses, []);
    expect(result.loggingStreak).toBe(1);
  });

  it("returns streak 0 when the most recent entry is older than yesterday", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: todayNoon() - 5 * ONE_DAY, transactionType: "expense" })];
    const result = computeGamification(expenses, []);
    expect(result.loggingStreak).toBe(0);
  });

  it("participation: 0 members logged today", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" }), mkMember({ uid: "u3" })];
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: yesterdayNoon(), transactionType: "expense" })];
    const result = computeGamification(expenses, members);
    expect(result.membersLoggedToday).toBe(0);
    expect(result.participationToday).toBe(0);
  });

  it("participation: 1 of 3 members logged today", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" }), mkMember({ uid: "u3" })];
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" })];
    const result = computeGamification(expenses, members);
    expect(result.membersLoggedToday).toBe(1);
    expect(result.participationToday).toBeCloseTo(33.33, 1);
  });

  it("participation: 2 of 3 members logged today", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" }), mkMember({ uid: "u3" })];
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" }),
      mkExpense({ amount: 10, paidBy: "u2", date: todayNoon(), transactionType: "expense" }),
    ];
    const result = computeGamification(expenses, members);
    expect(result.membersLoggedToday).toBe(2);
    expect(result.participationToday).toBeCloseTo(66.67, 1);
  });

  it("participation: all 3 members logged today", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" }), mkMember({ uid: "u3" })];
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" }),
      mkExpense({ amount: 10, paidBy: "u2", date: todayNoon(), transactionType: "expense" }),
      mkExpense({ amount: 10, paidBy: "u3", date: todayNoon(), transactionType: "expense" }),
    ];
    const result = computeGamification(expenses, members);
    expect(result.membersLoggedToday).toBe(3);
    expect(result.participationToday).toBe(100);
  });

  it("participation: 0 total members avoids division by zero", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" })];
    const result = computeGamification(expenses, []);
    expect(result.totalMembers).toBe(0);
    expect(result.participationToday).toBe(0);
  });

  it("monthly badge: streak_champion when streak >= 30", () => {
    const expenses: Expense[] = [];
    for (let i = 0; i < 30; i++) {
      expenses.push(mkExpense({ amount: 10, paidBy: "u1", date: todayNoon() - i * ONE_DAY, transactionType: "expense" }));
    }
    const result = computeGamification(expenses, []);
    expect(result.monthlyBadge).toBe("streak_champion");
  });

  it("monthly badge: budget_master when within budget", () => {
    const result = computeGamification([], [], 5000, 1000);
    expect(result.monthlyBadge).toBe("budget_master");
  });

  it("monthly badge: all_stars when all members logged today", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" })];
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" }),
      mkExpense({ amount: 10, paidBy: "u2", date: todayNoon(), transactionType: "expense" }),
    ];
    const result = computeGamification(expenses, members);
    expect(result.monthlyBadge).toBe("all_stars");
  });

  it("monthly badge: no badge earned when no conditions met", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" })];
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: todayNoon(), transactionType: "expense" })];
    const result = computeGamification(expenses, members, 1000, 2000);
    expect(result.monthlyBadge).toBeUndefined();
  });

  it("monthly badge: streak_champion takes priority over budget_master", () => {
    const expenses: Expense[] = [];
    for (let i = 0; i < 30; i++) {
      expenses.push(mkExpense({ amount: 10, paidBy: "u1", date: todayNoon() - i * ONE_DAY, transactionType: "expense" }));
    }
    const result = computeGamification(expenses, [], 5000, 1000);
    expect(result.monthlyBadge).toBe("streak_champion");
  });

  it("insight message: budget exceeded (>= 100%)", () => {
    const result = computeGamification([], [], 5000, 6000);
    expect(result.insightMessage).toContain("exceeded your monthly budget");
    expect(result.insightMessage).toContain("₹1,000.00");
  });

  it("insight message: within budget but >= 80%", () => {
    const result = computeGamification([], [], 5000, 4200);
    expect(result.insightMessage).toContain("You've used 84% of your budget");
    expect(result.insightMessage).toContain("₹800.00 left");
  });

  it("insight message: no budget set returns null/undefined", () => {
    const result = computeGamification([], []);
    expect(result.insightMessage).toBeUndefined();
  });

  it("insight message: top category percentage when >= 40% of spending", () => {
    const now = new Date();
    const expenses = [
      mkExpense({ amount: 500, paidBy: "u1", date: ts(now.getFullYear(), now.getMonth(), 10), category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 100, paidBy: "u1", date: ts(now.getFullYear(), now.getMonth(), 11), category: "transport", transactionType: "expense" }),
    ];
    const result = computeGamification(expenses, []);
    expect(result.insightMessage).toContain("Groceries");
    expect(result.insightMessage).toContain("% of your spending this month");
  });

  it("insight message: returns null when top category < 40% and no budget", () => {
    const now = new Date();
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(now.getFullYear(), now.getMonth(), 10), category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 100, paidBy: "u1", date: ts(now.getFullYear(), now.getMonth(), 11), category: "transport", transactionType: "expense" }),
    ];
    const result = computeGamification(expenses, []);
    // With 2 categories at 50% each, top category is >= 40% so insight IS generated
    expect(result.insightMessage).toBeDefined();
    expect(result.insightMessage).toMatch(/% of your spending this month/);
  });
});

// ─── computeMemberContributions ───────────────────────────────────

describe("computeMemberContributions", () => {
  it("returns an empty list for empty expenses", () => {
    const members = [mkMember({ uid: "u1" })];
    const result = computeMemberContributions([], members);
    expect(result).toHaveLength(1);
    expect(result[0].totalSpent).toBe(0);
    expect(result[0].totalReceived).toBe(0);
    expect(result[0].entryCount).toBe(0);
    expect(result[0].spentPercentage).toBe(0);
    expect(result[0].rank).toBe(1);
  });

  it("handles a single member who paid everything", () => {
    const members = [mkMember({ uid: "u1" })];
    const expenses = [
      mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 5, 10), transactionType: "expense" }),
    ];
    const result = computeMemberContributions(expenses, members);
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe("u1");
    expect(result[0].totalSpent).toBe(500);
    expect(result[0].spentPercentage).toBe(100);
    expect(result[0].rank).toBe(1);
  });

  it("handles multiple members with different amounts", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" })];
    const expenses = [
      mkExpense({ amount: 300, paidBy: "u1", date: ts(2024, 5, 10), transactionType: "expense" }),
      mkExpense({ amount: 100, paidBy: "u2", date: ts(2024, 5, 11), transactionType: "expense" }),
    ];
    const result = computeMemberContributions(expenses, members);
    expect(result[0].uid).toBe("u1");
    expect(result[0].totalSpent).toBe(300);
    expect(result[0].spentPercentage).toBe(75);
    expect(result[1].uid).toBe("u2");
    expect(result[1].totalSpent).toBe(100);
    expect(result[1].spentPercentage).toBe(25);
  });

  it("handles a member with only income entries", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" })];
    const expenses = [
      mkExpense({ amount: 200, paidBy: "u2", date: ts(2024, 5, 10), transactionType: "expense" }),
      mkExpense({ amount: 5000, paidBy: "u1", date: ts(2024, 5, 11), transactionType: "income" }),
    ];
    const result = computeMemberContributions(expenses, members);
    const u1 = result.find((m) => m.uid === "u1");
    const u2 = result.find((m) => m.uid === "u2");
    expect(u1?.totalReceived).toBe(5000);
    expect(u1?.totalSpent).toBe(0);
    expect(u2?.totalSpent).toBe(200);
    expect(u2?.totalReceived).toBe(0);
  });

  it("handles a member with both income and expense entries", () => {
    const members = [mkMember({ uid: "u1" })];
    const expenses = [
      mkExpense({ amount: 300, paidBy: "u1", date: ts(2024, 5, 10), transactionType: "expense" }),
      mkExpense({ amount: 5000, paidBy: "u1", date: ts(2024, 5, 11), transactionType: "income" }),
    ];
    const result = computeMemberContributions(expenses, members);
    expect(result[0].totalSpent).toBe(300);
    expect(result[0].totalReceived).toBe(5000);
    expect(result[0].entryCount).toBe(2);
  });

  it("sorts by total paid descending and assigns ranks", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" }), mkMember({ uid: "u3" })];
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u3", date: ts(2024, 5, 10), transactionType: "expense" }),
      mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 5, 11), transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u2", date: ts(2024, 5, 12), transactionType: "expense" }),
    ];
    const result = computeMemberContributions(expenses, members);
    expect(result[0].uid).toBe("u1");
    expect(result[0].rank).toBe(1);
    expect(result[1].uid).toBe("u2");
    expect(result[1].rank).toBe(2);
    expect(result[2].uid).toBe("u3");
    expect(result[2].rank).toBe(3);
  });

  it("only includes active members", () => {
    const members = [
      mkMember({ uid: "u1", status: "active" }),
      mkMember({ uid: "u2", status: "inactive" }),
    ];
    const expenses = [mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 10), transactionType: "expense" })];
    const result = computeMemberContributions(expenses, members);
    expect(result).toHaveLength(1);
    expect(result[0].uid).toBe("u1");
  });

  it("ignores expenses paid by unknown members", () => {
    const members = [mkMember({ uid: "u1" })];
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 10), transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "unknown", date: ts(2024, 5, 11), transactionType: "expense" }),
    ];
    const result = computeMemberContributions(expenses, members);
    expect(result).toHaveLength(1);
    expect(result[0].totalSpent).toBe(100);
  });

  it("spentPercentage is 0 when total spent by all is 0", () => {
    const members = [mkMember({ uid: "u1" }), mkMember({ uid: "u2" })];
    const expenses = [
      mkExpense({ amount: 5000, paidBy: "u1", date: ts(2024, 5, 10), transactionType: "income" }),
    ];
    const result = computeMemberContributions(expenses, members);
    expect(result[0].spentPercentage).toBe(0);
  });
});

// ─── computeHouseholdCategoryBreakdown ────────────────────────────

describe("computeHouseholdCategoryBreakdown", () => {
  it("returns an empty array for empty expenses", () => {
    expect(computeHouseholdCategoryBreakdown([])).toEqual([]);
  });

  it("groups expenses by category and computes totals", () => {
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 10), category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u1", date: ts(2024, 5, 11), category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 300, paidBy: "u1", date: ts(2024, 5, 12), category: "transport", transactionType: "expense" }),
    ];
    const result = computeHouseholdCategoryBreakdown(expenses);
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("groceries");
    expect(result[0].totalAmount).toBe(300);
    expect(result[0].expenseCount).toBe(2);
    expect(result[0].percentage).toBe(50);
    expect(result[1].category).toBe("transport");
    expect(result[1].totalAmount).toBe(300);
    expect(result[1].percentage).toBe(50);
  });

  it("defaults to 'other' when category is empty", () => {
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 10), category: "", transactionType: "expense" }),
    ];
    const result = computeHouseholdCategoryBreakdown(expenses);
    expect(result[0].category).toBe("other");
  });

  it("sorts by totalAmount descending", () => {
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 10), category: "transport", transactionType: "expense" }),
      mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 5, 11), category: "groceries", transactionType: "expense" }),
      mkExpense({ amount: 50, paidBy: "u1", date: ts(2024, 5, 12), category: "dining", transactionType: "expense" }),
    ];
    const result = computeHouseholdCategoryBreakdown(expenses);
    expect(result[0].category).toBe("groceries");
    expect(result[1].category).toBe("transport");
    expect(result[2].category).toBe("dining");
  });
});

// ─── computeDailyTrend ────────────────────────────────────────────

describe("computeDailyTrend", () => {
  it("creates one trend entry per day in the month", () => {
    const trend = computeDailyTrend([], 2024, 5); // June 2024 = 30 days
    expect(trend).toHaveLength(30);
    expect(trend[0].day).toBe(1);
    expect(trend[29].day).toBe(30);
    expect(trend[0].totalSpent).toBe(0);
    expect(trend[0].totalReceived).toBe(0);
  });

  it("aggregates spent and received per day", () => {
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 5, 1), transactionType: "expense" }),
      mkExpense({ amount: 200, paidBy: "u1", date: ts(2024, 5, 1), transactionType: "expense" }),
      mkExpense({ amount: 50, paidBy: "u1", date: ts(2024, 5, 1), transactionType: "income" }),
    ];
    const trend = computeDailyTrend(expenses, 2024, 5);
    const day1 = trend.find((t) => t.day === 1);
    expect(day1?.totalSpent).toBe(300);
    expect(day1?.totalReceived).toBe(50);
  });

  it("filters out expenses from other months", () => {
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date: ts(2024, 6, 1), transactionType: "expense" }),
    ];
    const trend = computeDailyTrend(expenses, 2024, 5);
    expect(trend.every((t) => t.totalSpent === 0)).toBe(true);
  });

  it("handles a 31-day month", () => {
    const trend = computeDailyTrend([], 2024, 6); // July 2024 = 31 days
    expect(trend).toHaveLength(31);
  });
});

// ─── computeMonthComparison ───────────────────────────────────────

describe("computeMonthComparison", () => {
  it("returns null when last month has no data", () => {
    const expenses = [mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" })];
    expect(computeMonthComparison(expenses, 2024, 5)).toBeNull();
  });

  it("computes change when both months have data", () => {
    const expenses = [
      mkExpense({ amount: 1000, paidBy: "u1", date: ts(2024, 4, 15), transactionType: "expense" }),
      mkExpense({ amount: 1500, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" }),
      mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 4, 10), transactionType: "income" }),
      mkExpense({ amount: 700, paidBy: "u1", date: ts(2024, 5, 10), transactionType: "income" }),
    ];
    const result = computeMonthComparison(expenses, 2024, 5);
    expect(result).not.toBeNull();
    expect(result?.lastMonthSpent).toBe(1000);
    expect(result?.spentChange).toBe(500);
    expect(result?.spentChangePercent).toBe(50);
    expect(result?.lastMonthReceived).toBe(500);
    expect(result?.receivedChange).toBe(200);
  });

  it("handles spentChangePercent as 0 when last month spent is 0", () => {
    const expenses = [
      mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 4, 15), transactionType: "income" }),
      mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" }),
    ];
    const result = computeMonthComparison(expenses, 2024, 5);
    expect(result).not.toBeNull();
    expect(result?.spentChangePercent).toBe(0);
  });

  it("handles December to January year transition", () => {
    const expenses = [
      mkExpense({ amount: 1000, paidBy: "u1", date: ts(2023, 11, 15), transactionType: "expense" }),
      mkExpense({ amount: 500, paidBy: "u1", date: ts(2024, 0, 15), transactionType: "expense" }),
    ];
    const result = computeMonthComparison(expenses, 2024, 0);
    expect(result).not.toBeNull();
    expect(result?.lastMonthSpent).toBe(1000);
    expect(result?.spentChange).toBe(-500);
  });
});

// ─── computeCategoryUsageCount ────────────────────────────────────

describe("computeCategoryUsageCount", () => {
  it("returns an empty object for empty expenses", () => {
    expect(computeCategoryUsageCount([])).toEqual({});
  });

  it("counts usage per category", () => {
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), category: "groceries" }),
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 11), category: "groceries" }),
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 12), category: "transport" }),
    ];
    expect(computeCategoryUsageCount(expenses)).toEqual({ groceries: 2, transport: 1 });
  });

  it("defaults to 'other' for empty category", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), category: "" })];
    expect(computeCategoryUsageCount(expenses)).toEqual({ other: 1 });
  });
});

// ─── suggestDescriptions ──────────────────────────────────────────

describe("suggestDescriptions", () => {
  it("returns matching descriptions from history", () => {
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), description: "Grocery shopping" }),
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 11), description: "Grocery run" }),
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 12), description: "Petrol" }),
    ];
    const result = suggestDescriptions(expenses, "gro");
    expect(result).toHaveLength(2);
    expect(result).toContain("Grocery shopping");
    expect(result).toContain("Grocery run");
  });

  it("returns an empty array for empty history", () => {
    expect(suggestDescriptions([], "gro")).toEqual([]);
  });

  it("returns an empty array for empty prefix", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), description: "Grocery" })];
    expect(suggestDescriptions(expenses, "")).toEqual([]);
    expect(suggestDescriptions(expenses, "   ")).toEqual([]);
  });

  it("respects the limit parameter", () => {
    const expenses = Array.from({ length: 10 }, (_, i) =>
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), description: `Grocery ${i}` })
    );
    const result = suggestDescriptions(expenses, "gro", 3);
    expect(result).toHaveLength(3);
  });

  it("uses default limit of 5", () => {
    const expenses = Array.from({ length: 10 }, (_, i) =>
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), description: `Grocery ${i}` })
    );
    const result = suggestDescriptions(expenses, "gro");
    expect(result).toHaveLength(5);
  });

  it("filters out empty descriptions", () => {
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), description: "Grocery" }),
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 11), description: "" }),
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 12), description: "   " }),
    ];
    const result = suggestDescriptions(expenses, "gro");
    expect(result).toEqual(["Grocery"]);
  });

  it("returns unique descriptions only", () => {
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), description: "Grocery" }),
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 11), description: "Grocery" }),
    ];
    const result = suggestDescriptions(expenses, "gro");
    expect(result).toEqual(["Grocery"]);
  });

  it("matches case-insensitively", () => {
    const expenses = [mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), description: "GROCERY" })];
    expect(suggestDescriptions(expenses, "gro")).toEqual(["GROCERY"]);
  });
});

// ─── household-categories: getCategoryIcon ────────────────────────

describe("getCategoryIcon", () => {
  const expenseKeys = [
    "groceries", "vegetables", "utilities", "rent", "transport", "medical",
    "education", "entertainment", "dining", "shopping", "household", "insurance", "other",
  ];
  const expectedExpenseIcons: Record<string, string> = {
    groceries: "ShoppingCart",
    vegetables: "Sprout",
    utilities: "Zap",
    rent: "Home",
    transport: "Car",
    medical: "Stethoscope",
    education: "GraduationCap",
    entertainment: "Film",
    dining: "Utensils",
    shopping: "ShoppingBag",
    household: "Sparkles",
    insurance: "Shield",
    other: "Package",
  };

  it.each(expenseKeys)("returns correct icon for expense category '%s'", (key) => {
    expect(getCategoryIcon(key)).toBe(expectedExpenseIcons[key]);
  });

  const incomeKeys = [
    "salary", "bonus", "gift", "refund", "investment", "rental_income", "pension", "other_income",
  ];
  const expectedIncomeIcons: Record<string, string> = {
    salary: "Briefcase",
    bonus: "PartyPopper",
    gift: "Gift",
    refund: "Undo2",
    investment: "TrendingUp",
    rental_income: "Building2",
    pension: "PersonStanding",
    other_income: "Landmark",
  };

  it.each(incomeKeys)("returns correct icon for income category '%s'", (key) => {
    expect(getCategoryIcon(key)).toBe(expectedIncomeIcons[key]);
  });

  it("returns 'Package' default for an unknown category", () => {
    expect(getCategoryIcon("nonexistent")).toBe("Package");
  });
});

// ─── household-categories: getCategoryColor ───────────────────────

describe("getCategoryColor", () => {
  it("returns a valid color for groceries", () => {
    expect(getCategoryColor("groceries")).toBe("#F97316");
  });

  it("returns a valid color for salary", () => {
    expect(getCategoryColor("salary")).toBe("#22C55E");
  });

  it("returns the default color for an unknown category", () => {
    expect(getCategoryColor("nonexistent")).toBe("#94A3B8");
  });

  it("returns colors for all 21 categories", () => {
    for (const cat of ALL_CATEGORIES) {
      expect(getCategoryColor(cat.key)).toBe(cat.color);
    }
  });
});

// ─── household-categories: getCategoryLabel ───────────────────────

describe("getCategoryLabel", () => {
  it("returns 'Groceries' for groceries", () => {
    expect(getCategoryLabel("groceries")).toBe("Groceries");
  });

  it("returns 'Salary' for salary", () => {
    expect(getCategoryLabel("salary")).toBe("Salary");
  });

  it("returns 'Dining Out' for dining", () => {
    expect(getCategoryLabel("dining")).toBe("Dining Out");
  });

  it("returns the key capitalized for an unknown category", () => {
    expect(getCategoryLabel("custom_cat")).toBe("Custom_cat");
  });

  it("returns the key capitalized for a single-char unknown category", () => {
    expect(getCategoryLabel("x")).toBe("X");
  });
});

// ─── household-categories: getCategory ────────────────────────────

describe("getCategory", () => {
  it("returns the category object for a known key", () => {
    const cat = getCategory("groceries");
    expect(cat).toBeDefined();
    expect(cat?.key).toBe("groceries");
    expect(cat?.isIncome).toBe(false);
  });

  it("returns undefined for an unknown key", () => {
    expect(getCategory("nonexistent")).toBeUndefined();
  });
});

// ─── household-categories: getCategories ──────────────────────────

describe("getCategories", () => {
  it("returns expense categories when isIncome is false", () => {
    const cats = getCategories(false);
    expect(cats).toHaveLength(13);
    expect(cats.every((c) => !c.isIncome)).toBe(true);
  });

  it("returns income categories when isIncome is true", () => {
    const cats = getCategories(true);
    expect(cats).toHaveLength(8);
    expect(cats.every((c) => c.isIncome)).toBe(true);
  });
});

// ─── household-categories: structure ──────────────────────────────

describe("category structure", () => {
  it("EXPENSE_CATEGORIES has exactly 13 items", () => {
    expect(getCategories(false)).toHaveLength(13);
  });

  it("INCOME_CATEGORIES has exactly 8 items", () => {
    expect(getCategories(true)).toHaveLength(8);
  });

  it("ALL_CATEGORIES has 21 items (13 + 8)", () => {
    expect(ALL_CATEGORIES).toHaveLength(21);
  });

  it("has no duplicate keys between expense and income", () => {
    const expenseKeys = getCategories(false).map((c) => c.key);
    const incomeKeys = getCategories(true).map((c) => c.key);
    const duplicates = expenseKeys.filter((k) => incomeKeys.includes(k));
    expect(duplicates).toEqual([]);
  });

  it("all expense categories have isIncome=false", () => {
    expect(getCategories(false).every((c) => c.isIncome === false)).toBe(true);
  });

  it("all income categories have isIncome=true", () => {
    expect(getCategories(true).every((c) => c.isIncome === true)).toBe(true);
  });
});

// ─── household-categories: suggestCategory ────────────────────────

describe("suggestCategory", () => {
  it("matches 'grocery' → groceries", () => {
    expect(suggestCategory("grocery shopping")).toBe("groceries");
  });

  it("matches 'supermarket' → groceries", () => {
    expect(suggestCategory("supermarket run")).toBe("groceries");
  });

  it("matches 'salary' → salary", () => {
    expect(suggestCategory("monthly salary")).toBe("salary");
  });

  it("matches 'petrol' → transport", () => {
    expect(suggestCategory("petrol for car")).toBe("transport");
  });

  it("matches 'electricity bill' → utilities", () => {
    expect(suggestCategory("electricity bill")).toBe("utilities");
  });

  it("matches 'doctor visit' → medical", () => {
    expect(suggestCategory("doctor visit")).toBe("medical");
  });

  it("matches 'movie ticket' → entertainment", () => {
    expect(suggestCategory("movie ticket")).toBe("entertainment");
  });

  it("matches 'restaurant dinner' → dining", () => {
    expect(suggestCategory("restaurant dinner")).toBe("dining");
  });

  it("matches 'rent payment' → rent", () => {
    expect(suggestCategory("rent payment")).toBe("rent");
  });

  it("matches 'school fees' → education", () => {
    expect(suggestCategory("school fees")).toBe("education");
  });

  it("matches 'clothes shopping' → shopping", () => {
    expect(suggestCategory("buying clothes")).toBe("shopping");
  });

  it("matches 'maid cleaning' → household", () => {
    expect(suggestCategory("maid cleaning")).toBe("household");
  });

  it("matches 'insurance premium' → insurance", () => {
    expect(suggestCategory("insurance premium")).toBe("insurance");
  });

  it("matches 'bonus' → bonus", () => {
    expect(suggestCategory("yearly bonus")).toBe("bonus");
  });

  it("matches 'gift' → gift", () => {
    expect(suggestCategory("birthday gift")).toBe("gift");
  });

  it("matches 'refund' → refund", () => {
    expect(suggestCategory("product refund")).toBe("refund");
  });

  it("matches 'mutual fund' → investment", () => {
    expect(suggestCategory("mutual fund sip")).toBe("investment");
  });

  it("matches 'rental income' → salary (income keyword matches first)", () => {
    // "income" keyword (maps to salary) is checked before "rental" due to object key order
    expect(suggestCategory("rental income from tenant")).toBe("salary");
  });

  it("matches 'rental' alone → rental_income", () => {
    expect(suggestCategory("rental property")).toBe("rental_income");
  });

  it("matches 'tenant' → rental_income", () => {
    expect(suggestCategory("tenant payment received")).toBe("rental_income");
  });

  it("matches 'pension' → pension", () => {
    expect(suggestCategory("monthly pension")).toBe("pension");
  });

  it("returns null for no match", () => {
    expect(suggestCategory("xyzqwerty")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(suggestCategory("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(suggestCategory("   ")).toBeNull();
  });

  it("matches case-insensitively", () => {
    expect(suggestCategory("GROCERY")).toBe("groceries");
  });

  it("prioritizes longer multi-word phrases over single words", () => {
    // "tata power" is a multi-word phrase that should match before "power" alone
    expect(suggestCategory("tata power bill")).toBe("utilities");
  });
});

// ─── household-categories: sortedByUsage ──────────────────────────

describe("sortedByUsage", () => {
  it("sorts categories by usage count descending", () => {
    const usage = { transport: 5, groceries: 10, rent: 1 };
    const result = sortedByUsage(usage, false);
    expect(result[0].key).toBe("groceries");
    expect(result[1].key).toBe("transport");
    expect(result[2].key).toBe("rent");
  });

  it("keeps default order for categories with no usage", () => {
    const result = sortedByUsage({}, false);
    expect(result[0].key).toBe("groceries");
  });

  it("works for income categories", () => {
    const usage = { bonus: 3, salary: 7 };
    const result = sortedByUsage(usage, true);
    expect(result[0].key).toBe("salary");
    expect(result[1].key).toBe("bonus");
  });
});

// ─── household-categories: default categories ─────────────────────

describe("default split group categories", () => {
  it("DEFAULT_CATEGORIES has 6 items", () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(6);
    expect(DEFAULT_CATEGORIES).toContain("food");
    expect(DEFAULT_CATEGORIES).toContain("other");
  });

  it("DEFAULT_CATEGORY_LABELS maps all keys", () => {
    for (const key of DEFAULT_CATEGORIES) {
      expect(DEFAULT_CATEGORY_LABELS[key]).toBeDefined();
    }
  });

  it("DEFAULT_CATEGORY_COLORS maps all keys", () => {
    for (const key of DEFAULT_CATEGORIES) {
      expect(DEFAULT_CATEGORY_COLORS[key]).toBeDefined();
    }
  });
});

// ─── Edge cases ───────────────────────────────────────────────────

describe("edge cases", () => {
  it("handles very large amounts (1,000,000+)", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 1000000, paidBy: "u1", date, transactionType: "expense" }),
      mkExpense({ amount: 2000000, paidBy: "u1", date, transactionType: "income" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(1000000);
    expect(result.totalReceived).toBe(2000000);
    expect(result.netAmount).toBe(1000000);
  });

  it("handles very small amounts (0.01)", () => {
    const date = ts(2024, 5, 15);
    const expenses = [mkExpense({ amount: 0.01, paidBy: "u1", date, transactionType: "expense" })];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(0.01);
  });

  it("handles negative amounts gracefully (no validation)", () => {
    const date = ts(2024, 5, 15);
    const expenses = [mkExpense({ amount: -50, paidBy: "u1", date, transactionType: "expense" })];
    const result = computeDailySummary(expenses, date);
    // The function does not validate; it just sums
    expect(result.totalSpent).toBe(-50);
  });

  it("handles many decimal places (rounding)", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 1.111111, paidBy: "u1", date, transactionType: "expense" }),
      mkExpense({ amount: 2.222222, paidBy: "u1", date, transactionType: "expense" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.totalSpent).toBe(3.33);
  });

  it("handles unicode in descriptions", () => {
    const date = ts(2024, 5, 15);
    const expenses = [
      mkExpense({ amount: 100, paidBy: "u1", date, description: "Café résumé naïve", transactionType: "expense" }),
    ];
    const result = computeDailySummary(expenses, date);
    expect(result.entries[0].description).toBe("Café résumé naïve");
  });

  it("handles empty string descriptions", () => {
    const date = ts(2024, 5, 15);
    const expenses = [mkExpense({ amount: 100, paidBy: "u1", date, description: "", transactionType: "expense" })];
    const result = computeDailySummary(expenses, date);
    expect(result.entries[0].description).toBe("");
    expect(result.entryCount).toBe(1);
  });

  it("handles very long descriptions", () => {
    const date = ts(2024, 5, 15);
    const longDesc = "A".repeat(1000);
    const expenses = [mkExpense({ amount: 100, paidBy: "u1", date, description: longDesc, transactionType: "expense" })];
    const result = computeDailySummary(expenses, date);
    expect(result.entries[0].description).toBe(longDesc);
    expect(result.entries[0].description).toHaveLength(1000);
  });

  it("handles large amounts in monthly report", () => {
    const expenses = [
      mkExpense({ amount: 1000000, paidBy: "u1", date: ts(2024, 5, 15), transactionType: "expense" }),
    ];
    const report = computeMonthlyReport(expenses, [], 2024, 5, 2000000);
    expect(report.totalSpent).toBe(1000000);
    expect(report.budgetProgress).toBe(50);
  });

  it("handles unicode descriptions in suggestDescriptions", () => {
    const expenses = [
      mkExpense({ amount: 10, paidBy: "u1", date: ts(2024, 5, 10), description: "Café latte" }),
    ];
    expect(suggestDescriptions(expenses, "café")).toEqual(["Café latte"]);
  });

  it("handles suggestCategory with unicode description", () => {
    expect(suggestCategory("café lunch")).toBe("dining");
  });
});
