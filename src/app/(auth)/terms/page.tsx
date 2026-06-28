"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";

export default function TermsPage() {
  const { user, loading } = useAuth();
  const { user: userService } = useServices();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    } else if (user.acceptedTnC) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await userService.acceptTnC();
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept terms");
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 border-t-trevio-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-bold text-slate-900">Terms & Conditions</h1>
      <p className="mt-2 text-slate-500">Before you get started, please read and accept our terms:</p>

      <div className="mt-6 space-y-4">
        <TermsSection title="1. Acceptance of Terms" body="By using Trevio, you agree to these terms and conditions. If you do not agree, please do not use the app." />
        <TermsSection title="2. Privacy & Data" body="Trevio stores your name, email, and profile photo from your Google account. We use this to identify you and facilitate group expense splitting. Your data is stored securely in Firebase." />
        <TermsSection title="3. Financial Data" body="Trevio helps track expenses and settlements between users. We do not process actual payments. All settlements are tracked in-app. UPI deep links redirect you to your preferred payment app." />
        <TermsSection title="4. User Conduct" body="You are responsible for the expenses and settlements you add. Do not create fraudulent or misleading expense entries." />
        <TermsSection title="5. Account Termination" body="You can delete your account at any time. Upon deletion, your data will be removed from our servers." />
      </div>

      <label className="mt-8 flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} className="h-5 w-5 rounded border-slate-300 text-trevio-600 focus:ring-trevio-500" />
        <span className="text-sm text-slate-700">I have read and agree to the Terms & Conditions</span>
      </label>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <button
        onClick={handleAccept}
        disabled={!checked || accepting}
        className="mt-6 w-full rounded-xl bg-trevio-600 py-4 text-base font-semibold text-white transition hover:bg-trevio-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {accepting ? "Accepting..." : "Accept & Continue"}
      </button>
    </div>
  );
}

function TermsSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
