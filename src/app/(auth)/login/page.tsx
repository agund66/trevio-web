"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { Users, Wallet, ReceiptText } from "lucide-react";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (!user.acceptedTnC) {
        router.push("/terms");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
    } catch {
      setSigningIn(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-between bg-gradient-to-b from-trevio-600 to-trevio-800 px-8 py-16">
      <div className="flex-1" />

      <div className="flex flex-col items-center">
        <h1 className="text-6xl font-bold text-white">Trevio</h1>
        <p className="mt-2 text-lg text-white/85">Split bills. Simplify life.</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="flex flex-col items-center gap-3 text-white/90">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5" />
            <span>Create groups for trips, turf & more</span>
          </div>
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5" />
            <span>Split expenses any way you want</span>
          </div>
          <div className="flex items-center gap-3">
            <ReceiptText className="h-5 w-5" />
            <span>Track who owes whom</span>
          </div>
        </div>
      </div>

      <div className="flex w-full max-w-sm flex-col items-center">
        {signingIn ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/30 border-t-white" />
        ) : (
          <button
            onClick={handleSignIn}
            className="w-full rounded-2xl bg-white px-6 py-4 text-base font-semibold text-trevio-600 transition hover:bg-trevio-50 active:scale-[0.98]"
          >
            Continue with Google
          </button>
        )}
        <p className="mt-4 text-center text-sm text-white/70">
          By continuing, you agree to our Terms & Conditions
        </p>
      </div>
    </div>
  );
}
