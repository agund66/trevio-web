"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, createElement, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useServices } from "@/lib/services/service-provider";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  uid: string | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useServices();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const signInInProgress = useRef(false);

  useEffect(() => {
    auth.handleRedirectResult().then(async (resultUid) => {
      if (resultUid) {
        const currentUser = await auth.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
        setLoading(false);
      }
    }).catch((e) => console.error("[Trevio] Redirect result error:", e));
  }, [auth]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (newUid) => {
      setUid(newUid);
      if (newUid) {
        if (signInInProgress.current) {
          return;
        }
        const currentUser = await auth.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const signIn = useCallback(async () => {
    signInInProgress.current = true;
    try {
      const newUid = await auth.signInWithGoogle();
      if (newUid) {
        const currentUser = await auth.getCurrentUser();
        setUser(currentUser);
        setUid(newUid);
        setLoading(false);
      }
    } catch (error) {
      console.error("[Trevio] signIn error:", error);
      setLoading(false);
      throw error;
    } finally {
      signInInProgress.current = false;
    }
  }, [auth]);

  const refreshUser = useCallback(async () => {
    const currentUid = auth.getCurrentUserId();
    if (currentUid) {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
    }
  }, [auth]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    setUser(null);
    setUid(null);
    router.push("/login");
  }, [auth, router]);

  return createElement(
    AuthContext.Provider,
    { value: { user, uid, loading, signIn, signOut, refreshUser } },
    children
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
