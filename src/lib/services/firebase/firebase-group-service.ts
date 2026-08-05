import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  collectionGroup,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { GroupService, GroupInfo } from "../interfaces/group-service";
import type { Group, GroupTemplate, Activity, SplitEntry } from "../../types";
import { generateInviteCode, calculateBalances } from "../../utils/calculations";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === "object") {
    const seconds = (value as { _seconds?: number; seconds?: number })._seconds ?? (value as { seconds?: number }).seconds;
    const nanoseconds = (value as { _nanoseconds?: number; nanoseconds?: number })._nanoseconds ?? (value as { nanoseconds?: number }).nanoseconds;
    if (typeof seconds === "number") return seconds * 1000 + (typeof nanoseconds === "number" ? nanoseconds / 1_000_000 : 0);
  }
  return 0;
}

export class FirebaseGroupService implements GroupService {
  async createGroup(name: string, description: string, template: GroupTemplate, memberUids: string[]): Promise<{ groupId: string; inviteCode: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!name || name.trim().length === 0) throw new Error("Group name is required");

    const userDoc = await getDoc(doc(db, "users", uid));
    const userCurrency = userDoc.data()?.defaultCurrency || "INR";

    const now = Date.now();
    const inviteCode = generateInviteCode();
    const groupRef = doc(collection(db, "groups"));
    const groupId = groupRef.id;

    const batch = writeBatch(db);
    batch.set(groupRef, {
      name: name.trim(),
      description: description?.trim() ?? "",
      template,
      currency: userCurrency,
      createdBy: uid,
      inviteCode,
      memberCount: 1,
      totalExpenses: 0,
      createdAt: now,
      updatedAt: now,
    });
    batch.set(doc(groupRef, "members", uid), {
      uid,
      role: "admin",
      joinedAt: now,
      balance: 0,
      status: "active",
    });
    batch.set(doc(collection(groupRef, "activities")), {
      type: "group_created",
      description: "Group created",
      userId: uid,
      data: { groupName: name.trim() },
      createdAt: now,
    });
    await batch.commit();

    if (memberUids.length > 0) {
      for (const memberUid of memberUids) {
        if (memberUid !== uid) {
          await this.sendInvitationInternal(uid, memberUid, groupId, name.trim(), inviteCode);
        }
      }
    }

