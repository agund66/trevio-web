import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../firebase";
import type { AdminService } from "../interfaces/admin-service";
import type { User, UserRole } from "../../types";

export class FirebaseAdminService implements AdminService {
  async getAllUsers(): Promise<User[]> {
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
    await updateDoc(doc(db, "users", uid), {
      blocked: true,
      updatedAt: new Date(),
    });
  }

  async unblockUser(uid: string): Promise<void> {
    await updateDoc(doc(db, "users", uid), {
      blocked: false,
      updatedAt: new Date(),
    });
  }

  async promoteToSuperAdmin(uid: string): Promise<void> {
    await updateDoc(doc(db, "users", uid), {
      role: "superadmin",
      updatedAt: new Date(),
    });
  }

  async demoteToUser(uid: string): Promise<void> {
    await updateDoc(doc(db, "users", uid), {
      role: "user",
      updatedAt: new Date(),
    });
  }
}
