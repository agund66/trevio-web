import type { User, UserSearchResult } from "../../types";

export interface UserService {
  getUser(uid: string): Promise<User>;
  updateUser(user: User): Promise<void>;
  acceptTnC(): Promise<string>;
  checkUsernameAvailability(username: string): Promise<{ available: boolean; suggestedUsername: string }>;
  updateUsername(username: string): Promise<string>;
  searchUsers(query: string): Promise<UserSearchResult[]>;
  updateFcmToken(token: string): Promise<void>;
  deleteAccount(): Promise<void>;
}