    return { groupId, inviteCode };
  }

  async joinGroupViaCode(inviteCode: string): Promise<{ groupId: string; groupName: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!inviteCode) throw new Error("Invite code is required");

    const snapshot = await getDocs(
      firestoreQuery(collection(db, "groups"), where("inviteCode", "==", inviteCode.toUpperCase()), limit(1))
    );
    if (snapshot.empty) throw new Error("Invalid invite code");

    const groupDoc = snapshot.docs[0];
    const groupId = groupDoc.id;
    const groupData = groupDoc.data() as Record<string, unknown>;

    const memberDoc = await getDoc(doc(groupDoc.ref, "members", uid));
    if (memberDoc.exists() && memberDoc.data()?.status === "active" && memberDoc.data()?.isOffline !== true) {
      throw new Error("You are already a member of this group");
    }

    const now = Date.now();
    const batch = writeBatch(db);

    if (memberDoc.exists() && memberDoc.data()?.status === "pending") {
      batch.update(doc(groupDoc.ref, "members", uid), { status: "active", joinedAt: now });
    } else {
      batch.set(doc(groupDoc.ref, "members", uid), {
        uid,
        role: "member",
        joinedAt: now,
        balance: 0,
        status: "active",
      });
      batch.update(groupDoc.ref, {
        memberCount: (groupData.memberCount as number ?? 0) + 1,
        updatedAt: now,
      });
    }
    batch.set(doc(collection(groupDoc.ref, "activities")), {
      type: "member_joined",
      description: "Member joined via invite code",
      userId: uid,
      data: { groupId },
      createdAt: now,
    });
    await batch.commit();

    return { groupId, groupName: groupData.name as string };
  }

  async sendGroupInvitation(groupId: string, username: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId || !username) throw new Error("Group ID and username are required");

    const normalized = username.toLowerCase().replace(/[^a-z0-9._]/g, "");
    const usernameDoc = await getDoc(doc(db, "usernames", normalized));
    if (!usernameDoc.exists()) throw new Error("User not found");

    const toUid = usernameDoc.data()?.uid as string;
    if (toUid === uid) throw new Error("You cannot invite yourself");
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) throw new Error("Group not found");

    const groupData = groupDoc.data() as Record<string, unknown>;
    const existingMember = await getDoc(doc(groupDoc.ref, "members", toUid));
    if (existingMember.exists()) throw new Error("User is already a member of this group");

    await this.sendInvitationInternal(uid, toUid, groupId, groupData.name as string, groupData.inviteCode as string);
  }

  private async sendInvitationInternal(
    invitedByUid: string,
    toUid: string,
    groupId: string,
    groupName: string,
    inviteCode: string
  ): Promise<void> {
    const inviterDoc = await getDoc(doc(db, "users", invitedByUid));
    const invitedByName = (inviterDoc.data()?.displayName as string) ?? "Someone";

    const now = Date.now();
    const inviteRef = doc(collection(db, "invitations"));
    await setDoc(inviteRef, {
      groupId,
      groupName,
      invitedByUid,
      invitedByName,
      toUid,
      inviteCode,
      status: "pending",
      createdAt: now,
    });

    const groupRef = doc(db, "groups", groupId);
    const pendingMemberDoc = await getDoc(doc(groupRef, "members", toUid));
    if (!pendingMemberDoc.exists()) {
      await setDoc(doc(groupRef, "members", toUid), {
        uid: toUid,
        role: "member",
        joinedAt: now,
        balance: 0,
        status: "pending",
      });
      const groupDoc = await getDoc(groupRef);
      const currentCount = (groupDoc.data()?.memberCount as number) ?? 1;
      await updateDoc(groupRef, { memberCount: currentCount + 1, updatedAt: now });
    }

    await setDoc(doc(collection(db, "users", toUid, "notifications")), {
      type: "invitation",
      title: "Group Invitation",
      body: `${invitedByName} invited you to join "${groupName}"`,
      data: { groupId, groupName, invitationId: inviteRef.id, type: "invitation" },
      read: false,
      createdAt: now,
    }).catch((err) => {
      console.warn("Failed to send invitation notification:", err);
    });
  }

  async acceptInvitation(invitationId: string): Promise<{ groupId: string; groupName: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!invitationId) throw new Error("Invitation ID is required");

    const inviteDoc = await getDoc(doc(db, "invitations", invitationId));
    if (!inviteDoc.exists()) throw new Error("Invitation not found");

    const inviteData = inviteDoc.data()!;
    if (inviteData.toUid !== uid) throw new Error("This invitation is not for you");
    if (inviteData.status !== "pending") throw new Error("Invitation is no longer pending");

    const groupId = inviteData.groupId as string;
    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) throw new Error("Group not found");

    const groupData = groupDoc.data() as Record<string, unknown>;
    const now = Date.now();

    const batch = writeBatch(db);
    batch.update(doc(db, "invitations", invitationId), { status: "accepted" });

    const existingMemberDoc = await getDoc(doc(groupDoc.ref, "members", uid));
    if (existingMemberDoc.exists() && existingMemberDoc.data()?.status === "pending") {
      batch.update(doc(groupDoc.ref, "members", uid), { status: "active", joinedAt: now });
    } else {
      batch.set(doc(groupDoc.ref, "members", uid), {
        uid, role: "member", joinedAt: now, balance: 0, status: "active",
      });
      batch.update(groupDoc.ref, {
        memberCount: (groupData.memberCount as number ?? 0) + 1,
        updatedAt: now,
      });
    }
    batch.set(doc(collection(groupDoc.ref, "activities")), {
      type: "member_joined",
      description: "Member joined via invitation",
      userId: uid,
      data: { groupId, invitationId },
      createdAt: now,
    });
    await batch.commit();

    return { groupId, groupName: groupData.name as string };
  }

  async declineInvitation(invitationId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!invitationId) throw new Error("Invitation ID is required");

    const inviteDoc = await getDoc(doc(db, "invitations", invitationId));
    if (!inviteDoc.exists()) throw new Error("Invitation not found");

    const inviteData = inviteDoc.data()!;
    if (inviteData.toUid !== uid) throw new Error("This invitation is not for you");
    if (inviteData.status !== "pending") throw new Error("Invitation is no longer pending");

    const groupId = inviteData.groupId as string;
    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));

    const batch = writeBatch(db);
    batch.update(doc(db, "invitations", invitationId), { status: "declined" });

    if (memberDoc.exists() && memberDoc.data()?.status === "pending") {
      batch.delete(memberDoc.ref);
      const groupDoc = await getDoc(groupRef);
      const currentCount = (groupDoc.data()?.memberCount as number) ?? 1;
      batch.update(groupRef, { memberCount: Math.max(0, currentCount - 1), updatedAt: Date.now() });
    }

    await batch.commit();
  }

  async leaveGroup(groupId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) throw new Error("Group not found");

    const memberDoc = await getDoc(doc(groupDoc.ref, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const memberData = memberDoc.data()!;
    if (memberData.role === "admin") {
      const membersSnapshot = await getDocs(
        firestoreQuery(collection(groupDoc.ref, "members"), where("status", "==", "active"))
      );
      if (membersSnapshot.size <= 1) {
        throw new Error("Admin cannot leave. Transfer admin role or delete the group.");
      }
    }

    const now = Date.now();
    const batch = writeBatch(db);
    batch.update(memberDoc.ref, { status: "left" });
    batch.update(groupDoc.ref, {
      memberCount: (groupDoc.data()?.memberCount as number ?? 1) - 1,
      updatedAt: now,
    });
    batch.set(doc(collection(groupDoc.ref, "activities")), {
      type: "member_left",
      description: "Member left the group",
      userId: uid,
      data: { groupId },
      createdAt: now,
    });
    await batch.commit();
  }

  async getUserGroups(): Promise<Group[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const groupsSnapshot = await getDocs(
      firestoreQuery(
        collectionGroup(db, "members"),
        where("uid", "==", uid),
        where("status", "==", "active")
      )
    );

    if (groupsSnapshot.empty) return [];

    // Batch-fetch all group docs in parallel to avoid N+1 sequential reads
    const groupDocs = await Promise.all(
      groupsSnapshot.docs.map((memberDoc) => {
        const pathSegments = memberDoc.ref.path.split("/");
        const groupId = pathSegments[1];
        return getDoc(doc(db, "groups", groupId));
      })
    );

    const groups: Group[] = [];
    groupDocs.forEach((groupDoc, index) => {
      if (groupDoc.exists()) {
        const data = groupDoc.data() as Record<string, unknown>;
        const memberData = groupsSnapshot.docs[index].data() as Record<string, unknown>;
        groups.push({
          groupId: groupDoc.id,
          name: data.name as string,
          description: data.description as string,
          template: data.template as GroupTemplate,
          currency: data.currency as string,
          createdBy: data.createdBy as string,
          inviteCode: data.inviteCode as string,
          memberCount: data.memberCount as number,
          totalExpenses: data.totalExpenses as number,
          yourBalance: memberData.balance as number ?? 0,
          yourRole: memberData.role as string ?? "member",
          archived: (data.archived as boolean) ?? false,
        });
      }
    });
    return groups;
  }

  async getGroupInfo(groupId: string): Promise<GroupInfo> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupDoc = await getDoc(doc(db, "groups", groupId));
    if (!groupDoc.exists()) throw new Error("Group not found");

    const memberDoc = await getDoc(doc(groupDoc.ref, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const data = groupDoc.data() as Record<string, unknown>;
    return {
      groupId,
      name: data.name as string,
      description: data.description as string,
      template: data.template as GroupTemplate,
      currency: data.currency as string,
      inviteCode: data.inviteCode as string,
      createdBy: data.createdBy as string,
      memberCount: data.memberCount as number,
      totalExpenses: data.totalExpenses as number,
      archived: (data.archived as boolean) ?? false,
    };
  }

  async getGroupActivities(groupId: string, pageSize: number = 50): Promise<Activity[]> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const snapshot = await getDocs(
      firestoreQuery(
        collection(groupRef, "activities"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      )
    );

    const activities: Activity[] = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      const userDoc = await getDoc(doc(db, "users", data.userId as string));
      const userData = userDoc.data() as Record<string, unknown> | undefined;
      activities.push({
        activityId: docSnap.id,
        type: (data.type as string) ?? "unknown",
        description: (data.description as string) ?? "",
        userId: (data.userId as string) ?? "",
        userName: (userData?.displayName as string) ?? "Someone",
        userPhotoURL: (userData?.photoURL as string) ?? "",
        data: (data.data as Record<string, unknown>) ?? {},
        createdAt: toMillis(data.createdAt),
      });
    }
    return activities;
  }

  async archiveGroup(groupId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");
    if (memberDoc.data()?.role !== "admin") throw new Error("Only group admin can archive the group");

    await updateDoc(groupRef, { archived: true, updatedAt: Date.now() });
  }

  async unarchiveGroup(groupId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");
    if (memberDoc.data()?.role !== "admin") throw new Error("Only group admin can unarchive the group");

    await updateDoc(groupRef, { archived: false, updatedAt: Date.now() });
  }

  async deleteGroup(groupId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");
    if (memberDoc.data()?.role !== "admin") throw new Error("Only group admin can delete the group");

    const membersSnapshot = await getDocs(collection(groupRef, "members"));
    const activeMembers = membersSnapshot.docs.filter((d) => d.data()?.status === "active");
    if (activeMembers.length > 1) {
      throw new Error("Cannot delete group with other active members. Remove all members first.");
    }

    const batch = writeBatch(db);
    for (const memberDoc of membersSnapshot.docs) {
      batch.delete(memberDoc.ref);
    }

    const expensesSnapshot = await getDocs(collection(groupRef, "expenses"));
    for (const expDoc of expensesSnapshot.docs) {
      batch.delete(expDoc.ref);
    }

    const settlementsSnapshot = await getDocs(collection(groupRef, "settlements"));
    for (const setDoc of settlementsSnapshot.docs) {
      batch.delete(setDoc.ref);
    }

    const activitiesSnapshot = await getDocs(collection(groupRef, "activities"));
    for (const actDoc of activitiesSnapshot.docs) {
      batch.delete(actDoc.ref);
    }

    batch.delete(groupRef);
    await batch.commit();
  }

  async updateGroup(groupId: string, name: string, description: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");
    if (!name || name.trim().length === 0) throw new Error("Group name is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");
    if (memberDoc.data()?.role !== "admin") throw new Error("Only group admin can update group settings");

    await updateDoc(groupRef, {
      name: name.trim(),
      description: description?.trim() ?? "",
      updatedAt: Date.now(),
    });
  }

  async transferAdminRole(groupId: string, newAdminUid: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId || !newAdminUid) throw new Error("Group ID and new admin UID are required");
    if (newAdminUid === uid) throw new Error("You are already the admin");

    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    const currentMemberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!currentMemberDoc.exists()) throw new Error("You are not a member of this group");
    if (currentMemberDoc.data()?.role !== "admin") throw new Error("Only group admin can transfer admin role");

    const targetMemberDoc = await getDoc(doc(groupRef, "members", newAdminUid));
    if (!targetMemberDoc.exists()) throw new Error("Target user is not a member of this group");
    if (targetMemberDoc.data()?.status !== "active") throw new Error("Target user is not an active member");

    const now = Date.now();
    const batch = writeBatch(db);
    batch.update(doc(groupRef, "members", uid), { role: "member", updatedAt: now });
    batch.update(doc(groupRef, "members", newAdminUid), { role: "admin", updatedAt: now });
    batch.set(doc(collection(groupRef, "activities")), {
      type: "admin_transferred",
      description: "Admin role transferred",
      userId: uid,
      data: { newAdminUid },
      createdAt: now,
    });
    await batch.commit();
  }

  async addOfflineMember(groupId: string, displayName: string): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!displayName || !displayName.trim()) throw new Error("Name is required");

    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    const callerMemberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!callerMemberDoc.exists() || callerMemberDoc.data()?.status !== "active") {
      throw new Error("You are not a member of this group");
    }

    const now = Date.now();
    const memberRef = doc(collection(groupRef, "members"));
    const batch = writeBatch(db);
    batch.set(memberRef, {
      uid: "",
      displayName: displayName.trim(),
      role: "member",
      joinedAt: now,
      balance: 0,
      status: "active",
      isOffline: true,
      addedBy: uid,
    });
    batch.update(groupRef, {
      memberCount: (groupDoc.data()?.memberCount as number ?? 0) + 1,
      updatedAt: now,
    });
    batch.set(doc(collection(groupRef, "activities")), {
      type: "member_added",
      description: `Added offline member "${displayName.trim()}"`,
      userId: uid,
      data: { groupId, memberName: displayName.trim() },
      createdAt: now,
    });
    await batch.commit();

    return memberRef.id;
  }

  async claimOfflineMember(groupId: string, memberDocId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", memberDocId));
    if (!memberDoc.exists()) throw new Error("Member not found");
    if (memberDoc.data()?.isOffline !== true) throw new Error("This member is not an offline profile");

    const existingMemberDoc = await getDoc(doc(groupRef, "members", uid));

    const memberData = memberDoc.data() as Record<string, unknown>;
    const now = Date.now();
    const batch = writeBatch(db);

    if (existingMemberDoc.exists()) {
      // User already has a member doc (e.g. joined via invite code)
      // Keep existing doc, just delete the offline profile doc
      batch.delete(doc(groupRef, "members", memberDocId));
      const groupDocForCount = await getDoc(groupRef);
      const currentCount = (groupDocForCount.data()?.memberCount as number) ?? 0;
      if (currentCount > 0) {
        batch.update(groupRef, { memberCount: currentCount - 1 });
      }
    } else {
      // No existing doc — create one with offline member's data
      const claimedData = { ...memberData, uid, isOffline: false, claimedAt: now, claimedBy: uid };
      batch.set(doc(groupRef, "members", uid), claimedData);
      batch.delete(doc(groupRef, "members", memberDocId));
    }
    batch.set(doc(collection(groupRef, "activities")), {
      type: "member_claimed",
      description: "Member claimed offline profile",
      userId: uid,
      data: { groupId, memberDocId },
      createdAt: now,
    });
    await batch.commit();

    await this.migrateMemberReferences(groupId, memberDocId, uid);
    await this.recalculateBalances(groupId);
  }

  async linkOfflineMember(groupId: string, memberDocId: string, realUid: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const groupRef = doc(db, "groups", groupId);
    const adminDoc = await getDoc(doc(groupRef, "members", uid));
    if (adminDoc.data()?.role !== "admin") throw new Error("Only admins can link members");

    const memberDoc = await getDoc(doc(groupRef, "members", memberDocId));
    if (!memberDoc.exists()) throw new Error("Member not found");
    if (memberDoc.data()?.isOffline !== true) throw new Error("This member is not an offline profile");

    const existingMemberDoc = await getDoc(doc(groupRef, "members", realUid));

    const memberData = memberDoc.data() as Record<string, unknown>;
    const now = Date.now();
    const batch = writeBatch(db);

    if (existingMemberDoc.exists()) {
      // Target user already has a member doc (e.g. joined via invite code)
      // Keep existing doc, just delete the offline profile doc
      batch.delete(doc(groupRef, "members", memberDocId));
      const groupDocForCount = await getDoc(groupRef);
      const currentCount = (groupDocForCount.data()?.memberCount as number) ?? 0;
      if (currentCount > 0) {
        batch.update(groupRef, { memberCount: currentCount - 1 });
      }
    } else {
      // No existing doc — create one with offline member's data
      const linkedData = { ...memberData, uid: realUid, isOffline: false, claimedAt: now, claimedBy: uid };
      batch.set(doc(groupRef, "members", realUid), linkedData);
      batch.delete(doc(groupRef, "members", memberDocId));
    }
    batch.set(doc(collection(groupRef, "activities")), {
      type: "member_linked",
      description: "Admin linked offline profile to user",
      userId: uid,
      data: { groupId, memberDocId, linkedUid: realUid },
      createdAt: now,
    });
    await batch.commit();

    await this.migrateMemberReferences(groupId, memberDocId, realUid);
    await this.recalculateBalances(groupId);
  }

  private async migrateMemberReferences(groupId: string, oldId: string, newId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);

    const expensesSnap = await getDocs(collection(groupRef, "expenses"));
    for (const expenseDoc of expensesSnap.docs) {
      const data = expenseDoc.data() as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      let changed = false;

      if (data.paidBy === oldId) {
        updates.paidBy = newId;
        changed = true;
      }

      const splits = data.splits as Record<string, unknown> | undefined;
      if (splits && splits[oldId]) {
        const newSplits = { ...splits };
        newSplits[newId] = newSplits[oldId];
        delete newSplits[oldId];
        updates.splits = newSplits;
        changed = true;
      }

      if (changed) await updateDoc(expenseDoc.ref, updates);
    }

    const settlementsSnap = await getDocs(collection(groupRef, "settlements"));
    for (const settlementDoc of settlementsSnap.docs) {
      const data = settlementDoc.data() as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      let changed = false;

      if (data.fromUid === oldId) {
        updates.fromUid = newId;
        changed = true;
      }
      if (data.toUid === oldId) {
        updates.toUid = newId;
        changed = true;
      }

      if (changed) await updateDoc(settlementDoc.ref, updates);
    }
  }

  private async recalculateBalances(groupId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);

    const [expensesSnapshot, settlementsSnapshot, membersSnapshot] = await Promise.all([
      getDocs(collection(groupRef, "expenses")),
      getDocs(collection(groupRef, "settlements")),
      getDocs(firestoreQuery(collection(groupRef, "members"), where("status", "==", "active"))),
    ]);

    const memberUids = membersSnapshot.docs.map((d) => d.id);

    const expenses = expensesSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        paidBy: data.paidBy as string,
        splits: data.splits as Record<string, SplitEntry>,
        amount: data.amount as number,
        exchangeRateToBase: (data.exchangeRateToBase as number) ?? 1,
      };
    });

    const settlements = settlementsSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        fromUid: data.fromUid as string,
        toUid: data.toUid as string,
        amount: data.amount as number,
      };
    });

    const balances = calculateBalances(expenses, settlements, memberUids);

    const batch = writeBatch(db);
    balances.forEach((balance, memberUid) => {
      batch.update(doc(groupRef, "members", memberUid), {
        balance: Math.round(balance * 100) / 100,
      });
    });
    await batch.commit();
  }
}
