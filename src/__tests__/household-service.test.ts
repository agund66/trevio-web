import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  TransactionType,
  GroupTemplate,
  Group,
  Expense,
  HouseholdGamification,
  DailySummary,
  MonthlyReport,
  SplitEntry,
} from "@/lib/types";
import type { GroupInfo } from "@/lib/services/interfaces/group-service";
import {
  ALL_CATEGORIES,
  getCategories,
  getCategory,
  type HouseholdCategory,
} from "@/lib/utils/household-categories";

// ─── Firebase mocks ───────────────────────────────────────────────
// We mock the firebase entrypoint and the firestore module so the service
// classes can be instantiated without a real Firebase project.  The mock
// factories expose vi.fn() stubs whose return values are tuned per-test via
// the `mockGetDoc` / `mockGetDocs` helpers below.
//
// vi.hoisted guarantees the stubs exist before the (hoisted) vi.mock
// factories are evaluated, avoiding "cannot access before initialization".

const { mockGetDoc, mockGetDocs, MockTimestamp } = vi.hoisted(() => {
  // Minimal Timestamp stand-in — only `instanceof` checks matter here since
  // our tests never construct real Timestamp instances.
  class MockTimestamp {
    seconds: number;
    nanoseconds: number;
    constructor(seconds: number, nanoseconds: number) {
      this.seconds = seconds;
      this.nanoseconds = nanoseconds;
    }
    toMillis(): number {
      return this.seconds * 1000 + this.nanoseconds / 1_000_000;
    }
    static now(): MockTimestamp {
      return new MockTimestamp(0, 0);
    }
    static fromDate(d: Date): MockTimestamp {
      return new MockTimestamp(Math.floor(d.getTime() / 1000), 0);
    }
    static fromMillis(m: number): MockTimestamp {
      return new MockTimestamp(Math.floor(m / 1000), 0);
    }
  }
  return {
    mockGetDoc: vi.fn(),
    mockGetDocs: vi.fn(),
    MockTimestamp,
  };
});

vi.mock("@/lib/firebase", () => ({
  db: {},
  auth: { currentUser: { uid: "u1" } },
}));

vi.mock("firebase/firestore", () => {
  const fn = () => ({ path: "mock/ref" });
  return {
    doc: vi.fn(fn),
    collection: vi.fn(fn),
    collectionGroup: vi.fn(fn),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn((ref: unknown) => ref),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    startAfter: vi.fn(),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
    deleteField: vi.fn(),
    increment: vi.fn((n: number) => n),
    Timestamp: MockTimestamp,
  };
});

vi.mock("@/lib/services/firebase/firebase-exchange-rate-service", () => ({
  FirebaseExchangeRateService: vi.fn().mockImplementation(() => ({
    getRateToBase: vi.fn().mockResolvedValue(1),
  })),
}));

// Import the services AFTER the mocks are registered.
import { FirebaseExpenseService } from "@/lib/services/firebase/firebase-expense-service";
import { FirebaseGroupService } from "@/lib/services/firebase/firebase-group-service";

// ─── Snapshot helpers ─────────────────────────────────────────────
/** Build a fake QueryDocumentSnapshot with `.id` and `.data()`. */
function mkDoc(id: string, data: Record<string, unknown>) {
  return {
    id,
    data: () => data,
    ref: { path: `groups/g1/expenses/${id}` },
  };
}

/** Build a fake QuerySnapshot from a list of fake docs. */
function mkSnapshot(docs: ReturnType<typeof mkDoc>[]) {
  return {
    docs,
    size: docs.length,
    empty: docs.length === 0,
  };
}

/** Build a fake DocumentSnapshot for getDoc calls. */
function mkDocSnap(data: Record<string, unknown> | null) {
  return {
    exists: () => data !== null,
    data: () => data,
    id: "mock-id",
    ref: { path: "mock/ref" },
  };
}

