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
  startAfter,
  collectionGroup,
  writeBatch,
  increment,
  deleteField,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { GroupService, GroupInfo } from "../interfaces/group-service";
import type { Group, GroupTemplate, Activity, SplitEntry } from "../../types";
import { generateInviteCode, calculateBalances } from "../../utils/calculations";
import { toMillis } from "../../utils/date";
import { FIRESTORE_BATCH_LIMIT } from "../../constants/firestore";
import { DEFAULT_CURRENCY } from "../../constants/currency";

export class FirebaseGroupService implements GroupService {
  async createGroup(name: string, description: string, template: GroupTemplate, memberUids: string[], monthlyBudget?: number): Promise<{ groupId: string; inviteCode: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!name || name.trim().length === 0) throw new Error("Group name is required");

    const userDoc = await getDoc(doc(db, "users", uid));
    const userCurrency = userDoc.data()?.defaultCurrency || DEFAULT_CURRENCY;
    const displayName = userDoc.data()?.displayName || "";
    const username = userDoc.data()?.username || "";
    const photoURL = userDoc.data()?.photoURL || "";

    const now = Date.now();
    const inviteCode = generateInviteCode();
    const groupRef = doc(collection(db, "groups"));
    const groupId = groupRef.id;

    const groupData: Record<string, unknown> = {
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
    };
    if (template === "household" && monthlyBudget && monthlyBudget > 0) {
      groupData.monthlyBudget = monthlyBudget;
    }

