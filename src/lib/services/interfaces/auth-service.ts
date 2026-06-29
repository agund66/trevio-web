import type { User } from "../../types";

export interface AuthService {
  signInWithGoogle(): Promise<string>;
  handleRedirectResult(): Promise<string | null>;
  getCurrentUserId(): string | null;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  isUserAuthenticated(): boolean;
  onAuthStateChanged(callback: (uid: string | null) => void): () => void;
}