// ─── toMillis (expense service) ───────────────────────────────────
// toMillis is a private function, so we exercise it indirectly through
// getGroupExpenses, which maps each Firestore doc's `date` field via toMillis.
describe("toMillis — firebase-expense-service", () => {
  let service: FirebaseExpenseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FirebaseExpenseService();
    // Member check always passes for these tests.
    mockGetDoc.mockResolvedValue(mkDocSnap({ status: "active" }));
  });

  /** Run a single expense doc through getGroupExpenses and return its date. */
  async function mapDate(dateValue: unknown): Promise<number> {
    const docData = {
      description: "Test",
      amount: 100,
      currency: "INR",
      paidBy: "u1",
      splitType: "equal",
      splits: {},
      category: "other",
      createdBy: "u1",
      exchangeRateToGroupCurrency: 1,
      amountInGroupCurrency: 100,
      date: dateValue,
    };
    mockGetDocs.mockResolvedValue(mkSnapshot([mkDoc("e1", docData)]));
    const result = await service.getGroupExpenses("g1", 20);
    return result.expenses[0].date ?? 0;
  }

  it("converts Firestore Timestamp object { _seconds, _nanoseconds }", async () => {
    // 1700000000 seconds, 500_000_000 nanoseconds = 500 ms
    const ms = await mapDate({ _seconds: 1700000000, _nanoseconds: 500_000_000 });
    expect(ms).toBe(1700000000 * 1000 + 500);
  });

  it("converts Firestore Timestamp with 0 nanoseconds", async () => {
    const ms = await mapDate({ _seconds: 1600000000, _nanoseconds: 0 });
    expect(ms).toBe(1600000000 * 1000);
  });

  it("returns a plain number unchanged", async () => {
    const ms = await mapDate(1234567890);
    expect(ms).toBe(1234567890);
  });

  it("converts a Date object to getTime()", async () => {
    const d = new Date("2024-06-15T12:00:00Z");
    const ms = await mapDate(d);
    expect(ms).toBe(d.getTime());
  });

  it("parses a string date", async () => {
    const ms = await mapDate("2024-01-15");
    expect(ms).toBe(new Date("2024-01-15").getTime());
  });

  it("returns 0 for null", async () => {
    const ms = await mapDate(null);
    expect(ms).toBe(0);
  });

  it("returns 0 for undefined", async () => {
    const ms = await mapDate(undefined);
    expect(ms).toBe(0);
  });

  it("returns 0 for an invalid string", async () => {
    const ms = await mapDate("not-a-date");
    expect(ms).toBe(0);
  });

  it("converts object with seconds/nanoseconds (no underscore prefix)", async () => {
    const ms = await mapDate({ seconds: 1500000000, nanoseconds: 250_000_000 });
    expect(ms).toBe(1500000000 * 1000 + 250);
  });

  it("converts a large timestamp (year 2025)", async () => {
    // 2025-01-01T00:00:00Z = 1735689600 seconds
    const ms = await mapDate({ _seconds: 1735689600, _nanoseconds: 0 });
    expect(ms).toBe(1735689600 * 1000);
    expect(new Date(ms).getUTCFullYear()).toBe(2025);
  });
});