    const batch = writeBatch(db);
    batch.set(groupRef, groupData);
    batch.set(doc(groupRef, "members", uid), {
      uid,
      displayName,
      username,
      photoURL,
      role: "admin",
      joinedAt: now,
      balance: 0,
      status: "active",
      isOffline: false,
      currency: userCurrency,
    });
    batch.set(doc(collection(groupRef, "activities")), {
      type: "group_created",
      description: "Group created",
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
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

    // Fetch user profile for denormalization onto member doc
    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const username = userDoc.data()?.username || "";
    const photoURL = userDoc.data()?.photoURL || "";
    const userCurrency = userDoc.data()?.defaultCurrency || groupData.currency || DEFAULT_CURRENCY;

    if (memberDoc.exists() && memberDoc.data()?.status === "pending") {
      batch.update(doc(groupDoc.ref, "members", uid), {
        status: "active",
        joinedAt: now,
        displayName,
        username,
        photoURL,
        isOffline: false,
        currency: userCurrency,
      });
    } else {
      batch.set(doc(groupDoc.ref, "members", uid), {
        uid,
        displayName,
        username,
        photoURL,
        role: "member",
        joinedAt: now,
        balance: 0,
        status: "active",
        isOffline: false,
        currency: userCurrency,
      });
      batch.update(groupDoc.ref, {
        memberCount: increment(1),
        updatedAt: now,
      });
    }
    batch.set(doc(collection(groupDoc.ref, "activities")), {
      type: "member_joined",
      description: "Member joined via invite code",
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
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
    if (groupData.archived === true) throw new Error("Cannot invite members to an archived group");

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
    const groupDoc = await getDoc(groupRef);
    const groupCurrency = (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY;
    const pendingMemberDoc = await getDoc(doc(groupRef, "members", toUid));
    if (!pendingMemberDoc.exists()) {
      // Fetch invitee's profile for denormalization
      const inviteeDoc = await getDoc(doc(db, "users", toUid));
      const inviteeName = inviteeDoc.data()?.displayName || "";
      const inviteeUsername = inviteeDoc.data()?.username || "";
      const inviteePhoto = inviteeDoc.data()?.photoURL || "";
      const inviteeCurrency = inviteeDoc.data()?.defaultCurrency || groupCurrency;
      await setDoc(doc(groupRef, "members", toUid), {
        uid: toUid,
        displayName: inviteeName,
        username: inviteeUsername,
        photoURL: inviteePhoto,
        role: "member",
        joinedAt: now,
        balance: 0,
        status: "pending",
        isOffline: false,
        currency: inviteeCurrency,
      });
      await updateDoc(groupRef, { memberCount: increment(1), updatedAt: now });
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

    // Fetch user profile for denormalization onto member doc
    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const username = userDoc.data()?.username || "";
    const photoURL = userDoc.data()?.photoURL || "";
    const userCurrency = userDoc.data()?.defaultCurrency || groupData.currency || DEFAULT_CURRENCY;

    const existingMemberDoc = await getDoc(doc(groupDoc.ref, "members", uid));
    if (existingMemberDoc.exists() && existingMemberDoc.data()?.status === "pending") {
      batch.update(doc(groupDoc.ref, "members", uid), {
        status: "active",
        joinedAt: now,
        displayName,
        username,
        photoURL,
        isOffline: false,
        currency: userCurrency,
      });
    } else {
      batch.set(doc(groupDoc.ref, "members", uid), {
        uid,
        displayName,
        username,
        photoURL,
        role: "member",
        joinedAt: now,
        balance: 0,
        status: "active",
        isOffline: false,
        currency: userCurrency,
      });
      batch.update(groupDoc.ref, {
        memberCount: increment(1),
        updatedAt: now,
      });
    }
    batch.set(doc(collection(groupDoc.ref, "activities")), {
      type: "member_joined",
      description: "Member joined via invitation",
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
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
      batch.update(groupRef, { memberCount: increment(-1), updatedAt: Date.now() });
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
    const now = Date.now();

    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const photoURL = userDoc.data()?.photoURL || "";

    const batch = writeBatch(db);

    if (memberData.role === "admin") {
      const membersSnapshot = await getDocs(
        firestoreQuery(collection(groupDoc.ref, "members"), where("status", "==", "active"))
      );
      if (membersSnapshot.size <= 1) {
        throw new Error("Admin cannot leave. Transfer admin role or delete the group.");
      }
      // Auto-transfer admin role to the longest-joined active member
      const otherActiveMembers = membersSnapshot.docs
        .filter((d) => d.id !== uid)
        .sort((a, b) => (a.data().joinedAt as number) - (b.data().joinedAt as number));
      if (otherActiveMembers.length > 0) {
        const newAdmin = otherActiveMembers[0];
        batch.update(newAdmin.ref, { role: "admin", updatedAt: now });
      }
    }

    batch.update(memberDoc.ref, { status: "left", role: "member" });
    batch.update(groupDoc.ref, {
      memberCount: increment(-1),
      updatedAt: now,
    });
    batch.set(doc(collection(groupDoc.ref, "activities")), {
      type: "member_left",
      description: "Member left the group",
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
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
          name: (data.name as string) ?? "",
          description: (data.description as string) ?? "",
          template: (data.template as GroupTemplate) ?? "casual",
          currency: (data.currency as string) ?? "INR",
          createdBy: (data.createdBy as string) ?? "",
          inviteCode: (data.inviteCode as string) ?? "",
          memberCount: (data.memberCount as number) ?? 0,
          totalExpenses: data.totalExpenses as number,
          yourBalance: memberData.balance as number ?? 0,
          yourRole: memberData.role as string ?? "member",
          archived: (data.archived as boolean) ?? false,
          monthlyBudget: (data.monthlyBudget as number) ?? undefined,
          budgetCategories: (data.budgetCategories as Record<string, number>) ?? undefined,
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
      name: (data.name as string) ?? "",
      description: (data.description as string) ?? "",
      template: (data.template as GroupTemplate) ?? "casual",
      currency: (data.currency as string) ?? "INR",
      inviteCode: (data.inviteCode as string) ?? "",
      createdBy: (data.createdBy as string) ?? "",
      memberCount: (data.memberCount as number) ?? 0,
      totalExpenses: (data.totalExpenses as number) ?? 0,
      archived: (data.archived as boolean) ?? false,
      monthlyBudget: (data.monthlyBudget as number) ?? undefined,
      budgetCategories: (data.budgetCategories as Record<string, number>) ?? undefined,
    };
  }

  async getGroupActivities(groupId: string, pageSize: number = 50, lastActivityId?: string): Promise<{ activities: Activity[]; hasMore: boolean; lastActivityId: string | null }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    let q = firestoreQuery(
      collection(groupRef, "activities"),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );

    if (lastActivityId) {
      const lastDoc = await getDoc(doc(groupRef, "activities", lastActivityId));
      if (lastDoc.exists()) {
        q = firestoreQuery(
          collection(groupRef, "activities"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }
    }

    const snapshot = await getDocs(q);

    const activities: Activity[] = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Record<string, unknown>;
      activities.push({
        activityId: docSnap.id,
        type: (data.type as string) ?? "unknown",
        description: (data.description as string) ?? "",
        userId: (data.userId as string) ?? "",
        userName: (data.userName as string) ?? "Someone",
        userPhotoURL: (data.userPhotoURL as string) ?? "",
        data: (data.data as Record<string, unknown>) ?? {},
        createdAt: toMillis(data.createdAt),
      });
    }
    return {
      activities,
      hasMore: snapshot.size === pageSize,
      lastActivityId: snapshot.size > 0 ? snapshot.docs[snapshot.size - 1].id : null,
    };
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

    const expensesSnapshot = await getDocs(collection(groupRef, "expenses"));
    const settlementsSnapshot = await getDocs(collection(groupRef, "settlements"));
    const activitiesSnapshot = await getDocs(collection(groupRef, "activities"));

    const allDocs = [
      ...membersSnapshot.docs.map((d) => d.ref),
      ...expensesSnapshot.docs.map((d) => d.ref),
      ...settlementsSnapshot.docs.map((d) => d.ref),
      ...activitiesSnapshot.docs.map((d) => d.ref),
      groupRef,
    ];

    for (let i = 0; i < allDocs.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = allDocs.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const ref of chunk) {
        batch.delete(ref);
      }
      await batch.commit();
    }
  }

  async updateGroup(groupId: string, name: string, description: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");
    if (!name || name.trim().length === 0) throw new Error("Group name is required");

    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");
    if (groupDoc.data()?.archived === true) throw new Error("Cannot edit settings of an archived group");

    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");
    if (memberDoc.data()?.role !== "admin") throw new Error("Only group admin can update group settings");

    await updateDoc(groupRef, {
      name: name.trim(),
      description: description?.trim() ?? "",
      updatedAt: Date.now(),
    });
  }

  async updateGroupBudget(groupId: string, monthlyBudget: number | null, budgetCategories: Record<string, number> | null): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");
    if (groupDoc.data()?.archived === true) throw new Error("Cannot edit settings of an archived group");

    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");
    if (memberDoc.data()?.role !== "admin") throw new Error("Only group admin can update budget settings");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    // Only set monthlyBudget if it's > 0, otherwise clear it
    if (monthlyBudget !== null && monthlyBudget > 0) {
      updates.monthlyBudget = monthlyBudget;
    } else {
      updates.monthlyBudget = deleteField();
    }
    // Only set budgetCategories if it's non-empty, otherwise clear it
    if (budgetCategories !== null && Object.keys(budgetCategories).length > 0) {
      updates.budgetCategories = budgetCategories;
    } else {
      updates.budgetCategories = deleteField();
    }

    await updateDoc(groupRef, updates);
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

    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const photoURL = userDoc.data()?.photoURL || "";

    const batch = writeBatch(db);
    batch.update(doc(groupRef, "members", uid), { role: "member", updatedAt: now });
    batch.update(doc(groupRef, "members", newAdminUid), { role: "admin", updatedAt: now });
    batch.set(doc(collection(groupRef, "activities")), {
      type: "admin_transferred",
      description: "Admin role transferred",
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
      data: { newAdminUid },
      createdAt: now,
    });
    await batch.commit();
  }

  async updateMemberRole(groupId: string, memberUid: string, role: "admin" | "member"): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId || !memberUid) throw new Error("Group ID and member UID are required");
    if (role !== "admin" && role !== "member") throw new Error("Invalid role");

    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    const currentMemberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!currentMemberDoc.exists()) throw new Error("You are not a member of this group");
    if (currentMemberDoc.data()?.role !== "admin") throw new Error("Only group admin can change member roles");

    const targetMemberDoc = await getDoc(doc(groupRef, "members", memberUid));
    if (!targetMemberDoc.exists()) throw new Error("Target user is not a member of this group");
    if (targetMemberDoc.data()?.status !== "active") throw new Error("Target user is not an active member");
    if (targetMemberDoc.data()?.role === role) throw new Error(`Member is already ${role}`);

    const now = Date.now();
    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const photoURL = userDoc.data()?.photoURL || "";
    const targetName = targetMemberDoc.data()?.displayName || "Someone";

    const batch = writeBatch(db);
    batch.update(doc(groupRef, "members", memberUid), { role, updatedAt: now });
    batch.set(doc(collection(groupRef, "activities")), {
      type: role === "admin" ? "member_role_updated" : "member_role_updated",
      description: role === "admin" ? `${targetName} is now an admin` : `${targetName} is now a member`,
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
      data: { memberUid, newRole: role },
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

    if (groupDoc.data()?.archived === true) {
      throw new Error("Cannot add members to an archived group");
    }

    const callerMemberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!callerMemberDoc.exists() || callerMemberDoc.data()?.status !== "active") {
      throw new Error("You are not a member of this group");
    }

    const now = Date.now();
    const memberRef = doc(collection(groupRef, "members"));

    const userDoc = await getDoc(doc(db, "users", uid));
    const creatorDisplayName = userDoc.data()?.displayName || "";
    const creatorPhotoURL = userDoc.data()?.photoURL || "";

    const batch = writeBatch(db);
    batch.set(memberRef, {
      uid: "",
      displayName: displayName.trim(),
      role: "member",
      joinedAt: now,
      balance: 0,
      status: "active",
      isOffline: true,
      currency: (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY,
      addedBy: uid,
    });
    batch.update(groupRef, {
      memberCount: increment(1),
      updatedAt: now,
    });
    batch.set(doc(collection(groupRef, "activities")), {
      type: "member_added",
      description: `Added offline member "${displayName.trim()}"`,
      userId: uid,
      userName: creatorDisplayName,
      userPhotoURL: creatorPhotoURL,
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
    const groupDoc = await getDoc(groupRef);
    const groupCurrency = (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY;
    const memberDoc = await getDoc(doc(groupRef, "members", memberDocId));
    if (!memberDoc.exists()) throw new Error("Member not found");
    if (memberDoc.data()?.isOffline !== true) throw new Error("This member is not an offline profile");

    const existingMemberDoc = await getDoc(doc(groupRef, "members", uid));

    const memberData = memberDoc.data() as Record<string, unknown>;
    const now = Date.now();

    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const username = userDoc.data()?.username || "";
    const photoURL = userDoc.data()?.photoURL || "";
    const userCurrency = userDoc.data()?.defaultCurrency || groupCurrency;

    const batch = writeBatch(db);

    if (existingMemberDoc.exists()) {
      // User already has a member doc (e.g. joined via invite code)
      // Keep existing doc, just delete the offline profile doc
      batch.delete(doc(groupRef, "members", memberDocId));
      batch.update(doc(groupRef, "members", uid), { currency: userCurrency, updatedAt: now });
      batch.update(groupRef, { memberCount: increment(-1), updatedAt: now });
    } else {
      // No existing doc — create one with offline member's data
      // but denormalize the claiming user's username/photoURL
      const claimedData = { ...memberData, uid, username, photoURL, currency: userCurrency, isOffline: false, claimedAt: now, claimedBy: uid };
      batch.set(doc(groupRef, "members", uid), claimedData);
      batch.delete(doc(groupRef, "members", memberDocId));
    }
    batch.set(doc(collection(groupRef, "activities")), {
      type: "member_claimed",
      description: "Member claimed offline profile",
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
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
    const groupDoc = await getDoc(groupRef);
    const groupCurrency = (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY;
    const adminDoc = await getDoc(doc(groupRef, "members", uid));
    if (adminDoc.data()?.role !== "admin") throw new Error("Only admins can link members");

    const memberDoc = await getDoc(doc(groupRef, "members", memberDocId));
    if (!memberDoc.exists()) throw new Error("Member not found");
    if (memberDoc.data()?.isOffline !== true) throw new Error("This member is not an offline profile");

    const existingMemberDoc = await getDoc(doc(groupRef, "members", realUid));

    const memberData = memberDoc.data() as Record<string, unknown>;
    const now = Date.now();

    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const photoURL = userDoc.data()?.photoURL || "";
    // Fetch target user's profile for denormalization on the linked member doc
    const targetUserDoc = await getDoc(doc(db, "users", realUid));
    const targetUsername = targetUserDoc.data()?.username || "";
    const targetPhotoURL = targetUserDoc.data()?.photoURL || "";
    const targetCurrency = targetUserDoc.data()?.defaultCurrency || groupCurrency;

    const batch = writeBatch(db);

    if (existingMemberDoc.exists()) {
      // Target user already has a member doc (e.g. joined via invite code)
      // Keep existing doc, just delete the offline profile doc
      batch.delete(doc(groupRef, "members", memberDocId));
      batch.update(doc(groupRef, "members", realUid), { currency: targetCurrency, updatedAt: now });
      batch.update(groupRef, { memberCount: increment(-1), updatedAt: now });
    } else {
      // No existing doc — create one with offline member's data
      // but denormalize the target user's username/photoURL
      const linkedData = { ...memberData, uid: realUid, username: targetUsername, photoURL: targetPhotoURL, currency: targetCurrency, isOffline: false, claimedAt: now, claimedBy: uid };
      batch.set(doc(groupRef, "members", realUid), linkedData);
      batch.delete(doc(groupRef, "members", memberDocId));
    }
    batch.set(doc(collection(groupRef, "activities")), {
      type: "member_linked",
      description: "Admin linked offline profile to user",
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
      data: { groupId, memberDocId, linkedUid: realUid },
      createdAt: now,
    });
    await batch.commit();

    await this.migrateMemberReferences(groupId, memberDocId, realUid);
    await this.recalculateBalances(groupId);
  }

  async removeMember(groupId: string, memberUid: string): Promise<void> {
    const callerUid = auth.currentUser?.uid;
    if (!callerUid) throw new Error("User not authenticated");
    if (callerUid === memberUid) throw new Error("Use leave group to remove yourself");

    const groupRef = doc(db, "groups", groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    if (groupDoc.data()?.archived === true) {
      throw new Error("Cannot remove members from an archived group");
    }

    const callerDoc = await getDoc(doc(groupRef, "members", callerUid));
    if (!callerDoc.exists() || callerDoc.data()?.role !== "admin") {
      throw new Error("Only admins can remove members");
    }

    const memberDoc = await getDoc(doc(groupRef, "members", memberUid));
    if (!memberDoc.exists()) throw new Error("Member not found");
    const memberData = memberDoc.data() as Record<string, unknown>;
    if (memberData.role === "admin") throw new Error("Cannot remove another admin");

    // Check if member has any expenses
    const expensesQuery = firestoreQuery(collection(groupRef, "expenses"), where("paidBy", "==", memberUid), limit(1));
    const expensesSnapshot = await getDocs(expensesQuery);
    const hasExpenses = !expensesSnapshot.empty;

    const now = Date.now();

    const userDoc = await getDoc(doc(db, "users", callerUid));
    const displayName = userDoc.data()?.displayName || "";
    const photoURL = userDoc.data()?.photoURL || "";

    const batch = writeBatch(db);

    if (hasExpenses) {
      // Convert to offline member to preserve transaction history
      batch.update(doc(groupRef, "members", memberUid), {
        uid: "",
        isOffline: true,
        currency: (groupDoc.data()?.currency as string) || DEFAULT_CURRENCY,
        status: "removed",
        updatedAt: now,
      });
    } else {
      // No expenses, safe to fully remove
      batch.delete(doc(groupRef, "members", memberUid));
      batch.update(groupRef, {
        memberCount: increment(-1),
        updatedAt: now,
      });
    }

    batch.set(doc(collection(groupRef, "activities")), {
      type: "member_removed",
      description: `Removed member "${memberData.displayName}"`,
      userId: callerUid,
      userName: displayName,
      userPhotoURL: photoURL,
      data: { removedUid: memberUid, memberName: memberData.displayName, convertedToOffline: hasExpenses },
      createdAt: now,
    });

    await batch.commit();
  }

  private async migrateMemberReferences(groupId: string, oldId: string, newId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);
    const ops: { ref: ReturnType<typeof doc>; updates: Record<string, unknown> }[] = [];

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

      if (changed) ops.push({ ref: expenseDoc.ref, updates });
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

      if (changed) ops.push({ ref: settlementDoc.ref, updates });
    }

    for (let i = 0; i < ops.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = ops.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const op of chunk) batch.update(op.ref, op.updates);
      await batch.commit();
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
        amountInGroupCurrency: (data.amountInGroupCurrency as number) ?? ((data.amount as number) || 0),
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

    const balanceEntries = Array.from(balances.entries());

    for (let i = 0; i < balanceEntries.length; i += FIRESTORE_BATCH_LIMIT) {
      const chunk = balanceEntries.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = writeBatch(db);
      for (const [memberUid, balance] of chunk) {
        batch.update(doc(groupRef, "members", memberUid), {
          balance: Math.round(balance * 100) / 100,
        });
      }
      await batch.commit();
    }
  }
}
