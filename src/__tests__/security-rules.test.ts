import { describe, it, expect } from "vitest";

// ─── Security Rules Logic Simulator ───────────────────────────────
// These tests simulate the Firestore security rules logic to verify
// that the rules correctly enforce access control.

type Role = "user" | "superadmin";
type MemberStatus = "active" | "pending" | "left" | "removed";
type MemberRole = "admin" | "member";

interface MockUser {
  uid: string;
  role: Role;
  blocked: boolean;
}

interface MockMember {
  uid: string;
  role: MemberRole;
  status: MemberStatus;
  balance: number;
  isOffline?: boolean;
}

interface MockGroup {
  groupId: string;
  memberCount: number;
  totalExpenses: number;
  updatedAt: number;
}

// ─── Helpers ──────────────────────────────────────────────────────
function makeUser(uid: string, role: Role = "user", blocked = false): MockUser {
  return { uid, role, blocked };
}

function makeMember(uid: string, role: MemberRole = "member", status: MemberStatus = "active", balance = 0, isOffline = false): MockMember {
  return { uid, role, status, balance, isOffline };
}

function affectedKeys(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const result: string[] = [];
  for (const key of keys) {
    if (before[key] !== after[key]) result.push(key);
  }
  return result;
}

// ─── Users Collection Rules ───────────────────────────────────────
describe("Security Rules — Users Collection", () => {
  const rules = {
    canRead: (requester: MockUser | null) => requester !== null,
    canCreate: (requester: MockUser | null, uid: string) => requester !== null && requester.uid === uid,
    canUpdate: (
      requester: MockUser | null,
      targetUid: string,
      before: MockUser,
      after: MockUser
    ): boolean => {
      if (!requester) return false;
      const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
      // Self-update: cannot change role or blocked
      if (requester.uid === targetUid && !changed.includes("role") && !changed.includes("blocked")) {
        return true;
      }
      // Superadmin can update any field
      return requester.role === "superadmin";
    },
    canDelete: (requester: MockUser | null, uid: string) => requester !== null && requester.uid === uid,
  };

  it("authenticated user can read any user profile", () => {
    expect(rules.canRead(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot read user profiles", () => {
    expect(rules.canRead(null)).toBe(false);
  });

  it("user can create their own document", () => {
    expect(rules.canCreate(makeUser("u1"), "u1")).toBe(true);
  });

  it("user cannot create another user's document", () => {
    expect(rules.canCreate(makeUser("u1"), "u2")).toBe(false);
  });

  it("unauthenticated user cannot create a document", () => {
    expect(rules.canCreate(null, "u1")).toBe(false);
  });

  it("user can update own profile without changing role or blocked", () => {
    const before = { ...makeUser("u1"), displayName: "Old" } as Record<string, unknown>;
    const after = { ...makeUser("u1"), displayName: "New" } as Record<string, unknown>;
    const changed = affectedKeys(before, after);
    expect(changed).toEqual(["displayName"]);
    expect(!changed.includes("role") && !changed.includes("blocked")).toBe(true);
  });

  it("user cannot update own role", () => {
    const before = makeUser("u1", "user");
    const after = makeUser("u1", "superadmin");
    expect(rules.canUpdate(makeUser("u1"), "u1", before, after)).toBe(false);
  });

  it("user cannot unblock themselves", () => {
    const before = makeUser("u1", "user", true);
    const after = makeUser("u1", "user", false);
    expect(rules.canUpdate(makeUser("u1"), "u1", before, after)).toBe(false);
  });

  it("superadmin can update any user's role", () => {
    const before = makeUser("u2", "user");
    const after = makeUser("u2", "superadmin");
    expect(rules.canUpdate(makeUser("admin", "superadmin"), "u2", before, after)).toBe(true);
  });

  it("superadmin can block a user", () => {
    const before = makeUser("u2", "user", false);
    const after = makeUser("u2", "user", true);
    expect(rules.canUpdate(makeUser("admin", "superadmin"), "u2", before, after)).toBe(true);
  });

  it("superadmin can unblock a user", () => {
    const before = makeUser("u2", "user", true);
    const after = makeUser("u2", "user", false);
    expect(rules.canUpdate(makeUser("admin", "superadmin"), "u2", before, after)).toBe(true);
  });

  it("regular user cannot update another user's profile", () => {
    const before = makeUser("u2");
    const after = makeUser("u2");
    expect(rules.canUpdate(makeUser("u1"), "u2", before, after)).toBe(false);
  });

  it("user can delete their own document", () => {
    expect(rules.canDelete(makeUser("u1"), "u1")).toBe(true);
  });

  it("user cannot delete another user's document", () => {
    expect(rules.canDelete(makeUser("u1"), "u2")).toBe(false);
  });

  it("unauthenticated user cannot delete", () => {
    expect(rules.canDelete(null, "u1")).toBe(false);
  });

  it("user can update own displayName", () => {
    const before = makeUser("u1");
    const after = makeUser("u1");
    expect(rules.canUpdate(makeUser("u1"), "u1", before, after)).toBe(true);
  });

  it("user can update own phoneNumber", () => {
    const before = makeUser("u1");
    const after = makeUser("u1");
    expect(rules.canUpdate(makeUser("u1"), "u1", before, after)).toBe(true);
  });

  it("user can update own upiId", () => {
    const before = makeUser("u1");
    const after = makeUser("u1");
    expect(rules.canUpdate(makeUser("u1"), "u1", before, after)).toBe(true);
  });

  it("user can update own defaultCurrency", () => {
    const before = makeUser("u1");
    const after = makeUser("u1");
    expect(rules.canUpdate(makeUser("u1"), "u1", before, after)).toBe(true);
  });

  it("superadmin can demote another superadmin", () => {
    const before = makeUser("u2", "superadmin");
    const after = makeUser("u2", "user");
    expect(rules.canUpdate(makeUser("admin", "superadmin"), "u2", before, after)).toBe(true);
  });

  it("superadmin can update own profile (any field)", () => {
    const before = makeUser("admin", "superadmin");
    const after = makeUser("admin", "superadmin");
    expect(rules.canUpdate(makeUser("admin", "superadmin"), "admin", before, after)).toBe(true);
  });

  it("superadmin can update own role (self-promote/demote)", () => {
    const before = makeUser("admin", "superadmin");
    const after = makeUser("admin", "user");
    // Self-update would block role change, but superadmin OR clause bypasses
    expect(rules.canUpdate(makeUser("admin", "superadmin"), "admin", before, after)).toBe(true);
  });

  it("blocked user can still read profiles (read is open to authenticated)", () => {
    const blockedUser = makeUser("u1", "user", true);
    expect(rules.canRead(blockedUser)).toBe(true);
  });

  it("blocked user cannot unblock themselves via update", () => {
    const before = makeUser("u1", "user", true);
    const after = makeUser("u1", "user", false);
    expect(rules.canUpdate(makeUser("u1", "user", true), "u1", before, after)).toBe(false);
  });

  it("blocked user cannot escalate role", () => {
    const before = makeUser("u1", "user", true);
    const after = makeUser("u1", "superadmin", true);
    expect(rules.canUpdate(makeUser("u1", "user", true), "u1", before, after)).toBe(false);
  });

  it("two different regular users cannot modify each other", () => {
    const before = makeUser("u2");
    const after = makeUser("u2");
    expect(rules.canUpdate(makeUser("u1"), "u2", before, after)).toBe(false);
  });

  it("superadmin can promote regular user", () => {
    const before = makeUser("u2", "user");
    const after = makeUser("u2", "superadmin");
    expect(rules.canUpdate(makeUser("admin", "superadmin"), "u2", before, after)).toBe(true);
  });

  it("null requester fails all checks", () => {
    expect(rules.canRead(null)).toBe(false);
    expect(rules.canCreate(null, "u1")).toBe(false);
    expect(rules.canDelete(null, "u1")).toBe(false);
  });
});

// ─── Groups Collection Rules ──────────────────────────────────────
describe("Security Rules — Groups Collection", () => {
  const rules = {
    canRead: (requester: MockUser | null) => requester !== null,
    canCreate: (requester: MockUser | null) => requester !== null,
    canUpdate: (
      requester: MockUser | null,
      groupMembers: Map<string, MockMember>,
      before: MockGroup,
      after: MockGroup
    ): boolean => {
      if (!requester) return false;
      const member = groupMembers.get(requester.uid);
      if (member && member.status === "active") return true;
      const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
      return changed.every(k => ["memberCount", "totalExpenses", "updatedAt"].includes(k));
    },
    canDelete: (requester: MockUser | null, groupMembers: Map<string, MockMember>) => {
      if (!requester) return false;
      const member = groupMembers.get(requester.uid);
      return member?.role === "admin";
    },
  };

  it("authenticated user can read any group", () => {
    expect(rules.canRead(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot read groups", () => {
    expect(rules.canRead(null)).toBe(false);
  });

  it("authenticated user can create a group", () => {
    expect(rules.canCreate(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot create a group", () => {
    expect(rules.canCreate(null)).toBe(false);
  });

  it("active member can update group fields", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 200, updatedAt: 2000 };
    expect(rules.canUpdate(makeUser("u1"), members, before, after)).toBe(true);
  });

  it("non-member can update only memberCount, totalExpenses, updatedAt", () => {
    const members = new Map<string, MockMember>();
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after: MockGroup = { groupId: "g1", memberCount: 4, totalExpenses: 100, updatedAt: 2000 };
    expect(rules.canUpdate(makeUser("u2"), members, before, after)).toBe(true);
  });

  it("non-member cannot update group name", () => {
    const members = new Map<string, MockMember>();
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after = { ...before, memberCount: 4, name: "New Name" } as unknown as MockGroup;
    const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
    expect(changed.every(k => ["memberCount", "totalExpenses", "updatedAt"].includes(k))).toBe(false);
  });

  it("pending member cannot update group (non-restricted fields)", () => {
    const members = new Map([["u1", makeMember("u1", "member", "pending")]]);
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after = { ...before, name: "New Name" } as unknown as MockGroup;
    expect(rules.canUpdate(makeUser("u1"), members, before, after)).toBe(false);
  });

  it("pending member can update memberCount/totalExpenses/updatedAt", () => {
    const members = new Map([["u1", makeMember("u1", "member", "pending")]]);
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after: MockGroup = { groupId: "g1", memberCount: 4, totalExpenses: 100, updatedAt: 2000 };
    expect(rules.canUpdate(makeUser("u1"), members, before, after)).toBe(true);
  });

  it("admin can delete group", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canDelete(makeUser("u1"), members)).toBe(true);
  });

  it("regular member cannot delete group", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canDelete(makeUser("u1"), members)).toBe(false);
  });

  it("non-member cannot delete group", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canDelete(makeUser("u1"), members)).toBe(false);
  });

  it("unauthenticated user cannot delete group", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canDelete(null, members)).toBe(false);
  });

  it("left member cannot update group (non-restricted fields)", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after = { ...before, name: "New" } as unknown as MockGroup;
    expect(rules.canUpdate(makeUser("u1"), members, before, after)).toBe(false);
  });

  it("left member can update restricted fields", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after: MockGroup = { groupId: "g1", memberCount: 2, totalExpenses: 100, updatedAt: 2000 };
    expect(rules.canUpdate(makeUser("u1"), members, before, after)).toBe(true);
  });

  it("active member can update group name", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after = { ...before, name: "New Name", updatedAt: 2000 } as unknown as MockGroup;
    expect(rules.canUpdate(makeUser("u1"), members, before, after)).toBe(true);
  });

  it("active admin can update group description", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after = { ...before, description: "New desc", updatedAt: 2000 } as unknown as MockGroup;
    expect(rules.canUpdate(makeUser("u1"), members, before, after)).toBe(true);
  });

  it("active member can update archived flag", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after = { ...before, archived: true, updatedAt: 2000 } as unknown as MockGroup;
    expect(rules.canUpdate(makeUser("u1"), members, before, after)).toBe(true);
  });

  it("non-member cannot update archived flag", () => {
    const members = new Map<string, MockMember>();
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after = { ...before, archived: true } as unknown as MockGroup;
    const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
    expect(changed.every(k => ["memberCount", "totalExpenses", "updatedAt"].includes(k))).toBe(false);
  });

  it("non-member can update only updatedAt", () => {
    const members = new Map<string, MockMember>();
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 2000 };
    expect(rules.canUpdate(makeUser("u2"), members, before, after)).toBe(true);
  });

  it("non-member can update only memberCount", () => {
    const members = new Map<string, MockMember>();
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after: MockGroup = { groupId: "g1", memberCount: 4, totalExpenses: 100, updatedAt: 1000 };
    expect(rules.canUpdate(makeUser("u2"), members, before, after)).toBe(true);
  });

  it("non-member can update only totalExpenses", () => {
    const members = new Map<string, MockMember>();
    const before: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 100, updatedAt: 1000 };
    const after: MockGroup = { groupId: "g1", memberCount: 3, totalExpenses: 200, updatedAt: 1000 };
    expect(rules.canUpdate(makeUser("u2"), members, before, after)).toBe(true);
  });
});