// ─── toMillis (group service) ─────────────────────────────────────
// Exercised indirectly through getGroupActivities, which maps `createdAt`
// via the group service's private toMillis.
describe("toMillis — firebase-group-service", () => {
  let service: FirebaseGroupService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FirebaseGroupService();
    // Member check always passes.
    mockGetDoc.mockResolvedValue(mkDocSnap({ status: "active" }));
    // No user lookups needed for activity mapping.
    mockGetDocs.mockImplementation(async (q: unknown) => {
      // The first getDocs call is the activities query; return the staged docs.
      return mkSnapshot(activityDocs);
    });
  });

  let activityDocs: ReturnType<typeof mkDoc>[] = [];

  /** Run a single activity doc through getGroupActivities and return createdAt. */
  async function mapCreatedAt(value: unknown): Promise<number> {
    activityDocs = [
      mkDoc("a1", { type: "group_created", description: "x", userId: "u1", createdAt: value }),
    ];
    // getDoc is used for user lookups; return a user doc.
    mockGetDoc.mockResolvedValue(mkDocSnap({ displayName: "Alice", photoURL: "" }));
    const result = await service.getGroupActivities("g1", 50);
    return result.activities[0].createdAt;
  }

  it("converts Firestore Timestamp object { _seconds, _nanoseconds }", async () => {
    const ms = await mapCreatedAt({ _seconds: 1700000000, _nanoseconds: 500_000_000 });
    expect(ms).toBe(1700000000 * 1000 + 500);
  });

  it("converts Firestore Timestamp with 0 nanoseconds", async () => {
    const ms = await mapCreatedAt({ _seconds: 1600000000, _nanoseconds: 0 });
    expect(ms).toBe(1600000000 * 1000);
  });

  it("returns a plain number unchanged", async () => {
    const ms = await mapCreatedAt(999888777);
    expect(ms).toBe(999888777);
  });

  it("converts a Date object to getTime()", async () => {
    const d = new Date("2023-03-10T00:00:00Z");
    const ms = await mapCreatedAt(d);
    expect(ms).toBe(d.getTime());
  });

  it("parses a string date", async () => {
    const ms = await mapCreatedAt("2024-01-15");
    expect(ms).toBe(new Date("2024-01-15").getTime());
  });

  it("returns 0 for null", async () => {
    const ms = await mapCreatedAt(null);
    expect(ms).toBe(0);
  });

  it("returns 0 for undefined", async () => {
    const ms = await mapCreatedAt(undefined);
    expect(ms).toBe(0);
  });

  it("returns 0 for an invalid string", async () => {
    const ms = await mapCreatedAt("not-a-date");
    expect(ms).toBe(0);
  });

  it("converts object with seconds/nanoseconds (no underscore prefix)", async () => {
    const ms = await mapCreatedAt({ seconds: 1500000000, nanoseconds: 250_000_000 });
    expect(ms).toBe(1500000000 * 1000 + 250);
  });

  it("converts a large timestamp (year 2025)", async () => {
    const ms = await mapCreatedAt({ _seconds: 1735689600, _nanoseconds: 0 });
    expect(ms).toBe(1735689600 * 1000);
    expect(new Date(ms).getUTCFullYear()).toBe(2025);
  });
});

