"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { WifiOff, Check } from "lucide-react";

export function OfflineMockup() {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("auth");

  return (
    <motion.div
      initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      className="w-full rounded-2xl bg-white/95 dark:bg-slate-800/95 shadow-2xl p-3 sm:p-4 backdrop-blur-md border border-white/40 dark:border-slate-700/50"
    >
      {/* Offline banner */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 px-3 py-2 mb-3"
      >
        <WifiOff className="h-4 w-4 text-amber-500" />
        <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">{t("mockup.offlineBanner")}</span>
      </motion.div>

      {/* Cached expense entry */}
      <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t("mockup.sample.offlineLunchTitle")}</p>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{t("mockup.sample.offlineLunchAmount")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{t("mockup.splitEquallyPeople", { count: 4 })}</span>
          <div className="flex items-center gap-1 rounded-full bg-trevio-100 dark:bg-trevio-900/30 px-2 py-0.5">
            <Check className="h-2.5 w-2.5 text-trevio-600 dark:text-trevio-400" />
            <span className="text-[9px] font-medium text-trevio-600 dark:text-trevio-400">{t("mockup.saved")}</span>
          </div>
        </div>
      </div>

      {/* Pending sync item */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t("mockup.sample.offlineRideTitle")}</p>
          <span className="text-sm font-bold text-slate-900 dark:text-white">{t("mockup.sample.offlineRideAmount")}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 dark:text-slate-400">{t("mockup.splitWithPeople", { count: 2 })}</span>
          <div className="flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5">
            <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400">{t("mockup.pendingSync")}</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