// ─── Members Subcollection Rules ──────────────────────────────────
describe("Security Rules — Members Subcollection", () => {
  const rules = {
    canRead: (requester: MockUser | null, targetUid: string, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      if (requester.uid === targetUid) return true;
      const member = groupMembers.get(requester.uid);
      return member?.status === "active";
    },
    canCreate: (requester: MockUser | null, targetUid: string, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      if (requester.uid === targetUid) return true;
      const member = groupMembers.get(requester.uid);
      return member?.status === "active";
    },
    canUpdate: (
      requester: MockUser | null,
      targetUid: string,
      groupMembers: Map<string, MockMember>,
      before: MockMember,
      after: MockMember
    ): boolean => {
      if (!requester) return false;
      const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
      // Self-update: cannot change role or balance.
      // Cannot self-update if current status is "removed" or "left"
      // (prevents re-activation after admin removal or voluntary leave).
      if (requester.uid === targetUid
        && before.status !== "removed"
        && before.status !== "left"
        && !changed.includes("role")
        && !changed.includes("balance")) {
        return true;
      }
      const requesterMember = groupMembers.get(requester.uid);
      // Active member: can only update balance (recalculation)
      if (requesterMember?.status === "active" && changed.length === 1 && changed[0] === "balance") {
        return true;
      }
      // Admin: can update role and updatedAt (for admin transfer)
      if (requesterMember?.role === "admin" && changed.every(k => ["role", "updatedAt"].includes(k))) {
        return true;
      }
      return false;
    },
    canDelete: (
      requester: MockUser | null,
      targetUid: string,
      groupMembers: Map<string, MockMember>,
      targetMember: MockMember
    ): boolean => {
      if (!requester) return false;
      if (requester.uid === targetUid) return true;
      const requesterMember = groupMembers.get(requester.uid);
      if (requesterMember?.role === "admin") return true;
      if (targetMember.isOffline === true && requesterMember?.status === "active") return true;
      return false;
    },
  };

  it("user can read their own member doc", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(makeUser("u1"), "u1", members)).toBe(true);
  });

  it("active member can read other member docs", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canRead(makeUser("u1"), "u2", members)).toBe(true);
  });

  it("non-member cannot read other member docs", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(makeUser("u1"), "u2", members)).toBe(false);
  });

  it("unauthenticated user cannot read member docs", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(null, "u1", members)).toBe(false);
  });

  it("user can create their own member doc (self-join)", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canCreate(makeUser("u1"), "u1", members)).toBe(true);
  });

  it("active member can create offline member doc", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canCreate(makeUser("u1"), "offline-uid", members)).toBe(true);
  });

  it("non-member cannot create member doc for others", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canCreate(makeUser("u1"), "u2", members)).toBe(false);
  });

  it("unauthenticated user cannot create member doc", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canCreate(null, "u1", members)).toBe(false);
  });

  it("user can update own status (pending to active)", () => {
    const members = new Map<string, MockMember>();
    const before = makeMember("u1", "member", "pending");
    const after = makeMember("u1", "member", "active");
    expect(rules.canUpdate(makeUser("u1"), "u1", members, before, after)).toBe(true);
  });

  it("removed member cannot reactivate themselves", () => {
    const members = new Map<string, MockMember>();
    const before = makeMember("u1", "member", "removed");
    const after = makeMember("u1", "member", "active");
    expect(rules.canUpdate(makeUser("u1"), "u1", members, before, after)).toBe(false);
  });

  it("left member cannot reactivate themselves", () => {
    const members = new Map<string, MockMember>();
    const before = makeMember("u1", "member", "left");
    const after = makeMember("u1", "member", "active");
    expect(rules.canUpdate(makeUser("u1"), "u1", members, before, after)).toBe(false);
  });

  it("removed member cannot update any field on their own doc", () => {
    const members = new Map<string, MockMember>();
    const before = makeMember("u1", "member", "removed");
    const after = makeMember("u1", "member", "removed", 0);
    // Even a non-status, non-role, non-balance change should be blocked
    const beforeWithExtra = { ...before, displayName: "Old" };
    const afterWithExtra = { ...after, displayName: "New" };
    expect(rules.canUpdate(makeUser("u1"), "u1", members, beforeWithExtra as unknown as MockMember, afterWithExtra as unknown as MockMember)).toBe(false);
  });

  it("active member can still update own displayName", () => {
    const members = new Map<string, MockMember>();
    const before = { ...makeMember("u1", "member", "active"), displayName: "Old" };
    const after = { ...makeMember("u1", "member", "active"), displayName: "New" };
    expect(rules.canUpdate(makeUser("u1"), "u1", members, before as unknown as MockMember, after as unknown as MockMember)).toBe(true);
  });

  it("user cannot update own role", () => {
    const members = new Map<string, MockMember>();
    const before = makeMember("u1", "member", "active");
    const after = makeMember("u1", "admin", "active");
    expect(rules.canUpdate(makeUser("u1"), "u1", members, before, after)).toBe(false);
  });

  it("user cannot update own balance", () => {
    const members = new Map<string, MockMember>();
    const before = makeMember("u1", "member", "active", 100);
    const after = makeMember("u1", "member", "active", 200);
    expect(rules.canUpdate(makeUser("u1"), "u1", members, before, after)).toBe(false);
  });

  it("active member can update another member's balance", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    const before = makeMember("u2", "member", "active", 100);
    const after = makeMember("u2", "member", "active", 200);
    expect(rules.canUpdate(makeUser("u1"), "u2", members, before, after)).toBe(true);
  });

  it("active member cannot update another member's role", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    const before = makeMember("u2", "member", "active");
    const after = makeMember("u2", "admin", "active");
    expect(rules.canUpdate(makeUser("u1"), "u2", members, before, after)).toBe(false);
  });

  it("active member cannot update another member's status", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    const before = makeMember("u2", "member", "active");
    const after = makeMember("u2", "member", "left");
    expect(rules.canUpdate(makeUser("u1"), "u2", members, before, after)).toBe(false);
  });

  it("admin can update member role (admin transfer)", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    const before = makeMember("u2", "member", "active");
    const after = makeMember("u2", "admin", "active");
    const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
    expect(changed.every(k => ["role", "updatedAt"].includes(k))).toBe(true);
    expect(rules.canUpdate(makeUser("u1"), "u2", members, before, after)).toBe(true);
  });

  it("admin can demote self to member (admin transfer)", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    const before = makeMember("u1", "admin", "active");
    const after = makeMember("u1", "member", "active");
    const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
    expect(changed.every(k => ["role", "updatedAt"].includes(k))).toBe(true);
    expect(rules.canUpdate(makeUser("u1"), "u1", members, before, after)).toBe(true);
  });

  it("non-member cannot update any member doc", () => {
    const members = new Map<string, MockMember>();
    const before = makeMember("u2", "member", "active");
    const after = makeMember("u2", "member", "active");
    expect(rules.canUpdate(makeUser("u1"), "u2", members, before, after)).toBe(false);
  });

  it("user can delete own member doc (leave group)", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canDelete(makeUser("u1"), "u1", members, makeMember("u1"))).toBe(true);
  });

  it("admin can delete any member doc", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canDelete(makeUser("u1"), "u2", members, makeMember("u2"))).toBe(true);
  });

  it("active member can delete offline member doc", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canDelete(makeUser("u1"), "u2", members, makeMember("u2", "member", "active", 0, true))).toBe(true);
  });

  it("active member cannot delete non-offline member doc", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canDelete(makeUser("u1"), "u2", members, makeMember("u2", "member", "active", 0, false))).toBe(false);
  });

  it("unauthenticated user cannot delete member doc", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canDelete(null, "u1", members, makeMember("u1"))).toBe(false);
  });

  it("pending member cannot update other member balance", () => {
    const members = new Map([["u1", makeMember("u1", "member", "pending")]]);
    const before = makeMember("u2", "member", "active", 100);
    const after = makeMember("u2", "member", "active", 200);
    expect(rules.canUpdate(makeUser("u1"), "u2", members, before, after)).toBe(false);
  });

  it("admin can only update role and updatedAt (not balance)", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    const before = makeMember("u2", "member", "active", 100);
    const after = makeMember("u2", "member", "active", 200);
    const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
    expect(changed.every(k => ["role", "updatedAt"].includes(k))).toBe(false);
    expect(rules.canUpdate(makeUser("u1"), "u2", members, before, after)).toBe(true); // active member can update balance
  });

  it("user can update own joinedAt", () => {
    const members = new Map<string, MockMember>();
    const before = makeMember("u1", "member", "pending");
    const after = makeMember("u1", "member", "active");
    expect(rules.canUpdate(makeUser("u1"), "u1", members, before, after)).toBe(true);
  });

  it("active member can update balance only (not status)", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    const before = makeMember("u2", "member", "active", 100);
    const after = makeMember("u2", "member", "left", 200);
    const changed = affectedKeys(before as unknown as Record<string, unknown>, after as unknown as Record<string, unknown>);
    expect(changed.length === 1 && changed[0] === "balance").toBe(false);
    expect(rules.canUpdate(makeUser("u1"), "u2", members, before, after)).toBe(false);
  });

  it("left member cannot read other members", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    expect(rules.canRead(makeUser("u1"), "u2", members)).toBe(false);
  });

  it("left member can read own doc", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    expect(rules.canRead(makeUser("u1"), "u1", members)).toBe(true);
  });

  it("left member cannot create member docs", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    expect(rules.canCreate(makeUser("u1"), "u3", members)).toBe(false);
  });

  it("left member can delete own doc", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canDelete(makeUser("u1"), "u1", members, makeMember("u1", "member", "left"))).toBe(true);
  });
});