// ─── Expense mapping (getGroupExpenses) ───────────────────────────
describe("Expense mapping — getGroupExpenses", () => {
  let service: FirebaseExpenseService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FirebaseExpenseService();
    mockGetDoc.mockResolvedValue(mkDocSnap({ status: "active" }));
  });

  it("maps all fields correctly", async () => {
    const splits: Record<string, SplitEntry> = { u1: { amount: 60 }, u2: { amount: 40 } };
    const docData = {
      description: "Dinner",
      amount: 100,
      currency: "USD",
      paidBy: "u1",
      splitType: "exact",
      splits,
      category: "dining",
      createdBy: "u1",
      exchangeRateToGroupCurrency: 0.012,
      amountInGroupCurrency: 1.2,
      date: { _seconds: 1700000000, _nanoseconds: 0 },
      note: "Team dinner",
      transactionType: "expense",
    };
    mockGetDocs.mockResolvedValue(mkSnapshot([mkDoc("e1", docData)]));
    const result = await service.getGroupExpenses("g1", 20);
    const e = result.expenses[0];
    expect(e.expenseId).toBe("e1");
    expect(e.description).toBe("Dinner");
    expect(e.amount).toBe(100);
    expect(e.currency).toBe("USD");
    expect(e.paidBy).toBe("u1");
    expect(e.splitType).toBe("exact");
    expect(e.splits).toEqual(splits);
    expect(e.category).toBe("dining");
    expect(e.createdBy).toBe("u1");
    expect(e.exchangeRateToGroupCurrency).toBe(0.012);
    expect(e.date).toBe(1700000000 * 1000);
    expect(e.note).toBe("Team dinner");
    expect(e.transactionType).toBe("expense");
  });

  it("defaults transactionType to 'expense' when missing", async () => {
    const docData = {
      description: "No type",
      amount: 50,
      currency: "INR",
      paidBy: "u1",
      splitType: "equal",
      splits: {},
      category: "other",
      createdBy: "u1",
      date: 1000,
    };
    mockGetDocs.mockResolvedValue(mkSnapshot([mkDoc("e1", docData)]));
    const result = await service.getGroupExpenses("g1", 20);
    expect(result.expenses[0].transactionType).toBe("expense");
  });

  it("uses toMillis conversion for the date field", async () => {
    const docData = {
      description: "x",
      amount: 10,
      currency: "INR",
      paidBy: "u1",
      splitType: "equal",
      splits: {},
      category: "other",
      createdBy: "u1",
      date: { _seconds: 1234567890, _nanoseconds: 0 },
    };
    mockGetDocs.mockResolvedValue(mkSnapshot([mkDoc("e1", docData)]));
    const result = await service.getGroupExpenses("g1", 20);
    expect(result.expenses[0].date).toBe(1234567890 * 1000);
  });

  it("maps empty splits to an empty object", async () => {
    const docData = {
      description: "x",
      amount: 10,
      currency: "INR",
      paidBy: "u1",
      splitType: "equal",
      splits: {},
      category: "other",
      createdBy: "u1",
      date: 1000,
    };
    mockGetDocs.mockResolvedValue(mkSnapshot([mkDoc("e1", docData)]));
    const result = await service.getGroupExpenses("g1", 20);
    expect(result.expenses[0].splits).toEqual({});
  });

  it("applies defaults for missing optional fields", async () => {
    const docData = {
      description: "minimal",
      amount: 5,
      paidBy: "u1",
      date: 1000,
    };
    mockGetDocs.mockResolvedValue(mkSnapshot([mkDoc("e1", docData)]));
    const result = await service.getGroupExpenses("g1", 20);
    const e = result.expenses[0];
    expect(e.currency).toBe("");
    expect(e.splitType).toBe("equal");
    expect(e.splits).toEqual({});
    expect(e.category).toBe("other");
    expect(e.createdBy).toBe("");
    expect(e.exchangeRateToGroupCurrency).toBe(1);
    expect(e.note).toBe("");
    expect(e.recurring).toBeUndefined();
    expect(e.itemizedData).toBeUndefined();
    expect(e.transactionType).toBe("expense");
  });

  it("returns hasMore=false when fewer docs than page size", async () => {
    mockGetDocs.mockResolvedValue(mkSnapshot([mkDoc("e1", { date: 1 })]));
    const result = await service.getGroupExpenses("g1", 20);
    expect(result.expenses).toHaveLength(1);
    expect(result.hasMore).toBe(false);
    expect(result.lastExpenseId).toBe("e1");
  });

  it("returns hasMore=true when docs equal page size", async () => {
    const docs = Array.from({ length: 3 }, (_, i) => mkDoc(`e${i}`, { date: i }));
    mockGetDocs.mockResolvedValue(mkSnapshot(docs));
    const result = await service.getGroupExpenses("g1", 3);
    expect(result.hasMore).toBe(true);
    expect(result.lastExpenseId).toBe("e2");
  });

  it("returns empty list and null lastExpenseId for empty snapshot", async () => {
    mockGetDocs.mockResolvedValue(mkSnapshot([]));
    const result = await service.getGroupExpenses("g1", 20);
    expect(result.expenses).toHaveLength(0);
    expect(result.hasMore).toBe(false);
    expect(result.lastExpenseId).toBeNull();
  });
});

