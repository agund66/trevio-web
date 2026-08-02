import {
  collection,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { AdminService } from "../interfaces/admin-service";
import type { User, UserRole } from "../../types";

export class FirebaseAdminService implements AdminService {
  async getAllUsers(): Promise<User[]> {
    const currentUid = auth.currentUser?.uid;
    if (!currentUid) throw new Error("User not authenticated");
    const currentUserDoc = await getDoc(doc(db, "users", currentUid));
    const currentRole = (currentUserDoc.data()?.role as string) ?? "user";
    if (currentRole !== "superadmin") throw new Error("Access denied");

    const snapshot = await getDocs(
      query(collection(db, "users"), orderBy("createdAt", "desc"))
    );
    return snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        uid: d.id,
        email: (data.email as string) || "",
        displayName: (data.displayName as string) || "",
        firstName: (data.firstName as string) || "",
        lastName: (data.lastName as string) || "",
        username: (data.username as string) || "",
        photoURL: (data.photoURL as string) || "",
        defaultCurrency: (data.defaultCurrency as string) || "INR",
        acceptedTnC: (data.acceptedTnC as boolean) || false,
        role: (data.role as UserRole) || "user",
        blocked: (data.blocked as boolean) || false,
        upiId: (data.upiId as string) || "",
        phoneNumber: (data.phoneNumber as string) || "",
        countryCode: (data.countryCode as string) || "",
      } as User;
    });
  }

  async blockUser(uid: string): Promise<void> {
    const currentUid = auth.currentUser?.uid;
    if (uid === currentUid) throw new Error("Cannot block yourself");
    await updateDoc(doc(db, "users", uid), {
      blocked: true,
      updatedAt: Date.now(),
    });
  }

  async unblockUser(uid: string): Promise<void> {
    await updateDoc(doc(db, "users", uid), {
      blocked: false,
      updatedAt: Date.now(),
    });
  }

  async promoteToSuperAdmin(uid: string): Promise<void> {
    await updateDoc(doc(db, "users", uid), {
      role: "superadmin",
      updatedAt: Date.now(),
    });
  }

  async demoteToUser(uid: string): Promise<void> {
    const currentUid = auth.currentUser?.uid;
    if (uid === currentUid) throw new Error("Cannot demote yourself");
    await updateDoc(doc(db, "users", uid), {
      role: "user",
      updatedAt: Date.now(),
    });
  }
}