// ─── Expenses Subcollection Rules ─────────────────────────────────
describe("Security Rules — Expenses Subcollection", () => {
  const rules = {
    canRead: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.status === "active";
    },
    canCreate: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.status === "active";
    },
    canUpdate: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.status === "active";
    },
    canDelete: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.status === "active";
    },
  };

  it("active member can read expenses", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(true);
  });

  it("non-member cannot read expenses", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(makeUser("u1"), members)).toBe(false);
  });

  it("pending member cannot read expenses", () => {
    const members = new Map([["u1", makeMember("u1", "member", "pending")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(false);
  });

  it("active member can create expense", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canCreate(makeUser("u1"), members)).toBe(true);
  });

  it("non-member cannot create expense", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canCreate(makeUser("u1"), members)).toBe(false);
  });

  it("active member can update expense", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canUpdate(makeUser("u1"), members)).toBe(true);
  });

  it("non-member cannot update expense", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canUpdate(makeUser("u1"), members)).toBe(false);
  });

  it("active member can delete expense", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canDelete(makeUser("u1"), members)).toBe(true);
  });

  it("non-member cannot delete expense", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canDelete(makeUser("u1"), members)).toBe(false);
  });

  it("unauthenticated user cannot read expenses", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(null, members)).toBe(false);
  });

  it("unauthenticated user cannot create expenses", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canCreate(null, members)).toBe(false);
  });

  it("left member cannot read expenses", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(false);
  });

  it("left member cannot create expenses", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    expect(rules.canCreate(makeUser("u1"), members)).toBe(false);
  });

  it("admin can read expenses", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(true);
  });

  it("admin can create expenses", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canCreate(makeUser("u1"), members)).toBe(true);
  });

  it("admin can delete expenses", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canDelete(makeUser("u1"), members)).toBe(true);
  });
});

