import { describe, it, expect } from "vitest";
import {
  calculateSplits,
  calculateBalances,
  simplifyDebts,
  generateInviteCode,
  generateBaseUsername,
} from "@/lib/utils/calculations";
import type { SplitEntry, ItemizedSplitData } from "@/lib/types";

// ─── Helpers ──────────────────────────────────────────────────────
const mkSplits = (entries: Record<string, { amount: number; shareValue?: number }>): Record<string, SplitEntry> => {
  const result: Record<string, SplitEntry> = {};
  for (const [uid, val] of Object.entries(entries)) {
    result[uid] = { amount: val.amount, shareValue: val.shareValue };
  }
  return result;
};

const sumSplits = (splits: Record<string, SplitEntry>): number => {
  return Object.values(splits).reduce((sum, s) => sum + s.amount, 0);
};

const UIDS = ["u1", "u2", "u3", "u4", "u5"];

// ─── calculateSplits: EQUAL ───────────────────────────────────────
describe("calculateSplits — equal", () => {
  it("splits 100 among 3 members equally", () => {
    const result = calculateSplits(100, "equal", ["u1", "u2", "u3"]);
    expect(result.u1.amount).toBe(33.33);
    expect(result.u2.amount).toBe(33.33);
    expect(result.u3.amount).toBe(33.34);
  });

  it("splits 100 among 4 members equally", () => {
    const result = calculateSplits(100, "equal", ["u1", "u2", "u3", "u4"]);
    expect(result.u1.amount).toBe(25);
    expect(result.u2.amount).toBe(25);
    expect(result.u3.amount).toBe(25);
    expect(result.u4.amount).toBe(25);
  });

  it("splits 100 among 2 members equally", () => {
    const result = calculateSplits(100, "equal", ["u1", "u2"]);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(50);
  });

  it("splits 100 among 1 member equally", () => {
    const result = calculateSplits(100, "equal", ["u1"]);
    expect(result.u1.amount).toBe(100);
  });

  it("splits 0 among 3 members equally", () => {
    const result = calculateSplits(0, "equal", ["u1", "u2", "u3"]);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
    expect(result.u3.amount).toBe(0);
  });

  it("splits 99.99 among 3 members equally", () => {
    const result = calculateSplits(99.99, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(99.99);
  });

  it("splits 1000 among 7 members equally", () => {
    const result = calculateSplits(1000, "equal", ["u1", "u2", "u3", "u4", "u5", "u6", "u7"]);
    expect(sumSplits(result)).toBeCloseTo(1000, 2);
  });

  it("splits 33.33 among 3 members equally", () => {
    const result = calculateSplits(33.33, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(33.33);
  });

  it("splits 0.01 among 3 members equally", () => {
    const result = calculateSplits(0.01, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(0.01);
  });

  it("splits 999999.99 among 3 members equally", () => {
    const result = calculateSplits(999999.99, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(999999.99);
  });

  it("splits 100 among 6 members equally", () => {
    const result = calculateSplits(100, "equal", ["u1", "u2", "u3", "u4", "u5", "u6"]);
    expect(sumSplits(result)).toBe(100);
  });

  it("splits 50.05 among 4 members equally", () => {
    const result = calculateSplits(50.05, "equal", ["u1", "u2", "u3", "u4"]);
    expect(sumSplits(result)).toBe(50.05);
  });

  it("splits 10 among 3 members equally — last gets remainder", () => {
    const result = calculateSplits(10, "equal", ["u1", "u2", "u3"]);
    expect(result.u1.amount).toBe(3.33);
    expect(result.u2.amount).toBe(3.33);
    expect(result.u3.amount).toBe(3.34);
  });

  it("splits 1 among 3 members equally", () => {
    const result = calculateSplits(1, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(1);
  });

  it("splits 200 among 3 members equally", () => {
    const result = calculateSplits(200, "equal", ["u1", "u2", "u3"]);
    expect(result.u1.amount).toBe(66.67);
    expect(result.u2.amount).toBe(66.67);
    expect(result.u3.amount).toBe(66.66);
  });

  it("splits 500 among 8 members equally", () => {
    const result = calculateSplits(500, "equal", UIDS.concat(["u6", "u7", "u8"]));
    expect(sumSplits(result)).toBe(500);
  });

  it("splits 1234.56 among 5 members equally", () => {
    const result = calculateSplits(1234.56, "equal", UIDS);
    expect(sumSplits(result)).toBe(1234.56);
  });

  it("splits 0.03 among 3 members equally", () => {
    const result = calculateSplits(0.03, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(0.03);
  });

  it("splits 1000000 among 4 members equally", () => {
    const result = calculateSplits(1000000, "equal", ["u1", "u2", "u3", "u4"]);
    expect(result.u1.amount).toBe(250000);
    expect(result.u2.amount).toBe(250000);
    expect(result.u3.amount).toBe(250000);
    expect(result.u4.amount).toBe(250000);
  });

  it("splits 0.10 among 3 members equally", () => {
    const result = calculateSplits(0.1, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(0.1);
  });

  it("equal split with empty members returns empty", () => {
    const result = calculateSplits(100, "equal", []);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ─── calculateSplits: EXACT ───────────────────────────────────────
describe("calculateSplits — exact", () => {
  it("splits with exact amounts for 3 members", () => {
    const splits = mkSplits({ u1: { amount: 30 }, u2: { amount: 30 }, u3: { amount: 40 } });
    const result = calculateSplits(100, "exact", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(30);
    expect(result.u2.amount).toBe(30);
    expect(result.u3.amount).toBe(40);
  });

  it("exact split with missing member defaults to 0", () => {
    const splits = mkSplits({ u1: { amount: 100 } });
    const result = calculateSplits(100, "exact", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(100);
    expect(result.u2.amount).toBe(0);
  });

  it("exact split with no splits provided returns empty map", () => {
    const result = calculateSplits(100, "exact", ["u1", "u2", "u3"]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("exact split with empty splits map", () => {
    const result = calculateSplits(100, "exact", ["u1", "u2"], {});
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
  });

  it("exact split with 1 member", () => {
    const splits = mkSplits({ u1: { amount: 50 } });
    const result = calculateSplits(50, "exact", ["u1"], splits);
    expect(result.u1.amount).toBe(50);
  });

  it("exact split with unequal amounts", () => {
    const splits = mkSplits({ u1: { amount: 10.50 }, u2: { amount: 20.25 }, u3: { amount: 69.25 } });
    const result = calculateSplits(100, "exact", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(10.5);
    expect(result.u2.amount).toBe(20.25);
    expect(result.u3.amount).toBe(69.25);
  });

  it("exact split with zero amount for a member", () => {
    const splits = mkSplits({ u1: { amount: 100 }, u2: { amount: 0 }, u3: { amount: 0 } });
    const result = calculateSplits(100, "exact", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(100);
    expect(result.u2.amount).toBe(0);
    expect(result.u3.amount).toBe(0);
  });

  it("exact split with all zero amounts", () => {
    const splits = mkSplits({ u1: { amount: 0 }, u2: { amount: 0 } });
    const result = calculateSplits(100, "exact", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
  });

  it("exact split with very small amounts", () => {
    const splits = mkSplits({ u1: { amount: 0.01 }, u2: { amount: 0.01 } });
    const result = calculateSplits(0.02, "exact", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(0.01);
    expect(result.u2.amount).toBe(0.01);
  });

  it("exact split with large amounts", () => {
    const splits = mkSplits({ u1: { amount: 500000 }, u2: { amount: 500000 } });
    const result = calculateSplits(1000000, "exact", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(500000);
    expect(result.u2.amount).toBe(500000);
  });

  it("exact split does not enforce sum equals total", () => {
    const splits = mkSplits({ u1: { amount: 10 }, u2: { amount: 10 } });
    const result = calculateSplits(100, "exact", ["u1", "u2"], splits);
    expect(sumSplits(result)).toBe(20);
  });

  it("exact split with 5 members", () => {
    const splits = mkSplits({
      u1: { amount: 20 }, u2: { amount: 20 }, u3: { amount: 20 }, u4: { amount: 20 }, u5: { amount: 20 }
    });
    const result = calculateSplits(100, "exact", UIDS, splits);
    expect(sumSplits(result)).toBe(100);
  });

  it("exact split with negative amount (passes through)", () => {
    const splits = mkSplits({ u1: { amount: -10 }, u2: { amount: 110 } });
    const result = calculateSplits(100, "exact", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(-10);
    expect(result.u2.amount).toBe(110);
  });

  it("exact split with empty members returns empty", () => {
    const result = calculateSplits(100, "exact", []);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("exact split with extra split entries not in memberUids", () => {
    const splits = mkSplits({ u1: { amount: 50 }, u2: { amount: 50 }, u3: { amount: 100 } });
    const result = calculateSplits(100, "exact", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(50);
    expect(result.u3).toBeUndefined();
  });
});

// ─── calculateSplits: PERCENT ─────────────────────────────────────
describe("calculateSplits — percent", () => {
  it("splits 100 with 50%, 25%, 25%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 50 }, u2: { amount: 0, shareValue: 25 }, u3: { amount: 0, shareValue: 25 } });
    const result = calculateSplits(100, "percent", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(25);
    expect(result.u3.amount).toBe(25);
  });

  it("splits 200 with 33.33%, 33.33%, 33.34%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 33.33 }, u2: { amount: 0, shareValue: 33.33 }, u3: { amount: 0, shareValue: 33.34 } });
    const result = calculateSplits(200, "percent", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(66.66);
    expect(result.u2.amount).toBe(66.66);
    expect(result.u3.amount).toBe(66.68);
  });

  it("splits 1000 with 10%, 20%, 30%, 40%", () => {
    const splits = mkSplits({
      u1: { amount: 0, shareValue: 10 }, u2: { amount: 0, shareValue: 20 },
      u3: { amount: 0, shareValue: 30 }, u4: { amount: 0, shareValue: 40 }
    });
    const result = calculateSplits(1000, "percent", ["u1", "u2", "u3", "u4"], splits);
    expect(result.u1.amount).toBe(100);
    expect(result.u2.amount).toBe(200);
    expect(result.u3.amount).toBe(300);
    expect(result.u4.amount).toBe(400);
  });

  it("splits 100 with 0%, 0%, 100%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 0 }, u2: { amount: 0, shareValue: 0 }, u3: { amount: 0, shareValue: 100 } });
    const result = calculateSplits(100, "percent", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
    expect(result.u3.amount).toBe(100);
  });

  it("splits 100 with no splits provided returns empty map", () => {
    const result = calculateSplits(100, "percent", ["u1", "u2", "u3"]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("splits 50 with 50%, 50%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 50 }, u2: { amount: 0, shareValue: 50 } });
    const result = calculateSplits(50, "percent", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(25);
    expect(result.u2.amount).toBe(25);
  });

  it("splits 100 with 100% for one member", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 100 } });
    const result = calculateSplits(100, "percent", ["u1"], splits);
    expect(result.u1.amount).toBe(100);
  });

  it("splits 99.99 with 33.33%, 33.33%, 33.34%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 33.33 }, u2: { amount: 0, shareValue: 33.33 }, u3: { amount: 0, shareValue: 33.34 } });
    const result = calculateSplits(99.99, "percent", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(33.33);
    expect(result.u2.amount).toBe(33.33);
    expect(result.u3.amount).toBe(33.34);
  });

  it("splits 100 with 25%, 25%, 25%, 25%", () => {
    const splits = mkSplits({
      u1: { amount: 0, shareValue: 25 }, u2: { amount: 0, shareValue: 25 },
      u3: { amount: 0, shareValue: 25 }, u4: { amount: 0, shareValue: 25 }
    });
    const result = calculateSplits(100, "percent", ["u1", "u2", "u3", "u4"], splits);
    expect(result.u1.amount).toBe(25);
    expect(result.u2.amount).toBe(25);
    expect(result.u3.amount).toBe(25);
    expect(result.u4.amount).toBe(25);
  });

  it("splits 1000 with 0.1%, 0.1%, 99.8%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 0.1 }, u2: { amount: 0, shareValue: 0.1 }, u3: { amount: 0, shareValue: 99.8 } });
    const result = calculateSplits(1000, "percent", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(1);
    expect(result.u2.amount).toBe(1);
    expect(result.u3.amount).toBe(998);
  });

  it("splits 100 with 40%, 60% — preserves shareValue", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 40 }, u2: { amount: 0, shareValue: 60 } });
    const result = calculateSplits(100, "percent", ["u1", "u2"], splits);
    expect(result.u1.shareValue).toBe(40);
    expect(result.u2.shareValue).toBe(60);
  });

  it("splits 100 with missing shareValue defaults to 0", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 100 } });
    const result = calculateSplits(100, "percent", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(100);
    expect(result.u2.amount).toBe(0);
  });

  it("splits 0 with 50%, 50%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 50 }, u2: { amount: 0, shareValue: 50 } });
    const result = calculateSplits(0, "percent", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
  });

  it("splits 100 with 1%, 1%, 98%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 1 }, u2: { amount: 0, shareValue: 1 }, u3: { amount: 0, shareValue: 98 } });
    const result = calculateSplits(100, "percent", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(1);
    expect(result.u2.amount).toBe(1);
    expect(result.u3.amount).toBe(98);
  });

  it("splits 333.33 with 33.33%, 33.33%, 33.34%", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 33.33 }, u2: { amount: 0, shareValue: 33.33 }, u3: { amount: 0, shareValue: 33.34 } });
    const result = calculateSplits(333.33, "percent", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(111.1);
    expect(result.u2.amount).toBe(111.1);
    expect(result.u3.amount).toBe(111.13);
  });

  it("percent split with empty members returns empty", () => {
    const result = calculateSplits(100, "percent", []);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ─── calculateSplits: SHARES ──────────────────────────────────────
describe("calculateSplits — shares", () => {
  it("splits 100 with shares 1:2:3", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 1 }, u2: { amount: 0, shareValue: 2 }, u3: { amount: 0, shareValue: 3 } });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(16.67);
    expect(result.u2.amount).toBe(33.33);
    expect(result.u3.amount).toBe(50);
  });

  it("splits 100 with equal shares 1:1:1:1", () => {
    const splits = mkSplits({
      u1: { amount: 0, shareValue: 1 }, u2: { amount: 0, shareValue: 1 },
      u3: { amount: 0, shareValue: 1 }, u4: { amount: 0, shareValue: 1 }
    });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3", "u4"], splits);
    expect(result.u1.amount).toBe(25);
    expect(result.u2.amount).toBe(25);
    expect(result.u3.amount).toBe(25);
    expect(result.u4.amount).toBe(25);
  });

  it("splits 100 with shares 0:0:0 — totalShares is 0", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 0 }, u2: { amount: 0, shareValue: 0 }, u3: { amount: 0, shareValue: 0 } });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"], splits);
    expect(result.u1).toBeUndefined();
    expect(result.u2).toBeUndefined();
    expect(result.u3).toBeUndefined();
  });

  it("splits 100 with shares 1:1", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 1 }, u2: { amount: 0, shareValue: 1 } });
    const result = calculateSplits(100, "shares", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(50);
  });

  it("splits 100 with shares 3:1", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 3 }, u2: { amount: 0, shareValue: 1 } });
    const result = calculateSplits(100, "shares", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(75);
    expect(result.u2.amount).toBe(25);
  });

  it("splits 1000 with shares 1:2:3:4", () => {
    const splits = mkSplits({
      u1: { amount: 0, shareValue: 1 }, u2: { amount: 0, shareValue: 2 },
      u3: { amount: 0, shareValue: 3 }, u4: { amount: 0, shareValue: 4 }
    });
    const result = calculateSplits(1000, "shares", ["u1", "u2", "u3", "u4"], splits);
    expect(sumSplits(result)).toBe(1000);
  });

  it("splits 100 with shares 10:20:30", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 10 }, u2: { amount: 0, shareValue: 20 }, u3: { amount: 0, shareValue: 30 } });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(16.67);
    expect(result.u2.amount).toBe(33.33);
    expect(result.u3.amount).toBe(50);
  });

  it("splits 100 with shares 0:1:1 — zero share member gets 0", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 0 }, u2: { amount: 0, shareValue: 1 }, u3: { amount: 0, shareValue: 1 } });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(50);
    expect(result.u3.amount).toBe(50);
  });

  it("splits 100 with shares 2:2:1", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 2 }, u2: { amount: 0, shareValue: 2 }, u3: { amount: 0, shareValue: 1 } });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"], splits);
    expect(sumSplits(result)).toBe(100);
  });

  it("splits 100 with shares 1 only — single member", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 1 } });
    const result = calculateSplits(100, "shares", ["u1"], splits);
    expect(result.u1.amount).toBe(100);
  });

  it("splits 100 with shares 5:3:2", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 5 }, u2: { amount: 0, shareValue: 3 }, u3: { amount: 0, shareValue: 2 } });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(30);
    expect(result.u3.amount).toBe(20);
  });

  it("splits 100 with shares 100:1", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 100 }, u2: { amount: 0, shareValue: 1 } });
    const result = calculateSplits(100, "shares", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(99.01);
    expect(result.u2.amount).toBe(0.99);
  });

  it("splits 0 with shares 1:2:3", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 1 }, u2: { amount: 0, shareValue: 2 }, u3: { amount: 0, shareValue: 3 } });
    const result = calculateSplits(0, "shares", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
    expect(result.u3.amount).toBe(0);
  });

  it("splits 100 with shares 1:1:1 — preserves shareValue", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 1 }, u2: { amount: 0, shareValue: 1 }, u3: { amount: 0, shareValue: 1 } });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"], splits);
    expect(result.u1.shareValue).toBe(1);
    expect(result.u2.shareValue).toBe(1);
    expect(result.u3.shareValue).toBe(1);
  });

  it("splits 100 with no splits provided returns empty map", () => {
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"]);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it("shares split with empty members returns empty", () => {
    const result = calculateSplits(100, "shares", []);
    expect(Object.keys(result)).toHaveLength(0);
  });
});

