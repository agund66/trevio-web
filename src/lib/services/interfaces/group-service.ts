import type { Group, GroupTemplate, Activity } from "../../types";

export interface GroupInfo {
  groupId: string;
  name: string;
  description: string;
  template: GroupTemplate;
  currency: string;
  inviteCode: string;
  createdBy: string;
  memberCount: number;
  totalExpenses: number;
  archived: boolean;
  monthlyBudget?: number;
  budgetCategories?: Record<string, number>;
}

export interface GroupService {
  createGroup(name: string, description: string, template: GroupTemplate, memberUids: string[], monthlyBudget?: number): Promise<{ groupId: string; inviteCode: string }>;
  joinGroupViaCode(inviteCode: string): Promise<{ groupId: string; groupName: string }>;
  sendGroupInvitation(groupId: string, username: string): Promise<void>;
  acceptInvitation(invitationId: string): Promise<{ groupId: string; groupName: string }>;
  declineInvitation(invitationId: string): Promise<void>;
  leaveGroup(groupId: string): Promise<void>;
  archiveGroup(groupId: string): Promise<void>;
  unarchiveGroup(groupId: string): Promise<void>;
  deleteGroup(groupId: string): Promise<void>;
  updateGroup(groupId: string, name: string, description: string): Promise<void>;
  updateGroupBudget(groupId: string, monthlyBudget: number | null, budgetCategories: Record<string, number> | null): Promise<void>;
  transferAdminRole(groupId: string, newAdminUid: string): Promise<void>;
  updateMemberRole(groupId: string, memberUid: string, role: "admin" | "member"): Promise<void>;
  getUserGroups(): Promise<Group[]>;
  getGroupInfo(groupId: string): Promise<GroupInfo>;
  getGroupActivities(groupId: string, pageSize?: number, lastActivityId?: string): Promise<{ activities: Activity[]; hasMore: boolean; lastActivityId: string | null }>;
  addOfflineMember(groupId: string, displayName: string): Promise<string>;
  claimOfflineMember(groupId: string, memberDocId: string): Promise<void>;
  linkOfflineMember(groupId: string, memberDocId: string, realUid: string): Promise<void>;
  removeMember(groupId: string, memberUid: string): Promise<void>;
}