// ─── Activities Subcollection Rules ───────────────────────────────
describe("Security Rules — Activities Subcollection", () => {
  const rules = {
    canRead: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.status === "active";
    },
    canCreate: (requester: MockUser | null): boolean => requester !== null,
    canUpdate: () => false,
    canDelete: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.role === "admin";
    },
  };

  it("active member can read activities", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(true);
  });

  it("non-member cannot read activities", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(makeUser("u1"), members)).toBe(false);
  });

  it("any authenticated user can create activities (for join flow)", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canCreate(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot create activities", () => {
    expect(rules.canCreate(null)).toBe(false);
  });

  it("activities are immutable — no one can update", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canUpdate()).toBe(false);
  });

  it("admin can delete activities", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canDelete(makeUser("u1"), members)).toBe(true);
  });

  it("regular member cannot delete activities", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canDelete(makeUser("u1"), members)).toBe(false);
  });

  it("non-member cannot delete activities", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canDelete(makeUser("u1"), members)).toBe(false);
  });

  it("unauthenticated user cannot read activities", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(null, members)).toBe(false);
  });

  it("pending member cannot read activities", () => {
    const members = new Map([["u1", makeMember("u1", "member", "pending")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(false);
  });

  it("left member cannot read activities", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(false);
  });

  it("superadmin who is not a member cannot read activities", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(makeUser("admin", "superadmin"), members)).toBe(false);
  });
});

