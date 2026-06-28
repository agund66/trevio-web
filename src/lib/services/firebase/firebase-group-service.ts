import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import type { GroupService, GroupInfo } from "../interfaces/group-service";
import type { Group, GroupTemplate } from "../../types";

export class FirebaseGroupService implements GroupService {
  async createGroup(name: string, description: string, template: GroupTemplate, currency: string, memberUids: string[]): Promise<{ groupId: string; inviteCode: string }> {
    const fn = httpsCallable(functions, "createGroup");
    const result = await fn({ name, description, template, currency, memberUids });
    return result.data as { groupId: string; inviteCode: string };
  }

  async joinGroupViaCode(inviteCode: string): Promise<{ groupId: string; groupName: string }> {
    const fn = httpsCallable(functions, "joinGroupViaCode");
    const result = await fn({ inviteCode });
    return result.data as { groupId: string; groupName: string };
  }

  async sendGroupInvitation(groupId: string, username: string): Promise<void> {
    const fn = httpsCallable(functions, "sendGroupInvitation");
    await fn({ groupId, username });
  }

  async acceptInvitation(invitationId: string): Promise<{ groupId: string; groupName: string }> {
    const fn = httpsCallable(functions, "acceptInvitation");
    const result = await fn({ invitationId });
    return result.data as { groupId: string; groupName: string };
  }

  async declineInvitation(invitationId: string): Promise<void> {
    const fn = httpsCallable(functions, "declineInvitation");
    await fn({ invitationId });
  }

  async leaveGroup(groupId: string): Promise<void> {
    const fn = httpsCallable(functions, "leaveGroup");
    await fn({ groupId });
  }

  async getUserGroups(): Promise<Group[]> {
    const fn = httpsCallable(functions, "getUserGroups");
    const result = await fn();
    const data = result.data as { groups: Group[] };
    return data.groups || [];
  }

  async getGroupInfo(groupId: string): Promise<GroupInfo> {
    const fn = httpsCallable(functions, "getGroupInfo");
    const result = await fn({ groupId });
    return result.data as GroupInfo;
  }
}
