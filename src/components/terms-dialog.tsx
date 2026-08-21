"use client";

import { useState, useEffect } from "react";
import { X, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { AnimatedDialog } from "./animated-dialog";

interface TermsDialogProps {
  open: boolean;
  onClose: () => void;
  onAccepted?: () => void;
  forceAccept?: boolean;
}

export function TermsDialog({ open, onClose, onAccepted, forceAccept = false }: TermsDialogProps) {
  const { user: userService } = useServices();
  const { refreshUser } = useAuth();
  const t = useTranslations("common");
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

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      await userService.acceptTnC();
      await refreshUser();
      onAccepted?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('failedToAcceptTerms'));
    } finally {
      setAccepting(false);
    }
  };

  return (
    <AnimatedDialog open={open} onClose={onClose} disableBackdropClose={forceAccept} maxWidth="max-w-lg">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('termsTitle')}</h2>
          </div>
          {!forceAccept && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: "calc(85vh - 180px)" }}>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {forceAccept ? t('terms.introForceAccept') : t('terms.introNormal')}
          </p>
          <div className="space-y-4">
            <TermsSection title={t('terms.section1Title')} body={t('terms.section1Body')} />
            <TermsSection title={t('terms.section2Title')} body={t('terms.section2Body')} />
            <TermsSection title={t('terms.section3Title')} body={t('terms.section3Body')} />
            <TermsSection title={t('terms.section4Title')} body={t('terms.section4Body')} />
            <TermsSection title={t('terms.section5Title')} body={t('terms.section5Body')} />
          </div>
        </div>

        {forceAccept && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-trevio-600 focus:ring-trevio-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">{t('terms.checkboxLabel')}</span>
            </label>

            {error && <p className="mt-3 text-sm text-red-500 dark:text-red-400">{error}</p>}

            <button
              onClick={handleAccept}
              disabled={!checked || accepting}
              className="mt-4 w-full rounded-xl bg-trevio-600 py-3.5 text-sm font-semibold text-white transition hover:bg-trevio-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accepting ? t('terms.accepting') : t('terms.acceptAndContinue')}
            </button>
          </div>
        )}
    </AnimatedDialog>
  );
}

function TermsSection({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{body}</p>
    </div>
  );
}
