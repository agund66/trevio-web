import {
  doc,
  collection,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  collectionGroup,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { GroupService, GroupInfo } from "../interfaces/group-service";
import type { Group, GroupTemplate, Activity } from "../../types";
import { generateInviteCode } from "../../utils/calculations";

export class FirebaseGroupService implements GroupService {
  async createGroup(name: string, description: string, template: GroupTemplate, memberUids: string[]): Promise<{ groupId: string; inviteCode: string }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!name || name.trim().length === 0) throw new Error("Group name is required");

    const userDoc = await getDoc(doc(db, "users", uid));
    const userCurrency = userDoc.data()?.defaultCurrency || "INR";

    const now = new Date();
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
    if (memberDoc.exists()) throw new Error("You are already a member of this group");

    const now = new Date();
    const batch = writeBatch(db);
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

    const now = new Date();
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
    const now = new Date();

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

    await updateDoc(doc(db, "invitations", invitationId), { status: "declined" });
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

    const now = new Date();
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
        createdAt: data.createdAt as Activity["createdAt"],
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

    await updateDoc(groupRef, { archived: true, updatedAt: new Date() });
  }

  async unarchiveGroup(groupId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    await updateDoc(groupRef, { archived: false, updatedAt: new Date() });
  }
}
