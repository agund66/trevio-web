import { httpsCallable } from "firebase/functions";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db, functions } from "../../firebase";
import type { UserService } from "../interfaces/user-service";
import type { User, UserSearchResult } from "../../types";

export class FirebaseUserService implements UserService {
  async getUser(uid: string): Promise<User> {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) throw new Error("User not found");
    const data = userDoc.data();
    return {
      uid,
      email: data.email || "",
      displayName: data.displayName || "",
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      username: data.username || "",
      photoURL: data.photoURL || "",
      defaultCurrency: data.defaultCurrency || "INR",
      acceptedTnC: data.acceptedTnC || false,
      upiId: data.upiId || "",
    };
  }

  async updateUser(user: User): Promise<void> {
    await updateDoc(doc(db, "users", user.uid), {
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
      photoURL: user.photoURL,
      defaultCurrency: user.defaultCurrency,
      upiId: user.upiId,
      updatedAt: new Date(),
    });
  }

  async acceptTnC(): Promise<string> {
    const fn = httpsCallable(functions, "acceptTnC");
    const result = await fn();
    const data = result.data as { username?: string };
    return data.username || "";
  }

  async checkUsernameAvailability(username: string): Promise<{ available: boolean; suggestedUsername: string }> {
    const fn = httpsCallable(functions, "checkUsernameAvailability");
    const result = await fn({ username });
    return result.data as { available: boolean; suggestedUsername: string };
  }

  async updateUsername(username: string): Promise<string> {
    const fn = httpsCallable(functions, "updateUsername");
    const result = await fn({ username });
    const data = result.data as { username: string };
    return data.username;
  }

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    const fn = httpsCallable(functions, "searchUsers");
    const result = await fn({ query });
    const data = result.data as { users: UserSearchResult[] };
    return data.users || [];
  }

  async updateFcmToken(token: string): Promise<void> {
    const fn = httpsCallable(functions, "updateFcmToken");
    await fn({ token });
  }
}