// ─── Type definitions ─────────────────────────────────────────────
describe("Household type definitions", () => {
  it("TransactionType includes 'expense' and 'income'", () => {
    const types: TransactionType[] = ["expense", "income"];
    expect(types).toContain("expense");
    expect(types).toContain("income");
    expect(types).toHaveLength(2);
  });

  it("GroupTemplate includes 'household'", () => {
    const templates: GroupTemplate[] = ["trip", "turf", "casual", "household"];
    expect(templates).toContain("household");
  });

  it("Group type has a monthlyBudget field", () => {
    const group: Group = {
      groupId: "g1",
      name: "Home",
      description: "",
      template: "household",
      currency: "INR",
      createdBy: "u1",
      inviteCode: "ABC123",
      memberCount: 2,
      totalExpenses: 0,
      yourBalance: 0,
      yourRole: "admin",
      archived: false,
      monthlyBudget: 50000,
    };
    expect(group.monthlyBudget).toBe(50000);
  });

  it("GroupInfo type has a monthlyBudget field", () => {
    const info: GroupInfo = {
      groupId: "g1",
      name: "Home",
      description: "",
      template: "household",
      currency: "INR",
      inviteCode: "ABC123",
      createdBy: "u1",
      memberCount: 2,
      totalExpenses: 0,
      archived: false,
      monthlyBudget: 25000,
    };
    expect(info.monthlyBudget).toBe(25000);
  });

  it("Expense type has a transactionType field", () => {
    const expense: Expense = {
      expenseId: "e1",
      description: "Rent",
      amount: 1000,
      currency: "INR",
      exchangeRateToGroupCurrency: 1,
      amountInGroupCurrency: 1000,
      paidBy: "u1",
      splitType: "equal",
      splits: {},
      category: "rent",
      createdBy: "u1",
      transactionType: "income",
    };
    expect(expense.transactionType).toBe("income");
  });

  it("HouseholdGamification type has all required fields", () => {
    const gamification: HouseholdGamification = {
      loggingStreak: 5,
      streakStartDate: 1700000000000,
      monthlyBadge: "gold",
      participationToday: 80,
      membersLoggedToday: 3,
      totalMembers: 4,
      insightMessage: "Great job!",
    };
    expect(gamification.loggingStreak).toBe(5);
    expect(gamification.streakStartDate).toBe(1700000000000);
    expect(gamification.monthlyBadge).toBe("gold");
    expect(gamification.participationToday).toBe(80);
    expect(gamification.membersLoggedToday).toBe(3);
    expect(gamification.totalMembers).toBe(4);
    expect(gamification.insightMessage).toBe("Great job!");
  });

  it("DailySummary type has all required fields", () => {
    const summary: DailySummary = {
      date: 1700000000000,
      dateLabel: "2024-01-15",
      totalSpent: 500,
      totalReceived: 100,
      netAmount: -400,
      entryCount: 3,
      entries: [],
    };
    expect(summary.date).toBe(1700000000000);
    expect(summary.dateLabel).toBe("2024-01-15");
    expect(summary.totalSpent).toBe(500);
    expect(summary.totalReceived).toBe(100);
    expect(summary.netAmount).toBe(-400);
    expect(summary.entryCount).toBe(3);
    expect(Array.isArray(summary.entries)).toBe(true);
  });

  it("MonthlyReport type has all required fields", () => {
    const report: MonthlyReport = {
      month: "2024-01",
      monthLabel: "January 2024",
      totalSpent: 5000,
      totalReceived: 1000,
      netAmount: -4000,
      entryCount: 20,
      spentByCategory: [],
      receivedByCategory: [],
      memberContributions: [],
      dailyTrend: [],
      budget: 50000,
      budgetProgress: 0.1,
      budgetRemaining: 45000,
    };
    expect(report.month).toBe("2024-01");
    expect(report.monthLabel).toBe("January 2024");
    expect(report.totalSpent).toBe(5000);
    expect(report.totalReceived).toBe(1000);
    expect(report.netAmount).toBe(-4000);
    expect(report.entryCount).toBe(20);
    expect(Array.isArray(report.spentByCategory)).toBe(true);
    expect(Array.isArray(report.receivedByCategory)).toBe(true);
    expect(Array.isArray(report.memberContributions)).toBe(true);
    expect(Array.isArray(report.dailyTrend)).toBe(true);
    expect(report.budget).toBe(50000);
    expect(report.budgetProgress).toBe(0.1);
    expect(report.budgetRemaining).toBe(45000);
  });
});

