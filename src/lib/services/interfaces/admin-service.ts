import type { User } from "../../types";

export interface AdminService {
  getAllUsers(pageSize?: number, lastUserUid?: string): Promise<{ users: User[]; hasMore: boolean; lastUserUid: string | null }>;
  blockUser(uid: string): Promise<void>;
  unblockUser(uid: string): Promise<void>;
  promoteToSuperAdmin(uid: string): Promise<void>;
  demoteToUser(uid: string): Promise<void>;
}
