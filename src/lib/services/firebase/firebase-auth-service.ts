import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../../firebase";
import type { AuthService } from "../interfaces/auth-service";
import type { User } from "../../types";

export class FirebaseAuthService implements AuthService {
  async signInWithGoogle(): Promise<string> {
    const result = await signInWithPopup(auth, googleProvider);
    const firebaseUser = result.user;

    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!userDoc.exists()) {
      const displayName = firebaseUser.displayName || "";
      const nameParts = displayName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const newUser: Record<string, unknown> = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName,
        firstName,
        lastName,
        username: "",
        photoURL: firebaseUser.photoURL || "",
        defaultCurrency: "INR",
        fcmToken: "",
        acceptedTnC: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    }

    return firebaseUser.uid;
  }

  getCurrentUserId(): string | null {
    return auth.currentUser?.uid ?? null;
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(auth);
  }

  async getCurrentUser(): Promise<User | null> {
    const uid = this.getCurrentUserId();
    if (!uid) return null;

    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return null;

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

  isUserAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  onAuthStateChanged(callback: (uid: string | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, (user) => {
      callback(user?.uid ?? null);
    });
  }
}
