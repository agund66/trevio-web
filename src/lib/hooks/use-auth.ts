"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useServices } from "@/lib/services/service-provider";
import type { User } from "@/lib/types";

export function useAuth() {
  const { auth } = useServices();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (newUid) => {
      setUid(newUid);
      if (newUid) {
        const currentUser = await auth.getCurrentUser();
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const signIn = useCallback(async () => {
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  }, [auth]);

  const signOut = useCallback(async () => {
    await auth.signOut();
    router.push("/login");
  }, [auth, router]);

  return { user, uid, loading, signIn, signOut };
}