// ─── calculateSplits: EDGE CASES ──────────────────────────────────
describe("calculateSplits — edge cases", () => {
  it("equal split sums exactly to total for 3 members", () => {
    for (let i = 0; i < 20; i++) {
      const amount = Math.random() * 10000;
      const result = calculateSplits(amount, "equal", ["a", "b", "c"]);
      expect(sumSplits(result)).toBeCloseTo(amount, 2);
    }
  });

  it("shares split sums exactly to total for 4 members", () => {
    for (let i = 0; i < 20; i++) {
      const amount = Math.random() * 10000;
      const splits = mkSplits({
        a: { amount: 0, shareValue: Math.random() * 10 + 1 },
        b: { amount: 0, shareValue: Math.random() * 10 + 1 },
        c: { amount: 0, shareValue: Math.random() * 10 + 1 },
        d: { amount: 0, shareValue: Math.random() * 10 + 1 },
      });
      const result = calculateSplits(amount, "shares", ["a", "b", "c", "d"], splits);
      expect(sumSplits(result)).toBeCloseTo(amount, 2);
    }
  });

  it("percent split with random percentages sums close to total", () => {
    for (let i = 0; i < 10; i++) {
      const amount = 1000;
      const p1 = Math.random() * 100;
      const p2 = Math.random() * (100 - p1);
      const p3 = 100 - p1 - p2;
      const splits = mkSplits({
        a: { amount: 0, shareValue: p1 },
        b: { amount: 0, shareValue: p2 },
        c: { amount: 0, shareValue: p3 },
      });
      const result = calculateSplits(amount, "percent", ["a", "b", "c"], splits);
      expect(sumSplits(result)).toBeCloseTo(amount, 1);
    }
  });

  it("equal split with very large member count (100)", () => {
    const members = Array.from({ length: 100 }, (_, i) => `u${i}`);
    const result = calculateSplits(100, "equal", members);
    expect(sumSplits(result)).toBe(100);
  });

  it("equal split with 1000 amount and 3 members", () => {
    const result = calculateSplits(1000, "equal", ["u1", "u2", "u3"]);
    expect(result.u1.amount).toBe(333.33);
    expect(result.u2.amount).toBe(333.33);
    expect(result.u3.amount).toBe(333.34);
  });

  it("exact split with decimal amounts", () => {
    const splits = mkSplits({ u1: { amount: 33.33 }, u2: { amount: 33.33 }, u3: { amount: 33.34 } });
    const result = calculateSplits(100, "exact", ["u1", "u2", "u3"], splits);
    expect(sumSplits(result)).toBe(100);
  });

  it("percent split with 0 total amount", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 50 }, u2: { amount: 0, shareValue: 50 } });
    const result = calculateSplits(0, "percent", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
  });

  it("shares split with fractional shares 0.5:0.5:1", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 0.5 }, u2: { amount: 0, shareValue: 0.5 }, u3: { amount: 0, shareValue: 1 } });
    const result = calculateSplits(100, "shares", ["u1", "u2", "u3"], splits);
    expect(sumSplits(result)).toBe(100);
  });

  it("equal split with 2 members and odd amount", () => {
    const result = calculateSplits(33.33, "equal", ["u1", "u2"]);
    expect(result.u1.amount).toBe(16.67);
    expect(result.u2.amount).toBe(16.66);
  });

  it("equal split with 7 members and round amount", () => {
    const result = calculateSplits(700, "equal", ["u1", "u2", "u3", "u4", "u5", "u6", "u7"]);
    expect(result.u1.amount).toBe(100);
    expect(result.u7.amount).toBe(100);
  });

  it("percent split with 150% total (over-allocated)", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 75 }, u2: { amount: 0, shareValue: 75 } });
    const result = calculateSplits(100, "percent", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(75);
    expect(result.u2.amount).toBe(75);
    expect(sumSplits(result)).toBe(150);
  });

  it("shares split with very large share values", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 1000000 }, u2: { amount: 0, shareValue: 1000000 } });
    const result = calculateSplits(100, "shares", ["u1", "u2"], splits);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(50);
  });

  it("equal split with 3 members and amount 0.01", () => {
    const result = calculateSplits(0.01, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(0.01);
  });

  it("equal split with 3 members and amount 0.02", () => {
    const result = calculateSplits(0.02, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(0.02);
  });

  it("equal split with 3 members and very small amount 0.001", () => {
    const result = calculateSplits(0.001, "equal", ["u1", "u2", "u3"]);
    expect(sumSplits(result)).toBe(0);
  });

  it("exact split with all members having same amount", () => {
    const splits = mkSplits({ u1: { amount: 25 }, u2: { amount: 25 }, u3: { amount: 25 }, u4: { amount: 25 } });
    const result = calculateSplits(100, "exact", ["u1", "u2", "u3", "u4"], splits);
    expect(sumSplits(result)).toBe(100);
  });

  it("percent split with 50% for one member, 0 for rest", () => {
    const splits = mkSplits({ u1: { amount: 0, shareValue: 50 }, u2: { amount: 0, shareValue: 0 }, u3: { amount: 0, shareValue: 0 } });
    const result = calculateSplits(100, "percent", ["u1", "u2", "u3"], splits);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(0);
    expect(result.u3.amount).toBe(0);
  });

  it("shares split with 1:1:1:1:1 (5 equal shares)", () => {
    const splits = mkSplits({
      u1: { amount: 0, shareValue: 1 }, u2: { amount: 0, shareValue: 1 },
      u3: { amount: 0, shareValue: 1 }, u4: { amount: 0, shareValue: 1 },
      u5: { amount: 0, shareValue: 1 }
    });
    const result = calculateSplits(100, "shares", UIDS, splits);
    expect(result.u1.amount).toBe(20);
    expect(result.u5.amount).toBe(20);
  });

  it("equal split with negative amount", () => {
    const result = calculateSplits(-100, "equal", ["u1", "u2"]);
    expect(result.u1.amount).toBe(-50);
    expect(result.u2.amount).toBe(-50);
  });
});

