"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { TrevioIcon } from "@/components/trevio-logo";
import { TermsDialog } from "@/components/terms-dialog";
import { PhoneSetupDialog } from "@/components/phone-setup-dialog";

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPhoneSetup, setShowPhoneSetup] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (user) {
      if (!user.acceptedTnC) {
        setShowTerms(true);
      } else if (!user.phoneNumber) {
        setShowPhoneSetup(true);
      } else {
        redirectToApp();
      }
    }
  }, [user, loading, router]);

  const redirectToApp = () => {
    const pendingInvite = sessionStorage.getItem("pendingInviteCode");
    if (pendingInvite) {
      router.push(`/join/${pendingInvite}`);
    } else {
      router.push("/dashboard");
    }
  };

  const handleSignIn = async () => {
    setSignInError(null);
    setSigningIn(true);
    try {
      await signIn();
    } catch (e) {
      setSignInError(e instanceof Error ? e.message : "Sign-in failed. Please try again.");
    } finally {
      setSigningIn(false);
    }
  };

  const handleTermsAccepted = () => {
    setSigningIn(false);
    setShowTerms(false);
    // useEffect will detect updated user (from refreshUser) and show phone setup or redirect
  };

  const handlePhoneComplete = () => {
    setShowPhoneSetup(false);
    redirectToApp();
  };

  return (
    <>
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-trevio-600 to-trevio-800 px-6 py-16">
        <div className="flex flex-col items-center gap-10">
          <div className="flex flex-col items-center">
            <TrevioIcon size={80} />
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">Trevio</h1>
            <p className="mt-2 text-base text-white/85">Split bills. Simplify life.</p>
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
            {signInError && (
              <p className="mt-3 rounded-lg bg-red-500/20 px-4 py-2 text-center text-sm text-white">
                {signInError}
              </p>
            )}
            <p className="mt-4 text-center text-sm text-white/70">
              By continuing, you agree to our Terms & Conditions
            </p>
          </div>
        </div>
      </div>

      <TermsDialog
        open={showTerms}
        onClose={() => setShowTerms(false)}
        onAccepted={handleTermsAccepted}
        forceAccept
      />

      <PhoneSetupDialog
        open={showPhoneSetup}
        onComplete={handlePhoneComplete}
      />
    </>
  );
}
