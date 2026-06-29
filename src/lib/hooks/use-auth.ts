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
    console.log("[Trevio] useAuth mount — checking redirect result...");
    auth.handleRedirectResult().then(async (uid) => {
      console.log("[Trevio] handleRedirectResult uid:", uid);
      if (uid) {
        const currentUser = await auth.getCurrentUser();
        console.log("[Trevio] handleRedirectResult user:", currentUser?.uid);
        if (currentUser) {
          setUser(currentUser);
        }
        setLoading(false);
      }
    }).catch((e) => console.error("[Trevio] Redirect result error:", e));
  }, [auth]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (newUid) => {
      console.log("[Trevio] onAuthStateChanged uid:", newUid, "signInInProgress:", signInInProgress.current);
      setUid(newUid);
      if (newUid) {
        if (signInInProgress.current) {
          console.log("[Trevio] Sign in already in progress, skipping onAuthStateChanged");
          return;
        }
        // getCurrentUser will create the user doc if it doesn't exist yet
        const currentUser = await auth.getCurrentUser();
        console.log("[Trevio] onAuthStateChanged user:", currentUser?.uid);
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
    console.log("[Trevio] signIn started");
    signInInProgress.current = true;
    try {
      const newUid = await auth.signInWithGoogle();
      console.log("[Trevio] signIn got uid:", newUid);
      // If redirect was used, newUid is "" and page will navigate away.
      // Only set user if we got a real uid back (popup path).
      if (newUid) {
        const currentUser = await auth.getCurrentUser();
        console.log("[Trevio] signIn got user:", currentUser?.uid);
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
      console.log("[Trevio] signIn finished");
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

