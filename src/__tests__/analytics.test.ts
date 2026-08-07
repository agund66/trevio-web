import { describe, it, expect } from "vitest";
import {
  computeCategoryBreakdown,
  computeMonthlyTrends,
  computeMemberSpending,
  computeGroupAnalytics,
  computeUserAnalytics,
} from "@/lib/utils/analytics";
import type { Expense, Member } from "@/lib/types";

function makeExpense(
  id: string,
  amount: number,
  category: string,
  paidBy: string,
  splits: Record<string, { amount: number }>,
  date?: number
): Expense {
  return {
    expenseId: id,
    description: `Expense ${id}`,
    amount,
    currency: "INR",
    paidBy,
    splitType: "equal",
    splits,
    category,
    createdBy: paidBy,
    date: date || Date.now(),
  };
}

function makeMember(uid: string, name: string, balance = 0): Member {
  return {
    uid,
    displayName: name,
    username: name.toLowerCase(),
    photoURL: "",
    balance,
    role: "member",
    status: "active",
  };
}

describe("Analytics - computeCategoryBreakdown", () => {
  it("returns empty for no expenses", () => {
    const result = computeCategoryBreakdown([]);
    expect(result).toEqual([]);
  });

  it("groups expenses by category", () => {
    const expenses = [
      makeExpense("1", 100, "food", "u1", {}),
      makeExpense("2", 200, "food", "u1", {}),
      makeExpense("3", 300, "transport", "u2", {}),
    ];
    const result = computeCategoryBreakdown(expenses);
    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("food");
    expect(result[0].totalAmount).toBe(300);
    expect(result[0].expenseCount).toBe(2);
    expect(result[0].percentage).toBeCloseTo(50, 0);
    expect(result[1].category).toBe("transport");
    expect(result[1].totalAmount).toBe(300);
    expect(result[1].percentage).toBeCloseTo(50, 0);
  });

  it("sorts by totalAmount descending", () => {
    const expenses = [
      makeExpense("1", 100, "food", "u1", {}),
      makeExpense("2", 500, "transport", "u1", {}),
      makeExpense("3", 50, "other", "u1", {}),
    ];
    const result = computeCategoryBreakdown(expenses);
    expect(result[0].category).toBe("transport");
    expect(result[1].category).toBe("food");
    expect(result[2].category).toBe("other");
  });

  it("handles unknown category as 'other'", () => {
    const expenses = [makeExpense("1", 100, "custom_cat", "u1", {})];
    const result = computeCategoryBreakdown(expenses);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("custom_cat");
    expect(result[0].percentage).toBe(100);
  });
});

describe("Analytics - computeMonthlyTrends", () => {
  it("returns 6 months by default", () => {
    const result = computeMonthlyTrends([]);
    expect(result).toHaveLength(6);
  });

  it("all trends have zero amount for no expenses", () => {
    const result = computeMonthlyTrends([]);
    result.forEach((t) => {
      expect(t.totalAmount).toBe(0);
      expect(t.expenseCount).toBe(0);
    });
  });

  it("assigns expenses to correct month", () => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15).getTime();
    const expenses = [
      makeExpense("1", 100, "food", "u1", {}, thisMonth),
      makeExpense("2", 200, "food", "u1", {}, thisMonth),
    ];
    const result = computeMonthlyTrends(expenses);
    const lastTrend = result[result.length - 1];
    expect(lastTrend.totalAmount).toBe(300);
    expect(lastTrend.expenseCount).toBe(2);
  });

  it("supports custom month count", () => {
    const result = computeMonthlyTrends([], 3);
    expect(result).toHaveLength(3);
  });
});

describe("Analytics - computeMemberSpending", () => {
  it("returns empty for no members", () => {
    const result = computeMemberSpending([], [], "u1");
    expect(result).toEqual([]);
  });

  it("tracks totalPaid per member", () => {
    const members = [makeMember("u1", "Alice"), makeMember("u2", "Bob")];
    const expenses = [
      makeExpense("1", 100, "food", "u1", { u1: { amount: 50 }, u2: { amount: 50 } }),
      makeExpense("2", 200, "food", "u2", { u1: { amount: 100 }, u2: { amount: 100 } }),
    ];
    const result = computeMemberSpending(expenses, members, "u1");
    const alice = result.find((m) => m.uid === "u1")!;
    const bob = result.find((m) => m.uid === "u2")!;
    expect(alice.totalPaid).toBe(100);
    expect(alice.expenseCount).toBe(1);
    expect(bob.totalPaid).toBe(200);
    expect(bob.expenseCount).toBe(1);
  });

  it("tracks totalShare from splits", () => {
    const members = [makeMember("u1", "Alice"), makeMember("u2", "Bob")];
    const expenses = [
      makeExpense("1", 100, "food", "u1", { u1: { amount: 60 }, u2: { amount: 40 } }),
    ];
    const result = computeMemberSpending(expenses, members, "u1");
    const alice = result.find((m) => m.uid === "u1")!;
    const bob = result.find((m) => m.uid === "u2")!;
    expect(alice.totalShare).toBe(60);
    expect(bob.totalShare).toBe(40);
  });

  it("sorts by totalPaid descending", () => {
    const members = [makeMember("u1", "Alice"), makeMember("u2", "Bob")];
    const expenses = [
      makeExpense("1", 100, "food", "u1", {}),
      makeExpense("2", 500, "food", "u2", {}),
    ];
    const result = computeMemberSpending(expenses, members, "u1");
    expect(result[0].uid).toBe("u2");
    expect(result[1].uid).toBe("u1");
  });
});