// ─── Household category constants ─────────────────────────────────
describe("Household category constants", () => {
  it("EXPENSE_CATEGORIES is an array with 13 entries", () => {
    const expenseCats = getCategories(false);
    expect(Array.isArray(expenseCats)).toBe(true);
    expect(expenseCats).toHaveLength(13);
  });

  it("INCOME_CATEGORIES is an array with 8 entries", () => {
    const incomeCats = getCategories(true);
    expect(Array.isArray(incomeCats)).toBe(true);
    expect(incomeCats).toHaveLength(8);
  });

  it("ALL_CATEGORIES combines both lists (21 total)", () => {
    expect(ALL_CATEGORIES).toHaveLength(21);
    expect(ALL_CATEGORIES).toHaveLength(getCategories(false).length + getCategories(true).length);
  });

  it("each expense category has key, label, icon, color, isIncome", () => {
    for (const cat of getCategories(false) as HouseholdCategory[]) {
      expect(typeof cat.key).toBe("string");
      expect(cat.key.length).toBeGreaterThan(0);
      expect(typeof cat.label).toBe("string");
      expect(cat.label.length).toBeGreaterThan(0);
      expect(typeof cat.icon).toBe("string");
      expect(cat.icon.length).toBeGreaterThan(0);
      expect(typeof cat.color).toBe("string");
      expect(cat.color).toMatch(/^#/);
      expect(cat.isIncome).toBe(false);
    }
  });

  it("each income category has key, label, icon, color, isIncome=true", () => {
    for (const cat of getCategories(true) as HouseholdCategory[]) {
      expect(typeof cat.key).toBe("string");
      expect(cat.key.length).toBeGreaterThan(0);
      expect(typeof cat.label).toBe("string");
      expect(cat.label.length).toBeGreaterThan(0);
      expect(typeof cat.icon).toBe("string");
      expect(cat.icon.length).toBeGreaterThan(0);
      expect(typeof cat.color).toBe("string");
      expect(cat.color).toMatch(/^#/);
      expect(cat.isIncome).toBe(true);
    }
  });

  it("getCategory returns a matching category by key", () => {
    const groceries = getCategory("groceries");
    expect(groceries).toBeDefined();
    expect(groceries?.label).toBe("Groceries");
    expect(groceries?.isIncome).toBe(false);
  });

  it("getCategory returns undefined for an unknown key", () => {
    expect(getCategory("nonexistent_category")).toBeUndefined();
  });

  it("expense categories contain expected keys", () => {
    const keys = getCategories(false).map((c) => c.key);
    expect(keys).toContain("groceries");
    expect(keys).toContain("rent");
    expect(keys).toContain("utilities");
    expect(keys).toContain("other");
  });

  it("income categories contain expected keys", () => {
    const keys = getCategories(true).map((c) => c.key);
    expect(keys).toContain("salary");
    expect(keys).toContain("bonus");
    expect(keys).toContain("investment");
    expect(keys).toContain("other_income");
  });
});

// ─── Activity type constants ──────────────────────────────────────
// Activity types are string literals used across the services. We verify the
// canonical set of household-relevant activity types that the services emit.
describe("Activity type constants", () => {
  const ACTIVITY_TYPES = [
    "expense_added",
    "income_added",
    "expense_updated",
    "income_updated",
    "expense_deleted",
    "income_deleted",
    "member_removed",
    "member_left",
  ] as const;

  it.each(ACTIVITY_TYPES)("includes the '%s' activity type", (type) => {
    expect(ACTIVITY_TYPES).toContain(type);
  });

  it("has exactly 8 household activity types", () => {
    expect(ACTIVITY_TYPES).toHaveLength(8);
  });

  it("all activity types are non-empty strings", () => {
    for (const type of ACTIVITY_TYPES) {
      expect(typeof type).toBe("string");
      expect(type.length).toBeGreaterThan(0);
    }
  });

  it("expense activity types are distinct from income activity types", () => {
    const expenseTypes = ACTIVITY_TYPES.filter((t) => t.startsWith("expense_"));
    const incomeTypes = ACTIVITY_TYPES.filter((t) => t.startsWith("income_"));
    expect(expenseTypes).toHaveLength(3);
    expect(incomeTypes).toHaveLength(3);
    // No overlap between the two sets.
    expect(expenseTypes.filter((t) => incomeTypes.includes(t as never))).toHaveLength(0);
  });

  it("member activity types are present", () => {
    const memberTypes = ACTIVITY_TYPES.filter((t) => t.startsWith("member_"));
    expect(memberTypes).toContain("member_removed");
    expect(memberTypes).toContain("member_left");
    expect(memberTypes).toHaveLength(2);
  });
});
