"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { TrevioIcon } from "@/components/trevio-logo";
import { GlassCard } from "./GlassCard";

interface LoginCardProps {
  signingIn: boolean;
  signInError: string | null;
  onSignIn: () => void;
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function LoginCard({ signingIn, signInError, onSignIn }: LoginCardProps) {
  const t = useTranslations("auth");
  const reduceMotion = useReducedMotion();

  return (
    <GlassCard
      variant="strong"
      className="w-full max-w-sm p-6 flex flex-col items-center"
    >
      {/* Logo + branding */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-col items-center"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-trevio-50 dark:bg-white/5 backdrop-blur-sm mb-2 ring-1 ring-trevio-100 dark:ring-white/10">
          <TrevioIcon size={40} />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{t("appName")}</h1>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-white/70">{t("tagline")}</p>
      </motion.div>

      {/* Divider */}
      <div className="my-5 h-px w-full bg-slate-200/50 dark:bg-white/10" />

      {/* Google CTA */}
      <motion.button
        type="button"
        onClick={onSignIn}
        disabled={signingIn}
        aria-label={t("continueWithGoogle")}
        whileHover={reduceMotion ? undefined : { scale: 1.02 }}
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
        className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-lg shadow-black/10 ring-1 ring-slate-200/60 transition hover:shadow-xl hover:ring-slate-300 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {signingIn ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-trevio-600" />
        ) : (
          <>
            <GoogleIcon />
            <span>{t("continueWithGoogle")}</span>
          </>
        )}
      </motion.button>

      {/* Error banner */}
      {signInError && (
        <motion.p
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, x: [0, -4, 4, -4, 4, 0] }}
          transition={{ duration: 0.4 }}
          aria-live="polite"
          className="mt-3 w-full rounded-xl bg-red-500/20 px-4 py-2.5 text-center text-sm text-red-600 dark:text-red-300 backdrop-blur-sm border border-red-500/20"
        >
          {signInError}
        </motion.p>
      )}

      {/* Terms notice */}
      <p className="mt-4 text-center text-xs text-slate-500 dark:text-white/50 leading-relaxed">
        {t("agreeToTerms")}
      </p>
    </GlassCard>
  );
}
