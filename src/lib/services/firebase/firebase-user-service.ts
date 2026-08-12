import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  collectionGroup,
  query as firestoreQuery,
  where,
  getDocs,
  limit,
  runTransaction,
  writeBatch,
  increment,
} from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";
import { deleteUser as firebaseDeleteUser } from "firebase/auth";
import type { UserService } from "../interfaces/user-service";
import type { User, UserSearchResult, UserRole } from "../../types";
import { generateBaseUsername } from "../../utils/calculations";
import { FIRESTORE_BATCH_LIMIT_MULTI_OP } from "../../constants/firestore";
import { DEFAULT_CURRENCY } from "../../constants/currency";

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
      defaultCurrency: data.defaultCurrency || DEFAULT_CURRENCY,
      acceptedTnC: data.acceptedTnC || false,
      role: (data.role as UserRole) || "user",
      blocked: data.blocked || false,
      upiId: data.upiId || "",
      phoneNumber: data.phoneNumber || "",
      countryCode: data.countryCode || "",
    };
  }

  async updateUser(user: User): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (uid !== user.uid) throw new Error("Cannot update another user's profile");
    await updateDoc(doc(db, "users", user.uid), {
      displayName: user.displayName || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      photoURL: user.photoURL || "",
      defaultCurrency: user.defaultCurrency || DEFAULT_CURRENCY,
      upiId: user.upiId || "",
      phoneNumber: user.phoneNumber || "",
      countryCode: user.countryCode || "",
      updatedAt: Date.now(),
    });

    await this.syncUserProfileToGroups();
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

    const now = Date.now();

    // Set acceptedTnC if not already set
    if (!existingData?.acceptedTnC) {
      await setDoc(userDocRef, {
        acceptedTnC: true,
        acceptedTnCAt: now,
        updatedAt: now,
      }, { merge: true });
    }

    // Check if username already exists (may have been set in a previous call)
    if (existingData?.username) {
      return existingData.username;
    }

    // Generate username from user's name, falling back to email or uid
    const firstName = existingData?.firstName || "";
    const lastName = existingData?.lastName || "";
    const email = existingData?.email || "";
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
        updatedAt: Date.now(),
      });
    });

    await this.syncUserProfileToGroups();

    return normalized;
  }

  async syncUserProfileToGroups(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return;

    const displayName = userDoc.data()?.displayName || "";
    const username = userDoc.data()?.username || "";
    const photoURL = userDoc.data()?.photoURL || "";

    const membersSnapshot = await getDocs(
      firestoreQuery(
        collectionGroup(db, "members"),
        where("uid", "==", uid),
        where("status", "==", "active")
      )
    );

    const memberDocs = membersSnapshot.docs.filter(
      (d) => (d.data() as Record<string, unknown>).isOffline !== true
    );

    for (let i = 0; i < memberDocs.length; i += FIRESTORE_BATCH_LIMIT_MULTI_OP) {
      const chunk = memberDocs.slice(i, i + FIRESTORE_BATCH_LIMIT_MULTI_OP);
      const batch = writeBatch(db);
      for (const memberDoc of chunk) {
        batch.update(memberDoc.ref, {
          displayName,
          username,
          photoURL,
        });
      }
      await batch.commit();
    }
  }

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    if (!query || query.length < 1) return [];

    const normalized = query.toLowerCase().replace(/[^a-z0-9._]/g, "");
    const q = firestoreQuery(
      collection(db, "users"),
      where("username", ">=", normalized),
      where("username", "<=", normalized + "\uf8ff"),
      limit(10)
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
      .filter((u) => u.username.length > 0);
  }

  async updateFcmToken(token: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    await updateDoc(doc(db, "users", uid), {
      fcmToken: token,
      updatedAt: Date.now(),
    });
  }

  async deleteAccount(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error("User not authenticated");

    // 1. Get user doc to find username
    const userDoc = await getDoc(doc(db, "users", uid));
    const userData = userDoc.data();
    const username = userData?.username as string | undefined;

    // 2. Find all group memberships and set status to "left"
    const membersSnapshot = await getDocs(
      firestoreQuery(
        collectionGroup(db, "members"),
        where("uid", "==", uid),
        where("status", "==", "active")
      )
    );

    const memberDocs = membersSnapshot.docs;
    for (let i = 0; i < memberDocs.length; i += FIRESTORE_BATCH_LIMIT_MULTI_OP) {
      const chunk = memberDocs.slice(i, i + FIRESTORE_BATCH_LIMIT_MULTI_OP);
      const batch = writeBatch(db);
      for (const memberDoc of chunk) {
        const pathSegments = memberDoc.ref.path.split("/");
        const groupId = pathSegments[1];
        batch.update(memberDoc.ref, {
          status: "left",
          leftAt: Date.now(),
        });
        batch.update(doc(db, "groups", groupId), { memberCount: increment(-1) });
      }
      await batch.commit();
    }

    // 3. Delete username doc if exists
    if (username) {
      await deleteDoc(doc(db, "usernames", username));
    }

    // 4. Delete user doc
    await deleteDoc(doc(db, "users", uid));

    // 5. Delete Firebase Auth account
    await firebaseDeleteUser(currentUser);
  }
}