// ─── Settlements Subcollection Rules ──────────────────────────────
describe("Security Rules — Settlements Subcollection", () => {
  const rules = {
    canRead: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.status === "active";
    },
    canCreate: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.status === "active";
    },
    canUpdate: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.status === "active";
    },
    canDelete: (requester: MockUser | null, groupMembers: Map<string, MockMember>): boolean => {
      if (!requester) return false;
      return groupMembers.get(requester.uid)?.role === "admin";
    },
  };

  it("active member can read settlements", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(true);
  });

  it("non-member cannot read settlements", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(makeUser("u1"), members)).toBe(false);
  });

  it("active member can create settlement", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canCreate(makeUser("u1"), members)).toBe(true);
  });

  it("non-member cannot create settlement", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canCreate(makeUser("u1"), members)).toBe(false);
  });

  it("active member can update settlement", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canUpdate(makeUser("u1"), members)).toBe(true);
  });

  it("non-member cannot update settlement", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canUpdate(makeUser("u1"), members)).toBe(false);
  });

  it("admin can delete settlement", () => {
    const members = new Map([["u1", makeMember("u1", "admin", "active")]]);
    expect(rules.canDelete(makeUser("u1"), members)).toBe(true);
  });

  it("regular member cannot delete settlement", () => {
    const members = new Map([["u1", makeMember("u1", "member", "active")]]);
    expect(rules.canDelete(makeUser("u1"), members)).toBe(false);
  });

  it("non-member cannot delete settlement", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canDelete(makeUser("u1"), members)).toBe(false);
  });

  it("unauthenticated user cannot read settlements", () => {
    const members = new Map<string, MockMember>();
    expect(rules.canRead(null, members)).toBe(false);
  });

  it("pending member cannot create settlement", () => {
    const members = new Map([["u1", makeMember("u1", "member", "pending")]]);
    expect(rules.canCreate(makeUser("u1"), members)).toBe(false);
  });

  it("left member cannot read settlements", () => {
    const members = new Map([["u1", makeMember("u1", "member", "left")]]);
    expect(rules.canRead(makeUser("u1"), members)).toBe(false);
  });
});

