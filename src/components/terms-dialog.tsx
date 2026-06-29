"use client";

import { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";

interface TermsDialogProps {
  open: boolean;
  onClose: () => void;
  onAccepted?: () => void;
  forceAccept?: boolean;
}

export function TermsDialog({ open, onClose, onAccepted, forceAccept = false }: TermsDialogProps) {
  const { user: userService } = useServices();
  const { refreshUser } = useAuth();
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setChecked(false);
      setAccepting(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !forceAccept) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose, forceAccept]);

  if (!open) return null;

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await userService.acceptTnC();
      await refreshUser();
      onAccepted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to accept terms");
      setAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !forceAccept && onClose()}
      />
      <div className="relative z-10 w-full max-w-lg max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-trevio-600" />
            <h2 className="text-lg font-bold text-slate-900">Terms & Conditions</h2>
          </div>
          {!forceAccept && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(85vh - 180px)" }}>
          <p className="text-sm text-slate-500 mb-4">
            {forceAccept ? "Before you get started, please read and accept our terms:" : "Please read our terms and conditions:"}
          </p>
          <div className="space-y-4">
            <TermsSection title="1. Acceptance of Terms" body="By using Trevio, you agree to these terms and conditions. If you do not agree, please do not use the app." />
            <TermsSection title="2. Privacy & Data" body="Trevio stores your name, email, and profile photo from your Google account. We use this to identify you and facilitate group expense splitting. Your data is stored securely in Firebase." />
            <TermsSection title="3. Financial Data" body="Trevio helps track expenses and settlements between users. We do not process actual payments. All settlements are tracked in-app. UPI deep links redirect you to your preferred payment app." />
            <TermsSection title="4. User Conduct" body="You are responsible for the expenses and settlements you add. Do not create fraudulent or misleading expense entries." />
            <TermsSection title="5. Account Termination" body="You can delete your account at any time. Upon deletion, your data will be removed from our servers." />
          </div>
        </div>

        {forceAccept && (
          <div className="border-t border-slate-200 px-6 py-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-trevio-600 focus:ring-trevio-500"
              />
              <span className="text-sm text-slate-700">I have read and agree to the Terms & Conditions</span>
            </label>

            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

            <button
              onClick={handleAccept}
              disabled={!checked || accepting}
              className="mt-4 w-full rounded-xl bg-trevio-600 py-3.5 text-sm font-semibold text-white transition hover:bg-trevio-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? "Accepting..." : "Accept & Continue"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TermsSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
