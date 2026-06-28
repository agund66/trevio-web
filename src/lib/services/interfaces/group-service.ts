import type { Group, GroupTemplate } from "../../types";

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
}

export interface GroupService {
  createGroup(name: string, description: string, template: GroupTemplate, currency: string, memberUids: string[]): Promise<{ groupId: string; inviteCode: string }>;
  joinGroupViaCode(inviteCode: string): Promise<{ groupId: string; groupName: string }>;
  sendGroupInvitation(groupId: string, username: string): Promise<void>;
  acceptInvitation(invitationId: string): Promise<{ groupId: string; groupName: string }>;
  declineInvitation(invitationId: string): Promise<void>;
  leaveGroup(groupId: string): Promise<void>;
  getUserGroups(): Promise<Group[]>;
  getGroupInfo(groupId: string): Promise<GroupInfo>;
}
