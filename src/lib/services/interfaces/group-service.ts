import type { Group, GroupTemplate } from "../../types";

export interface GroupService {
  createGroup(name: string, description: string, template: GroupTemplate, currency: string, memberUids: string[]): Promise<{ groupId: string; inviteCode: string }>;
  joinGroupViaCode(inviteCode: string): Promise<{ groupId: string; groupName: string }>;
  sendGroupInvitation(groupId: string, username: string): Promise<void>;
  acceptInvitation(invitationId: string): Promise<{ groupId: string; groupName: string }>;
  declineInvitation(invitationId: string): Promise<void>;
  leaveGroup(groupId: string): Promise<void>;
  getUserGroups(): Promise<Group[]>;
}