// ─── calculateBalances ────────────────────────────────────────────
describe("calculateBalances", () => {
  it("returns zero balances for no expenses or settlements", () => {
    const result = calculateBalances([], [], ["u1", "u2", "u3"]);
    expect(result.get("u1")).toBe(0);
    expect(result.get("u2")).toBe(0);
    expect(result.get("u3")).toBe(0);
  });

  it("payer gets positive balance, splitters get negative", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 33.33 }, u2: { amount: 33.33 }, u3: { amount: 33.34 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100,
    }];
    const result = calculateBalances(expenses, [], ["u1", "u2", "u3"]);
    expect(result.get("u1")).toBeCloseTo(66.67, 2);
    expect(result.get("u2")).toBeCloseTo(-33.33, 2);
    expect(result.get("u3")).toBeCloseTo(-33.34, 2);
  });

  it("multiple expenses accumulate correctly", () => {
    const expenses = [
      { paidBy: "u1", splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }), amount: 100, exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100 },
      { paidBy: "u2", splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }), amount: 100, exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100 },
    ];
    const result = calculateBalances(expenses, [], ["u1", "u2"]);
    expect(result.get("u1")).toBe(0);
    expect(result.get("u2")).toBe(0);
  });

  it("settlement from u1 to u2 adjusts balances", () => {
    const settlements = [{ fromUid: "u1", toUid: "u2", amount: 50 }];
    const result = calculateBalances([], settlements, ["u1", "u2"]);
    expect(result.get("u1")).toBe(50);
    expect(result.get("u2")).toBe(-50);
  });

  it("expense with exchange rate converts to base currency", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 83.5, amountInGroupCurrency: 8350,
    }];
    const result = calculateBalances(expenses, [], ["u1", "u2"]);
    expect(result.get("u1")).toBeCloseTo(100 * 83.5 - 50 * 83.5, 2);
    expect(result.get("u2")).toBeCloseTo(-50 * 83.5, 2);
  });

  it("expense without amountInGroupCurrency defaults to amount", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }),
      amount: 100,
    }];
    const result = calculateBalances(expenses, [], ["u1", "u2"]);
    expect(result.get("u1")).toBe(50);
    expect(result.get("u2")).toBe(-50);
  });

  it("multiple settlements accumulate", () => {
    const settlements = [
      { fromUid: "u1", toUid: "u2", amount: 30 },
      { fromUid: "u1", toUid: "u2", amount: 20 },
    ];
    const result = calculateBalances([], settlements, ["u1", "u2"]);
    expect(result.get("u1")).toBe(50);
    expect(result.get("u2")).toBe(-50);
  });

  it("settlement between different pairs", () => {
    const settlements = [
      { fromUid: "u1", toUid: "u2", amount: 30 },
      { fromUid: "u3", toUid: "u2", amount: 20 },
    ];
    const result = calculateBalances([], settlements, ["u1", "u2", "u3"]);
    expect(result.get("u1")).toBe(30);
    expect(result.get("u2")).toBe(-50);
    expect(result.get("u3")).toBe(20);
  });

  it("expense and settlement combined", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100,
    }];
    const settlements = [{ fromUid: "u2", toUid: "u1", amount: 50 }];
    const result = calculateBalances(expenses, settlements, ["u1", "u2"]);
    // u1: +100 (paid) -50 (split) -50 (received settlement) = 0
    // u2: -50 (split) +50 (paid settlement) = 0
    expect(result.get("u1")).toBe(0);
    expect(result.get("u2")).toBe(0);
  });

  it("handles expense where payer is not in splits", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u2: { amount: 100 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100,
    }];
    const result = calculateBalances(expenses, [], ["u1", "u2"]);
    expect(result.get("u1")).toBe(100);
    expect(result.get("u2")).toBe(-100);
  });

  it("handles expense where payer is only splitter", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 100 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100,
    }];
    const result = calculateBalances(expenses, [], ["u1"]);
    expect(result.get("u1")).toBe(0);
  });

  it("multiple expenses with different payers", () => {
    const expenses = [
      { paidBy: "u1", splits: mkSplits({ u1: { amount: 33.33 }, u2: { amount: 33.33 }, u3: { amount: 33.34 } }), amount: 100, exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100 },
      { paidBy: "u2", splits: mkSplits({ u1: { amount: 33.33 }, u2: { amount: 33.33 }, u3: { amount: 33.34 } }), amount: 100, exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100 },
      { paidBy: "u3", splits: mkSplits({ u1: { amount: 33.33 }, u2: { amount: 33.33 }, u3: { amount: 33.34 } }), amount: 100, exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100 },
    ];
    const result = calculateBalances(expenses, [], ["u1", "u2", "u3"]);
    expect(result.get("u1")).toBeCloseTo(0, 1);
    expect(result.get("u2")).toBeCloseTo(0, 1);
    expect(result.get("u3")).toBeCloseTo(0, 1);
  });

  it("expense with USD exchange rate (83.5)", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 83.5, amountInGroupCurrency: 8350,
    }];
    const result = calculateBalances(expenses, [], ["u1", "u2"]);
    expect(result.get("u1")).toBe(4175);
    expect(result.get("u2")).toBe(-4175);
  });

  it("expense with EUR exchange rate (90.5)", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 30 }, u2: { amount: 30 }, u3: { amount: 40 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 90.5, amountInGroupCurrency: 9050,
    }];
    const result = calculateBalances(expenses, [], ["u1", "u2", "u3"]);
    expect(result.get("u1")).toBeCloseTo(100 * 90.5 - 30 * 90.5, 2);
    expect(result.get("u2")).toBe(-30 * 90.5);
    expect(result.get("u3")).toBe(-40 * 90.5);
  });

  it("settlement with zero amount has no effect", () => {
    const settlements = [{ fromUid: "u1", toUid: "u2", amount: 0 }];
    const result = calculateBalances([], settlements, ["u1", "u2"]);
    expect(result.get("u1")).toBe(0);
    expect(result.get("u2")).toBe(0);
  });

  it("handles member not in any expense or settlement", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100,
    }];
    const result = calculateBalances(expenses, [], ["u1", "u2", "u3"]);
    expect(result.get("u3")).toBe(0);
  });

  it("handles empty member list", () => {
    const result = calculateBalances([], [], []);
    expect(result.size).toBe(0);
  });

  it("handles expense with empty splits", () => {
    const expenses = [{
      paidBy: "u1",
      splits: {},
      amount: 100,
      exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100,
    }];
    const result = calculateBalances(expenses, [], ["u1"]);
    expect(result.get("u1")).toBe(100);
  });

  it("multiple expenses with mixed currencies", () => {
    const expenses = [
      { paidBy: "u1", splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }), amount: 100, exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100 },
      { paidBy: "u2", splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }), amount: 100, exchangeRateToGroupCurrency: 83.5, amountInGroupCurrency: 8350 },
    ];
    const result = calculateBalances(expenses, [], ["u1", "u2"]);
    expect(result.get("u1")).toBe(-4125);
    expect(result.get("u2")).toBe(4125);
  });

  it("self-settlement (fromUid == toUid) has no net effect", () => {
    const settlements = [{ fromUid: "u1", toUid: "u1", amount: 100 }];
    const result = calculateBalances([], settlements, ["u1"]);
    expect(result.get("u1")).toBe(0);
  });

  it("large number of expenses", () => {
    const expenses = Array.from({ length: 50 }, () => ({
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100,
    }));
    const result = calculateBalances(expenses, [], ["u1", "u2"]);
    expect(result.get("u1")).toBe(2500);
    expect(result.get("u2")).toBe(-2500);
  });

  it("settlement reverses the balance direction", () => {
    const expenses = [{
      paidBy: "u1",
      splits: mkSplits({ u1: { amount: 0 }, u2: { amount: 100 } }),
      amount: 100,
      exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100,
    }];
    const resultBefore = calculateBalances(expenses, [], ["u1", "u2"]);
    expect(resultBefore.get("u1")).toBe(100);
    expect(resultBefore.get("u2")).toBe(-100);

    // Settlement: u2 pays u1 → u2 balance increases, u1 decreases
    const settlements = [{ fromUid: "u2", toUid: "u1", amount: 100 }];
    const resultAfter = calculateBalances(expenses, settlements, ["u1", "u2"]);
    expect(resultAfter.get("u1")).toBe(0);
    expect(resultAfter.get("u2")).toBe(0);
  });

  it("handles 5 members with complex expense/settlement scenario", () => {
    const expenses = [
      { paidBy: "u1", splits: mkSplits({ u1: { amount: 20 }, u2: { amount: 20 }, u3: { amount: 20 }, u4: { amount: 20 }, u5: { amount: 20 } }), amount: 100, exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100 },
      { paidBy: "u2", splits: mkSplits({ u1: { amount: 50 }, u2: { amount: 50 } }), amount: 100, exchangeRateToGroupCurrency: 1, amountInGroupCurrency: 100 },
    ];
    const settlements = [{ fromUid: "u3", toUid: "u1", amount: 20 }];
    const result = calculateBalances(expenses, settlements, UIDS);
    // u1: +100-20 (exp1) -50 (exp2 split) -20 (settlement received) = 10
    // u2: -20 (exp1) +100-50 (exp2) = 30
    // u3: -20 (exp1) +20 (settlement paid) = 0
    // u4: -20, u5: -20
    expect(result.get("u1")).toBe(10);
    expect(result.get("u2")).toBe(30);
    expect(result.get("u3")).toBe(0);
    expect(result.get("u4")).toBe(-20);
    expect(result.get("u5")).toBe(-20);
  });
});

