import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query as firestoreQuery,
  where,
  getDocs,
  runTransaction,
} from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import type { UserService } from "../interfaces/user-service";
import type { User, UserSearchResult } from "../../types";
import { generateBaseUsername } from "../../utils/calculations";

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
      phoneNumber: data.phoneNumber || "",
      countryCode: data.countryCode || "",
    };
  }

  async updateUser(user: User): Promise<void> {
    await updateDoc(doc(db, "users", user.uid), {
      displayName: user.displayName || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      photoURL: user.photoURL || "",
      defaultCurrency: user.defaultCurrency || "INR",
      upiId: user.upiId || "",
      phoneNumber: user.phoneNumber || "",
      countryCode: user.countryCode || "",
      updatedAt: new Date(),
    });
  }

  async acceptTnC(): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    const existingData = userDoc.data();

    // If already accepted TnC AND has a username, return it
    if (existingData?.acceptedTnC && existingData?.username) {
      return existingData.username;
    }

    const now = new Date();

    // Set acceptedTnC if not already set
    if (!existingData?.acceptedTnC) {
      await setDoc(userDocRef, {
        acceptedTnC: true,
        acceptedTnCAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    // Check if username already exists (may have been set in a previous call)
    const latestDoc = await getDoc(userDocRef);
    const userData = latestDoc.data();
    if (userData?.username) {
      return userData.username;
    }

    // Generate username from user's name, falling back to email or uid
    const firstName = userData?.firstName || "";
    const lastName = userData?.lastName || "";
    const email = userData?.email || "";
    let baseUsername = generateBaseUsername(firstName, lastName);
    if (!baseUsername) {
      // Fall back to email prefix
      const emailPrefix = email.split("@")[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";
      baseUsername = emailPrefix || "user";
    }

    const finalUsername = await this.findUniqueUsername(baseUsername);

    // Use transaction to atomically create username doc and update user doc
    await runTransaction(db, async (transaction) => {
      const usernameDocRef = doc(db, "usernames", finalUsername);
      const existingUsername = await transaction.get(usernameDocRef);
      if (existingUsername.exists()) {
        // Race condition - someone took this username, try with suffix
        throw new Error("Username taken, retry needed");
      }
      transaction.set(usernameDocRef, { uid });
      transaction.update(userDocRef, { username: finalUsername, updatedAt: now });
    });

    return finalUsername;
  }

  private async findUniqueUsername(base: string): Promise<string> {
    let username = base;
    let suffix = 0;
    while (true) {
      const docSnap = await getDoc(doc(db, "usernames", username));
      if (!docSnap.exists()) return username;
      suffix++;
      username = `${base}${suffix}`;
    }
  }

  async checkUsernameAvailability(username: string): Promise<{ available: boolean; suggestedUsername: string }> {
    if (!username || username.length < 3) {
      return { available: false, suggestedUsername: "" };
    }
    const normalized = username.toLowerCase().replace(/[^a-z0-9._]/g, "");
    const docSnap = await getDoc(doc(db, "usernames", normalized));
    return { available: !docSnap.exists(), suggestedUsername: normalized };
  }

  async updateUsername(username: string): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!username || username.length < 3) throw new Error("Username must be at least 3 characters");

    const normalized = username.toLowerCase().replace(/[^a-z0-9._]/g, "");
    if (normalized.length < 3) throw new Error("Username must be at least 3 characters after normalization");

    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) throw new Error("User document not found");

    const currentUsername = userDoc.data()?.username;
    if (currentUsername === normalized) return normalized;

    const usernameDoc = await getDoc(doc(db, "usernames", normalized));
    if (usernameDoc.exists()) throw new Error("Username is already taken");

    await runTransaction(db, async (transaction) => {
      if (currentUsername) {
        transaction.delete(doc(db, "usernames", currentUsername));
      }
      transaction.set(doc(db, "usernames", normalized), { uid });
      transaction.update(userDocRef, {
        username: normalized,
        updatedAt: new Date(),
      });
    });

    return normalized;
  }

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    if (!query || query.length < 1) return [];

    const normalized = query.toLowerCase().replace(/[^a-z0-9._]/g, "");
    const q = firestoreQuery(
      collection(db, "users"),
      where("username", ">=", normalized),
      where("username", "<=", normalized + "\uf8ff")
    );
    const snapshot = await getDocs(q);
    const currentUid = auth.currentUser?.uid;

    return snapshot.docs
      .filter((d) => d.id !== currentUid)
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          uid: (data.uid as string) || d.id,
          username: (data.username as string) || "",
          displayName: (data.displayName as string) || "",
          photoURL: (data.photoURL as string) || "",
        };
      })
      .filter((u) => u.username.length > 0)
      .slice(0, 10);
  }

  async updateFcmToken(token: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    await updateDoc(doc(db, "users", uid), {
      fcmToken: token,
      updatedAt: new Date(),
    });
  }
}
