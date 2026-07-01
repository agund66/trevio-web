"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useServices } from "@/lib/services/service-provider";
import type { User } from "@/lib/types";

export function useAuth() {
  const { auth } = useServices();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const signInInProgress = useRef(false);

  useEffect(() => {
    auth.handleRedirectResult().then(async (uid) => {
      if (uid) {
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
      // If newUid is "", the redirect is in progress — page will navigate away.
      // handleRedirectResult will process the result when page reloads.
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

  return { user, uid, loading, signIn, signOut, refreshUser };
}