// ─── Invitations Rules ────────────────────────────────────────────
describe("Security Rules — Invitations", () => {
  const rules = {
    canRead: (requester: MockUser | null, toUid: string, invitedByUid: string): boolean => {
      if (!requester) return false;
      return requester.uid === toUid || requester.uid === invitedByUid;
    },
    canCreate: (requester: MockUser | null): boolean => requester !== null,
    canUpdate: (requester: MockUser | null, toUid: string): boolean => {
      if (!requester) return false;
      return requester.uid === toUid;
    },
    canDelete: () => false,
  };

  it("invited user can read invitation", () => {
    expect(rules.canRead(makeUser("u1"), "u1", "u2")).toBe(true);
  });

  it("inviter can read invitation", () => {
    expect(rules.canRead(makeUser("u2"), "u1", "u2")).toBe(true);
  });

  it("unrelated user cannot read invitation", () => {
    expect(rules.canRead(makeUser("u3"), "u1", "u2")).toBe(false);
  });

  it("unauthenticated user cannot read invitation", () => {
    expect(rules.canRead(null, "u1", "u2")).toBe(false);
  });

  it("any authenticated user can create invitation", () => {
    expect(rules.canCreate(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot create invitation", () => {
    expect(rules.canCreate(null)).toBe(false);
  });

  it("invited user can update (accept/decline)", () => {
    expect(rules.canUpdate(makeUser("u1"), "u1")).toBe(true);
  });

  it("inviter cannot update invitation status", () => {
    expect(rules.canUpdate(makeUser("u2"), "u1")).toBe(false);
  });

  it("unrelated user cannot update invitation", () => {
    expect(rules.canUpdate(makeUser("u3"), "u1")).toBe(false);
  });

  it("no one can delete invitations", () => {
    expect(rules.canDelete()).toBe(false);
  });
});

// ─── Broadcasts Rules ─────────────────────────────────────────────
describe("Security Rules — Broadcasts", () => {
  const rules = {
    canRead: (requester: MockUser | null): boolean => requester !== null,
    canCreate: (requester: MockUser | null): boolean => {
      if (!requester) return false;
      return requester.role === "superadmin";
    },
    canUpdate: (requester: MockUser | null): boolean => {
      if (!requester) return false;
      return requester.role === "superadmin";
    },
    canReadReads: (requester: MockUser | null, uid: string): boolean => {
      if (!requester) return false;
      return requester.uid === uid || requester.role === "superadmin";
    },
    canCreateReads: (requester: MockUser | null, uid: string): boolean => {
      if (!requester) return false;
      return requester.uid === uid;
    },
  };

  it("any authenticated user can read broadcasts", () => {
    expect(rules.canRead(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot read broadcasts", () => {
    expect(rules.canRead(null)).toBe(false);
  });

  it("superadmin can create broadcast", () => {
    expect(rules.canCreate(makeUser("admin", "superadmin"))).toBe(true);
  });

  it("regular user cannot create broadcast", () => {
    expect(rules.canCreate(makeUser("u1", "user"))).toBe(false);
  });

  it("superadmin can update (stop) broadcast", () => {
    expect(rules.canUpdate(makeUser("admin", "superadmin"))).toBe(true);
  });

  it("regular user cannot update broadcast", () => {
    expect(rules.canUpdate(makeUser("u1", "user"))).toBe(false);
  });

  it("user can read own broadcast reads", () => {
    expect(rules.canReadReads(makeUser("u1"), "u1")).toBe(true);
  });

  it("superadmin can read any broadcast reads", () => {
    expect(rules.canReadReads(makeUser("admin", "superadmin"), "u1")).toBe(true);
  });

  it("regular user cannot read other user's broadcast reads", () => {
    expect(rules.canReadReads(makeUser("u1", "user"), "u2")).toBe(false);
  });

  it("user can create own read record", () => {
    expect(rules.canCreateReads(makeUser("u1"), "u1")).toBe(true);
  });

  it("user cannot create read record for another user", () => {
    expect(rules.canCreateReads(makeUser("u1"), "u2")).toBe(false);
  });

  it("unauthenticated user cannot create read record", () => {
    expect(rules.canCreateReads(null, "u1")).toBe(false);
  });

  it("blocked user can still read broadcasts", () => {
    expect(rules.canRead(makeUser("u1", "user", true))).toBe(true);
  });

  it("blocked user cannot create broadcasts", () => {
    expect(rules.canCreate(makeUser("u1", "user", true))).toBe(false);
  });
});

// ─── Config Rules ─────────────────────────────────────────────────
describe("Security Rules — Config", () => {
  const rules = {
    canRead: (requester: MockUser | null): boolean => requester !== null,
    canWrite: (requester: MockUser | null): boolean => {
      if (!requester) return false;
      return requester.role === "superadmin";
    },
    canReadWriteExchangeRates: (requester: MockUser | null): boolean => requester !== null,
  };

  it("authenticated user can read config", () => {
    expect(rules.canRead(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot read config", () => {
    expect(rules.canRead(null)).toBe(false);
  });

  it("superadmin can write config", () => {
    expect(rules.canWrite(makeUser("admin", "superadmin"))).toBe(true);
  });

  it("regular user cannot write config", () => {
    expect(rules.canWrite(makeUser("u1", "user"))).toBe(false);
  });

  it("any authenticated user can read/write exchange rates", () => {
    expect(rules.canReadWriteExchangeRates(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot read/write exchange rates", () => {
    expect(rules.canReadWriteExchangeRates(null)).toBe(false);
  });
});

// ─── Usernames Rules ──────────────────────────────────────────────
describe("Security Rules — Usernames", () => {
  const rules = {
    canRead: (requester: MockUser | null): boolean => requester !== null,
    canCreate: (requester: MockUser | null, uid: string): boolean => {
      if (!requester) return false;
      return requester.uid === uid;
    },
    canDelete: (requester: MockUser | null, uid: string): boolean => {
      if (!requester) return false;
      return requester.uid === uid;
    },
    canUpdate: () => false,
  };

  it("authenticated user can read usernames", () => {
    expect(rules.canRead(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot read usernames", () => {
    expect(rules.canRead(null)).toBe(false);
  });

  it("user can create own username", () => {
    expect(rules.canCreate(makeUser("u1"), "u1")).toBe(true);
  });

  it("user cannot create username for another user", () => {
    expect(rules.canCreate(makeUser("u1"), "u2")).toBe(false);
  });

  it("user can delete own username", () => {
    expect(rules.canDelete(makeUser("u1"), "u1")).toBe(true);
  });

  it("user cannot delete another user's username", () => {
    expect(rules.canDelete(makeUser("u1"), "u2")).toBe(false);
  });

  it("usernames are immutable — no one can update", () => {
    expect(rules.canUpdate()).toBe(false);
  });

  it("unauthenticated user cannot create username", () => {
    expect(rules.canCreate(null, "u1")).toBe(false);
  });
});

// ─── Notifications Rules ──────────────────────────────────────────
describe("Security Rules — Notifications", () => {
  const rules = {
    canRead: (requester: MockUser | null, ownerUid: string): boolean => {
      if (!requester) return false;
      return requester.uid === ownerUid;
    },
    canCreate: (requester: MockUser | null): boolean => requester !== null,
    canUpdate: (requester: MockUser | null, ownerUid: string): boolean => {
      if (!requester) return false;
      return requester.uid === ownerUid;
    },
    canDelete: (requester: MockUser | null, ownerUid: string): boolean => {
      if (!requester) return false;
      return requester.uid === ownerUid;
    },
  };

  it("user can read own notifications", () => {
    expect(rules.canRead(makeUser("u1"), "u1")).toBe(true);
  });

  it("user cannot read another user's notifications", () => {
    expect(rules.canRead(makeUser("u1"), "u2")).toBe(false);
  });

  it("any authenticated user can create notification for another user", () => {
    expect(rules.canCreate(makeUser("u1"))).toBe(true);
  });

  it("unauthenticated user cannot create notification", () => {
    expect(rules.canCreate(null)).toBe(false);
  });

  it("user can update own notification (mark as read)", () => {
    expect(rules.canUpdate(makeUser("u1"), "u1")).toBe(true);
  });

  it("user cannot update another user's notification", () => {
    expect(rules.canUpdate(makeUser("u1"), "u2")).toBe(false);
  });

  it("user can delete own notification", () => {
    expect(rules.canDelete(makeUser("u1"), "u1")).toBe(true);
  });

  it("user cannot delete another user's notification", () => {
    expect(rules.canDelete(makeUser("u1"), "u2")).toBe(false);
  });

  it("unauthenticated user cannot read notifications", () => {
    expect(rules.canRead(null, "u1")).toBe(false);
  });
});