describe("Analytics - computeGroupAnalytics", () => {
  it("returns correct totals for a group", () => {
    const members = [makeMember("u1", "Alice"), makeMember("u2", "Bob")];
    const expenses = [
      makeExpense("1", 100, "food", "u1", { u1: { amount: 50 }, u2: { amount: 50 } }),
      makeExpense("2", 200, "transport", "u2", { u1: { amount: 100 }, u2: { amount: 100 } }),
    ];
    const result = computeGroupAnalytics("g1", "Test Group", expenses, members, "u1");
    expect(result.groupId).toBe("g1");
    expect(result.groupName).toBe("Test Group");
    expect(result.totalExpenses).toBe(300);
    expect(result.expenseCount).toBe(2);
    expect(result.avgExpenseAmount).toBe(150);
  });

  it("handles empty expenses", () => {
    const result = computeGroupAnalytics("g1", "Empty", [], [], "u1");
    expect(result.totalExpenses).toBe(0);
    expect(result.expenseCount).toBe(0);
    expect(result.avgExpenseAmount).toBe(0);
    expect(result.highestExpense).toBeNull();
    expect(result.categoryBreakdown).toEqual([]);
  });

  it("finds highest expense", () => {
    const expenses = [
      makeExpense("1", 100, "food", "u1", {}),
      makeExpense("2", 500, "transport", "u1", {}),
      makeExpense("3", 50, "food", "u1", {}),
    ];
    const result = computeGroupAnalytics("g1", "Test", expenses, [], "u1");
    expect(result.highestExpense).not.toBeNull();
    expect(result.highestExpense!.amount).toBe(500);
    expect(result.highestExpense!.description).toBe("Expense 2");
  });

  it("computes recentActivityRate", () => {
    const now = Date.now();
    const oldDate = now - 60 * 24 * 60 * 60 * 1000;
    const recentDate = now - 5 * 24 * 60 * 60 * 1000;
    const expenses = [
      makeExpense("1", 100, "food", "u1", {}, oldDate),
      makeExpense("2", 200, "food", "u1", {}, recentDate),
      makeExpense("3", 300, "food", "u1", {}, recentDate),
    ];
    const result = computeGroupAnalytics("g1", "Test", expenses, [], "u1");
    expect(result.recentActivityRate).toBeCloseTo(66.67, 0);
  });
});

describe("Analytics - computeUserAnalytics", () => {
  it("aggregates spending across groups", () => {
    const groups = [
      { groupId: "g1", groupName: "Group 1", yourBalance: 50, totalExpenses: 300, archived: false },
      { groupId: "g2", groupName: "Group 2", yourBalance: -30, totalExpenses: 200, archived: false },
    ];
    const allExpensesByGroup = new Map<string, Expense[]>([
      ["g1", [makeExpense("1", 300, "food", "u1", {})]],
      ["g2", [makeExpense("2", 200, "transport", "u2", {})]],
    ]);
    const result = computeUserAnalytics(groups, allExpensesByGroup, "u1");
    expect(result.totalSpent).toBe(500);
    expect(result.totalPaid).toBe(300);
    expect(result.totalOwed).toBe(50);
    expect(result.totalOwing).toBe(30);
    expect(result.netBalance).toBe(20);
    expect(result.groupCount).toBe(2);
    expect(result.expenseCount).toBe(2);
  });

  it("skips archived groups", () => {
    const groups = [
      { groupId: "g1", groupName: "Active", yourBalance: 0, totalExpenses: 100, archived: false },
      { groupId: "g2", groupName: "Archived", yourBalance: 0, totalExpenses: 500, archived: true },
    ];
    const allExpensesByGroup = new Map<string, Expense[]>([
      ["g1", [makeExpense("1", 100, "food", "u1", {})]],
      ["g2", [makeExpense("2", 500, "food", "u1", {})]],
    ]);
    const result = computeUserAnalytics(groups, allExpensesByGroup, "u1");
    expect(result.totalSpent).toBe(100);
    expect(result.groupCount).toBe(1);
  });

  it("returns top 5 groups sorted by spending", () => {
    const groups = Array.from({ length: 7 }, (_, i) => ({
      groupId: `g${i}`,
      groupName: `Group ${i}`,
      yourBalance: 0,
      totalExpenses: (i + 1) * 100,
      archived: false,
    }));
    const allExpensesByGroup = new Map<string, Expense[]>();
    groups.forEach((g, i) => {
      allExpensesByGroup.set(g.groupId, [makeExpense(`e${i}`, (i + 1) * 100, "food", "u1", {})]);
    });
    const result = computeUserAnalytics(groups, allExpensesByGroup, "u1");
    expect(result.topGroups).toHaveLength(5);
    expect(result.topGroups[0].totalSpent).toBe(700);
    expect(result.topGroups[4].totalSpent).toBe(300);
  });

  it("handles empty groups", () => {
    const result = computeUserAnalytics([], new Map(), "u1");
    expect(result.totalSpent).toBe(0);
    expect(result.groupCount).toBe(0);
    expect(result.expenseCount).toBe(0);
    expect(result.topGroups).toEqual([]);
  });
});
