import {
  collection,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
  limit,
  startAfter,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { AdminService } from "../interfaces/admin-service";
import type { User, UserRole } from "../../types";
import { DEFAULT_CURRENCY } from "../../constants/currency";

export class FirebaseAdminService implements AdminService {
  async getAllUsers(pageSize: number = 50, lastUserUid?: string): Promise<{ users: User[]; hasMore: boolean; lastUserUid: string | null }> {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error("User not authenticated");
    const currentUserDoc = await getDoc(doc(db, "users", currentUid));
    const currentRole = (currentUserDoc.data()?.role as string) ?? "user";
    if (currentRole !== "superadmin") throw new Error("Access denied");

    let q = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(pageSize));

    if (lastUserUid) {
      const lastDoc = await getDoc(doc(db, "users", lastUserUid));
      if (lastDoc.exists()) {
        q = query(collection(db, "users"), orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize));
      }
    }

    const snapshot = await getDocs(q);
    const users = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        uid: d.id,
        email: (data.email as string) || "",
        displayName: (data.displayName as string) || "",
        firstName: (data.firstName as string) || "",
        lastName: (data.lastName as string) || "",
        username: (data.username as string) || "",
        photoURL: (data.photoURL as string) || "",
        defaultCurrency: (data.defaultCurrency as string) || DEFAULT_CURRENCY,
        acceptedTnC: (data.acceptedTnC as boolean) || false,
        role: (data.role as UserRole) || "user",
        blocked: (data.blocked as boolean) || false,
        upiId: (data.upiId as string) || "",
        phoneNumber: (data.phoneNumber as string) || "",
        countryCode: (data.countryCode as string) || "",
      } as User;
    });
    return {
      users,
      hasMore: snapshot.size === pageSize,
      lastUserUid: snapshot.size > 0 ? snapshot.docs[snapshot.size - 1].id : null,
    };
  }

  private async requireSuperadmin(): Promise<void> {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error("User not authenticated");
    const currentUserDoc = await getDoc(doc(db, "users", currentUid));
    const currentRole = (currentUserDoc.data()?.role as string) ?? "user";
    if (currentRole !== "superadmin") throw new Error("Access denied: superadmin only");
  }

  async blockUser(uid: string): Promise<void> {
    const currentUid = auth.currentUser?.uid;
    if (uid === currentUid) throw new Error("Cannot block yourself");
    await this.requireSuperadmin();
    await updateDoc(doc(db, "users", uid), {
      blocked: true,
      updatedAt: Date.now(),
    });
  }

  async unblockUser(uid: string): Promise<void> {
    await this.requireSuperadmin();
    await updateDoc(doc(db, "users", uid), {
      blocked: false,
      updatedAt: Date.now(),
    });
  }

  async promoteToSuperAdmin(uid: string): Promise<void> {
    await this.requireSuperadmin();
    await updateDoc(doc(db, "users", uid), {
      role: "superadmin",
      updatedAt: Date.now(),
    });
  }

  async demoteToUser(uid: string): Promise<void> {
    const currentUid = auth.currentUser?.uid;
    if (uid === currentUid) throw new Error("Cannot demote yourself");
    await this.requireSuperadmin();
    await updateDoc(doc(db, "users", uid), {
      role: "user",
      updatedAt: Date.now(),
    });
  }
}