// ─── simplifyDebts ────────────────────────────────────────────────
describe("simplifyDebts", () => {
  it("returns empty for all-zero balances", () => {
    const balances = new Map([["u1", 0], ["u2", 0]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("returns one debt for debtor-creditor pair (sum = 0)", () => {
    const balances = new Map([["u1", 50], ["u2", -50]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0].fromUid).toBe("u2");
    expect(result[0].toUid).toBe("u1");
    expect(result[0].amount).toBe(50);
  });

  it("simple debtor-creditor pair", () => {
    const balances = new Map([["u1", -100], ["u2", 100]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0].fromUid).toBe("u1");
    expect(result[0].toUid).toBe("u2");
    expect(result[0].amount).toBe(100);
  });

  it("two debtors, one creditor", () => {
    const balances = new Map([["u1", -50], ["u2", -50], ["u3", 100]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(2);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(100);
  });

  it("one debtor, two creditors", () => {
    const balances = new Map([["u1", -100], ["u2", 50], ["u3", 50]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(2);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(100);
  });

  it("three members with complex balances", () => {
    const balances = new Map([["u1", -30], ["u2", 10], ["u3", 20]]);
    const result = simplifyDebts(balances);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBeCloseTo(30, 2);
  });

  it("ignores balances within threshold (-0.01 to 0.01)", () => {
    const balances = new Map([["u1", 0.005], ["u2", -0.005]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("handles exactly 0.01 balance", () => {
    const balances = new Map([["u1", 0.01], ["u2", -0.01]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("handles exactly -0.01 balance", () => {
    const balances = new Map([["u1", -0.01], ["u2", 0.01]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("handles 0.02 balance (above threshold)", () => {
    const balances = new Map([["u1", 0.02], ["u2", -0.02]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(0.02);
  });

  it("five members with mixed balances", () => {
    const balances = new Map([
      ["u1", -100], ["u2", -50], ["u3", 30], ["u4", 70], ["u5", 50]
    ]);
    const result = simplifyDebts(balances);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBeCloseTo(150, 2);
  });

  it("single debtor, single creditor, large amount", () => {
    const balances = new Map([["u1", -1000000], ["u2", 1000000]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(1000000);
  });

  it("debtor owes exactly what creditor is owed", () => {
    const balances = new Map([["u1", -33.33], ["u2", 33.33]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(33.33);
  });

  it("multiple equal debtors and creditors", () => {
    const balances = new Map([
      ["u1", -50], ["u2", -50], ["u3", 50], ["u4", 50]
    ]);
    const result = simplifyDebts(balances);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(100);
  });

  it("handles rounding in debt simplification", () => {
    const balances = new Map([["u1", -33.33], ["u2", -33.33], ["u3", 66.66]]);
    const result = simplifyDebts(balances);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBeCloseTo(66.66, 2);
  });

  it("empty balances map returns empty", () => {
    const result = simplifyDebts(new Map());
    expect(result).toHaveLength(0);
  });

  it("only debtors, no creditors returns empty", () => {
    const balances = new Map([["u1", -100], ["u2", -50]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("only creditors, no debtors returns empty", () => {
    const balances = new Map([["u1", 100], ["u2", 50]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("one debtor with multiple creditors — greedy matching", () => {
    const balances = new Map([["u1", -100], ["u2", 80], ["u3", 20]]);
    const result = simplifyDebts(balances);
    expect(result.length).toBeGreaterThanOrEqual(1);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(100);
  });

  it("debt amounts are rounded to 2 decimals", () => {
    const balances = new Map([["u1", -33.333], ["u2", 33.333]]);
    const result = simplifyDebts(balances);
    if (result.length > 0) {
      expect(result[0].amount).toBe(Math.round(result[0].amount * 100) / 100);
    }
  });

  it("complex scenario: 4 members after group expenses", () => {
    const balances = new Map([
      ["u1", 200], ["u2", -50], ["u3", -100], ["u4", -50]
    ]);
    const result = simplifyDebts(balances);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(200);
    for (const debt of result) {
      expect(debt.fromUid).not.toBe(debt.toUid);
    }
  });

  it("all members have zero balance", () => {
    const balances = new Map([["u1", 0], ["u2", 0], ["u3", 0]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("single member with zero balance", () => {
    const balances = new Map([["u1", 0]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(0);
  });

  it("debtor and creditor with exact same amount", () => {
    const balances = new Map([["u1", -250.50], ["u2", 250.50]]);
    const result = simplifyDebts(balances);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(250.5);
  });

  it("multiple debtors with different amounts, single creditor", () => {
    const balances = new Map([
      ["u1", -25], ["u2", -75], ["u3", -50], ["u4", 150]
    ]);
    const result = simplifyDebts(balances);
    const total = result.reduce((s, d) => s + d.amount, 0);
    expect(total).toBe(150);
  });

  it("settlement amounts are always positive", () => {
    const balances = new Map([
      ["u1", -100], ["u2", 50], ["u3", 50]
    ]);
    const result = simplifyDebts(balances);
    for (const debt of result) {
      expect(debt.amount).toBeGreaterThan(0);
    }
  });

  it("fromUid is always a debtor (negative balance)", () => {
    const balances = new Map([
      ["u1", -100], ["u2", 100]
    ]);
    const result = simplifyDebts(balances);
    for (const debt of result) {
      expect(balances.get(debt.fromUid)!).toBeLessThan(0);
      expect(balances.get(debt.toUid)!).toBeGreaterThan(0);
    }
  });
});

// ─── generateInviteCode ───────────────────────────────────────────
describe("generateInviteCode", () => {
  it("generates a 6-character code", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it("generates uppercase alphanumeric code", () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it("excludes ambiguous characters (0, O, I, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).not.toContain("0");
      expect(code).not.toContain("O");
      expect(code).not.toContain("I");
      expect(code).not.toContain("1");
    }
  });

  it("generates different codes on successive calls (randomness)", () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateInviteCode());
    }
    expect(codes.size).toBeGreaterThan(1);
  });

  it("uses only valid characters from the charset", () => {
    const validChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      for (const char of code) {
        expect(validChars).toContain(char);
      }
    }
  });

  it("generates code with only uppercase letters (no lowercase)", () => {
    const code = generateInviteCode();
    expect(code).toBe(code.toUpperCase());
  });

  it("generates 1000 codes all with length 6", () => {
    for (let i = 0; i < 1000; i++) {
      expect(generateInviteCode()).toHaveLength(6);
    }
  });

  it("code contains only from the 30-character charset", () => {
    const validChars = new Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split(""));
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      for (const char of code) {
        expect(validChars.has(char)).toBe(true);
      }
    }
  });

  it("generates unique codes with high probability", () => {
    const codes = new Set();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateInviteCode());
    }
    // With 30^6 possible codes, 1000 should be mostly unique
    expect(codes.size).toBeGreaterThan(900);
  });

  it("code is a string type", () => {
    const code = generateInviteCode();
    expect(typeof code).toBe("string");
  });
});

// ─── generateBaseUsername ─────────────────────────────────────────
describe("generateBaseUsername", () => {
  it("generates firstname.lastname for full name", () => {
    expect(generateBaseUsername("John", "Doe")).toBe("john.doe");
  });

  it("lowercases the username", () => {
    expect(generateBaseUsername("JANE", "SMITH")).toBe("jane.smith");
  });

  it("removes special characters from first name", () => {
    expect(generateBaseUsername("John@", "Doe")).toBe("john.doe");
  });

  it("removes special characters from last name", () => {
    expect(generateBaseUsername("John", "Doe!")).toBe("john.doe");
  });

  it("handles empty first name", () => {
    expect(generateBaseUsername("", "Doe")).toBe("doe");
  });

  it("handles empty last name", () => {
    expect(generateBaseUsername("John", "")).toBe("john");
  });

  it("handles both empty", () => {
    expect(generateBaseUsername("", "")).toBe("");
  });

  it("handles names with numbers", () => {
    expect(generateBaseUsername("John123", "Doe456")).toBe("john123.doe456");
  });

  it("handles names with spaces", () => {
    expect(generateBaseUsername("John Paul", "Doe")).toBe("johnpaul.doe");
  });

  it("handles names with hyphens", () => {
    expect(generateBaseUsername("Jean-Paul", "Doe")).toBe("jeanpaul.doe");
  });

  it("handles names with apostrophes", () => {
    expect(generateBaseUsername("O'Brien", "Doe")).toBe("obrien.doe");
  });

  it("handles names with dots", () => {
    expect(generateBaseUsername("John.Jr", "Doe")).toBe("johnjr.doe");
  });

  it("handles names with underscores", () => {
    expect(generateBaseUsername("John_Doe", "Smith")).toBe("johndoe.smith");
  });

  it("handles single character names", () => {
    expect(generateBaseUsername("A", "B")).toBe("a.b");
  });

  it("handles very long names", () => {
    const longFirst = "A".repeat(100);
    const longLast = "B".repeat(100);
    expect(generateBaseUsername(longFirst, longLast)).toBe(`${longFirst.toLowerCase()}.${longLast.toLowerCase()}`);
  });

  it("handles names with only special characters in first name", () => {
    expect(generateBaseUsername("@#$", "Doe")).toBe("doe");
  });

  it("handles names with only special characters in last name", () => {
    expect(generateBaseUsername("John", "@#$")).toBe("john");
  });

  it("handles names with only special characters in both", () => {
    expect(generateBaseUsername("@#$", "%^&")).toBe("");
  });

  it("handles unicode characters (stripped)", () => {
    expect(generateBaseUsername("José", "Nuñez")).toBe("jos.nuez");
  });

  it("handles mixed case names", () => {
    expect(generateBaseUsername("jOhN", "dOe")).toBe("john.doe");
  });

  it("handles name with trailing spaces", () => {
    expect(generateBaseUsername("John ", " Doe")).toBe("john.doe");
  });

  it("handles name with only spaces", () => {
    expect(generateBaseUsername("   ", "   ")).toBe("");
  });

  it("handles name with numbers only", () => {
    expect(generateBaseUsername("123", "456")).toBe("123.456");
  });

  it("handles name with mixed alphanumeric and special", () => {
    expect(generateBaseUsername("John@123", "Doe#456")).toBe("john123.doe456");
  });

  it("preserves dots within the generated format", () => {
    const result = generateBaseUsername("John", "Doe");
    expect(result).toContain(".");
  });

  it("handles empty string first name with valid last name", () => {
    expect(generateBaseUsername("", "Smith")).toBe("smith");
  });
});

// ─── calculateSplits: ITEMIZED ────────────────────────────────────
describe("calculateSplits — itemized", () => {
  const mkItemized = (items: Array<{ name: string; amount: number; assignedTo: string[] }>, tax = 0, tip = 0, taxMode: "proportional" | "equal" = "proportional", tipMode: "proportional" | "equal" = "proportional"): ItemizedSplitData => ({
    items: items.map((it, i) => ({ itemId: `item_${i}`, name: it.name, amount: it.amount, assignedTo: it.assignedTo })),
    taxAmount: tax,
    tipAmount: tip,
    taxSplitMode: taxMode,
    tipSplitMode: tipMode,
  });

  it("returns zeros for empty items", () => {
    const result = calculateSplits(0, "itemized", ["u1", "u2"], undefined, mkItemized([]));
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
  });

  it("returns zeros when itemizedData is undefined", () => {
    const result = calculateSplits(0, "itemized", ["u1", "u2"], undefined, undefined);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
  });

  it("splits single item among 2 people equally", () => {
    const data = mkItemized([{ name: "Pizza", amount: 100, assignedTo: ["u1", "u2"] }]);
    const result = calculateSplits(100, "itemized", ["u1", "u2"], undefined, data);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(50);
  });

  it("assigns item only to assigned person", () => {
    const data = mkItemized([{ name: "Beer", amount: 60, assignedTo: ["u1"] }]);
    const result = calculateSplits(60, "itemized", ["u1", "u2"], undefined, data);
    expect(result.u1.amount).toBe(60);
    expect(result.u2.amount).toBe(0);
  });

  it("splits multiple items correctly", () => {
    const data = mkItemized([
      { name: "Pizza", amount: 300, assignedTo: ["u1", "u2", "u3"] },
      { name: "Beer", amount: 100, assignedTo: ["u1"] },
      { name: "Salad", amount: 150, assignedTo: ["u2", "u3"] },
    ]);
    const result = calculateSplits(550, "itemized", ["u1", "u2", "u3"], undefined, data);
    // u1: 100 (pizza) + 100 (beer) = 200
    // u2: 100 (pizza) + 75 (salad) = 175
    // u3: 100 (pizza) + 75 (salad) = 175
    expect(result.u1.amount).toBeCloseTo(200, 2);
    expect(result.u2.amount).toBeCloseTo(175, 2);
    expect(result.u3.amount).toBeCloseTo(175, 2);
  });

  it("handles proportional tax", () => {
    const data = mkItemized(
      [{ name: "Burger", amount: 200, assignedTo: ["u1"] }, { name: "Salad", amount: 100, assignedTo: ["u2"] }],
      30, 0, "proportional"
    );
    const result = calculateSplits(330, "itemized", ["u1", "u2"], undefined, data);
    // u1: 200 + (200/300)*30 = 200 + 20 = 220
    // u2: 100 + (100/300)*30 = 100 + 10 = 110
    expect(result.u1.amount).toBeCloseTo(220, 2);
    expect(result.u2.amount).toBeCloseTo(110, 2);
  });

  it("handles equal tax", () => {
    const data = mkItemized(
      [{ name: "Burger", amount: 200, assignedTo: ["u1"] }, { name: "Salad", amount: 100, assignedTo: ["u2"] }],
      30, 0, "equal"
    );
    const result = calculateSplits(330, "itemized", ["u1", "u2"], undefined, data);
    // u1: 200 + 15 = 215
    // u2: 100 + 15 = 115
    expect(result.u1.amount).toBeCloseTo(215, 2);
    expect(result.u2.amount).toBeCloseTo(115, 2);
  });

  it("handles proportional tip", () => {
    const data = mkItemized(
      [{ name: "Burger", amount: 200, assignedTo: ["u1"] }, { name: "Salad", amount: 100, assignedTo: ["u2"] }],
      0, 15, "proportional", "proportional"
    );
    const result = calculateSplits(315, "itemized", ["u1", "u2"], undefined, data);
    // base for tip prop = 200 + 100 = 300
    // u1: 200 + (200/300)*15 = 200 + 10 = 210
    // u2: 100 + (100/300)*15 = 100 + 5 = 105
    expect(result.u1.amount).toBeCloseTo(210, 2);
    expect(result.u2.amount).toBeCloseTo(105, 2);
  });

  it("handles equal tip", () => {
    const data = mkItemized(
      [{ name: "Burger", amount: 200, assignedTo: ["u1"] }, { name: "Salad", amount: 100, assignedTo: ["u2"] }],
      0, 15, "proportional", "equal"
    );
    const result = calculateSplits(315, "itemized", ["u1", "u2"], undefined, data);
    // u1: 200 + 7.5 = 207.5
    // u2: 100 + 7.5 = 107.5
    expect(result.u1.amount).toBeCloseTo(207.5, 2);
    expect(result.u2.amount).toBeCloseTo(107.5, 2);
  });

  it("handles tax + tip together proportional", () => {
    const data = mkItemized(
      [{ name: "Pizza", amount: 400, assignedTo: ["u1", "u2"] }, { name: "Beer", amount: 100, assignedTo: ["u3"] }],
      50, 30, "proportional", "proportional"
    );
    const result = calculateSplits(580, "itemized", ["u1", "u2", "u3"], undefined, data);
    // items: u1=200, u2=200, u3=100, itemsTotal=500
    // tax: u1 += (200/500)*50 = 20, u2 += 20, u3 += 10
    // after tax: u1=220, u2=220, u3=110, base for tip = 500+50 = 550
    // tip: u1 += (220/550)*30 = 12, u2 += 12, u3 += (110/550)*30 = 6
    // final: u1=232, u2=232, u3=116
    expect(result.u1.amount).toBeCloseTo(232, 2);
    expect(result.u2.amount).toBeCloseTo(232, 2);
    expect(result.u3.amount).toBeCloseTo(116, 2);
  });

  it("skips items with no assignments", () => {
    const data = mkItemized([
      { name: "Pizza", amount: 100, assignedTo: ["u1"] },
      { name: "Unassigned", amount: 50, assignedTo: [] },
    ]);
    const result = calculateSplits(100, "itemized", ["u1", "u2"], undefined, data);
    expect(result.u1.amount).toBe(100);
    expect(result.u2.amount).toBe(0);
  });

  it("handles item assigned to subset of members", () => {
    const data = mkItemized([
      { name: "Pizza", amount: 300, assignedTo: ["u1", "u2"] },
      { name: "Wine", amount: 200, assignedTo: ["u3"] },
    ]);
    const result = calculateSplits(500, "itemized", ["u1", "u2", "u3"], undefined, data);
    expect(result.u1.amount).toBe(150);
    expect(result.u2.amount).toBe(150);
    expect(result.u3.amount).toBe(200);
  });

  it("sum of splits equals grand total", () => {
    const data = mkItemized(
      [{ name: "A", amount: 120, assignedTo: ["u1", "u2"] }, { name: "B", amount: 80, assignedTo: ["u3"] }],
      20, 10
    );
    const result = calculateSplits(230, "itemized", ["u1", "u2", "u3"], undefined, data);
    const total = Object.values(result).reduce((s, r) => s + r.amount, 0);
    expect(total).toBeCloseTo(230, 2);
  });

  it("handles all items assigned to all members (same as equal split)", () => {
    const data = mkItemized([{ name: "Dinner", amount: 300, assignedTo: ["u1", "u2", "u3"] }]);
    const result = calculateSplits(300, "itemized", ["u1", "u2", "u3"], undefined, data);
    expect(result.u1.amount).toBe(100);
    expect(result.u2.amount).toBe(100);
    expect(result.u3.amount).toBe(100);
  });

  it("handles single member assigned to all items", () => {
    const data = mkItemized([
      { name: "A", amount: 100, assignedTo: ["u1"] },
      { name: "B", amount: 200, assignedTo: ["u1"] },
    ]);
    const result = calculateSplits(300, "itemized", ["u1", "u2"], undefined, data);
    expect(result.u1.amount).toBe(300);
    expect(result.u2.amount).toBe(0);
  });

  it("handles tax with zero items total (no crash)", () => {
    const data = mkItemized([{ name: "A", amount: 100, assignedTo: [] }], 30, 0);
    const result = calculateSplits(0, "itemized", ["u1", "u2"], undefined, data);
    expect(result.u1.amount).toBe(0);
    expect(result.u2.amount).toBe(0);
  });

  it("ignores assignedTo uid not in memberUids", () => {
    const data = mkItemized([{ name: "A", amount: 100, assignedTo: ["u1", "uX"] }]);
    const result = calculateSplits(100, "itemized", ["u1", "u2"], undefined, data);
    expect(result.u1.amount).toBe(50);
    expect(result.u2.amount).toBe(50);
  });

  it("member with no assigned items gets zero", () => {
    const data = mkItemized([
      { name: "A", amount: 100, assignedTo: ["u1"] },
      { name: "B", amount: 200, assignedTo: ["u2"] },
    ]);
    const result = calculateSplits(300, "itemized", ["u1", "u2", "u3"], undefined, data);
    expect(result.u3.amount).toBe(0);
  });

  it("proportional tax with 3 members of unequal amounts", () => {
    const data = mkItemized(
      [
        { name: "A", amount: 300, assignedTo: ["u1"] },
        { name: "B", amount: 100, assignedTo: ["u2"] },
        { name: "C", amount: 100, assignedTo: ["u3"] },
      ],
      50
    );
    const result = calculateSplits(550, "itemized", ["u1", "u2", "u3"], undefined, data);
    // u1: 300 + (300/500)*50 = 300 + 30 = 330
    // u2: 100 + (100/500)*50 = 100 + 10 = 110
    // u3: 100 + (100/500)*50 = 100 + 10 = 110
    expect(result.u1.amount).toBeCloseTo(330, 2);
    expect(result.u2.amount).toBeCloseTo(110, 2);
    expect(result.u3.amount).toBeCloseTo(110, 2);
  });

  it("equal tax skips members with no items", () => {
    const data = mkItemized(
      [
        { name: "A", amount: 200, assignedTo: ["u1"] },
        { name: "B", amount: 100, assignedTo: ["u2"] },
      ],
      30, 0, "equal"
    );
    const result = calculateSplits(330, "itemized", ["u1", "u2", "u3"], undefined, data);
    // u3 has no items, so tax is split between u1 and u2 only: 15 each
    expect(result.u1.amount).toBeCloseTo(215, 2);
    expect(result.u2.amount).toBeCloseTo(115, 2);
    expect(result.u3.amount).toBeCloseTo(0, 2);
  });

  it("proportional tip is based on items + tax", () => {
    const data = mkItemized(
      [
        { name: "A", amount: 200, assignedTo: ["u1"] },
        { name: "B", amount: 100, assignedTo: ["u2"] },
      ],
      30, 15, "proportional", "proportional"
    );
    const result = calculateSplits(345, "itemized", ["u1", "u2"], undefined, data);
    // tip base = 300 + 30 = 330
    // u1: 200 + 20 (tax) + (220/330)*15 = 220 + 10 = 230
    // u2: 100 + 10 (tax) + (110/330)*15 = 110 + 5 = 115
    expect(result.u1.amount).toBeCloseTo(230, 2);
    expect(result.u2.amount).toBeCloseTo(115, 2);
  });

  it("sum of splits equals grand total with tax and tip", () => {
    const data = mkItemized(
      [
        { name: "A", amount: 120, assignedTo: ["u1", "u2"] },
        { name: "B", amount: 80, assignedTo: ["u3"] },
        { name: "C", amount: 50, assignedTo: ["u1"] },
      ],
      20, 10
    );
    const grandTotal = 250 + 20 + 10;
    const result = calculateSplits(grandTotal, "itemized", ["u1", "u2", "u3"], undefined, data);
    const sum = Object.values(result).reduce((s, e) => s + e.amount, 0);
    expect(sum).toBeCloseTo(grandTotal, 2);
  });

  it("handles many items with varying assignments", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      name: `Item${i}`,
      amount: (i + 1) * 10,
      assignedTo: i % 2 === 0 ? ["u1", "u2"] : ["u2", "u3"],
    }));
    const data = mkItemized(items, 25, 15);
    const itemsTotal = items.reduce((s, i) => s + i.amount, 0);
    const grandTotal = itemsTotal + 25 + 15;
    const result = calculateSplits(grandTotal, "itemized", ["u1", "u2", "u3"], undefined, data);
    const sum = Object.values(result).reduce((s, e) => s + e.amount, 0);
    expect(sum).toBeCloseTo(grandTotal, 2);
  });
});
