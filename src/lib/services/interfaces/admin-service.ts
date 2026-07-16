import type { User } from "../../types";

export interface AdminService {
  getAllUsers(): Promise<User[]>;
  blockUser(uid: string): Promise<void>;
  unblockUser(uid: string): Promise<void>;
  promoteToSuperAdmin(uid: string): Promise<void>;
  demoteToUser(uid: string): Promise<void>;
}
