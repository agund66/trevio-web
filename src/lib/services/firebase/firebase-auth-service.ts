import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../../firebase";
import type { AuthService } from "../interfaces/auth-service";
import type { User } from "../../types";

export class FirebaseAuthService implements AuthService {
  async signInWithGoogle(): Promise<string> {
    try {
      // Try popup first — opens in a new screen and is preferred on desktop browsers
      console.log("[Trevio] Opening Google sign-in popup...");
      const result = await signInWithPopup(auth, googleProvider);
      console.log("[Trevio] Popup result:", result.user.uid);
      return await this.handleSignInResult(result.user);
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error("[Trevio] signInWithPopup error:", errMsg);
      // If popup was blocked or failed, fall back to redirect
      if (errMsg.includes("popup") || errMsg.includes("blocked") || errMsg.includes("closed")) {
        console.log("[Trevio] Falling back to signInWithRedirect...");
        await signInWithRedirect(auth, googleProvider);
        return "";
      }
      throw error;
    }
  }

  async handleRedirectResult(): Promise<string | null> {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      return await this.handleSignInResult(result.user);
    }
    return null;
  }

  private async handleSignInResult(firebaseUser: { uid: string; displayName: string | null; email: string | null; phoneNumber: string | null; photoURL: string | null }): Promise<string> {
    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!userDoc.exists()) {
      const displayName = firebaseUser.displayName || "";
      const nameParts = displayName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const phone = firebaseUser.phoneNumber || "";
      const countryCode = phone ? "IN" : "";

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
        phoneNumber: phone,
        countryCode,
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
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
    if (!userDoc.exists()) {
      // User doc doesn't exist yet — create it (handles redirect race condition
      // where getRedirectResult returns null but auth state is already restored)
      const displayName = firebaseUser.displayName || "";
      const nameParts = displayName.split(" ");
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const phone = firebaseUser.phoneNumber || "";
      const countryCode = phone ? "IN" : "";

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
        phoneNumber: phone,
        countryCode,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName,
        firstName,
        lastName,
        username: "",
        photoURL: firebaseUser.photoURL || "",
        defaultCurrency: "INR",
        acceptedTnC: false,
        upiId: "",
        phoneNumber: phone,
        countryCode,
      };
    }

    const data = userDoc.data();
    return {
      uid: firebaseUser.uid,
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

  isUserAuthenticated(): boolean {
    return auth.currentUser !== null;
  }

  onAuthStateChanged(callback: (uid: string | null) => void): () => void {
    return firebaseOnAuthStateChanged(auth, (user) => {
      callback(user?.uid ?? null);
    });
  }
}
