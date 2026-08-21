"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Users, Receipt } from "lucide-react";

export function SplitReceiptMockup() {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("auth");

  return (
    <motion.div
      initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      className="w-full rounded-2xl bg-white/95 dark:bg-slate-800/95 shadow-2xl p-3 sm:p-4 backdrop-blur-md border border-white/40 dark:border-slate-700/50"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-trevio-100 dark:bg-trevio-900/40">
          <Receipt className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t("mockup.sample.dinnerTitle")}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{t("mockup.sample.dinnerGroup", { count: 4 })}</p>
        </div>
      </div>

      {/* Amount */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mb-3"
      >
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{t("mockup.sample.amount3200")}</p>
        <p className="text-[10px] text-slate-500 dark:text-slate-400">{t("mockup.totalBill")}</p>
      </motion.div>

      {/* Split chip */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.6 }}
        className="inline-flex items-center gap-1.5 rounded-full bg-trevio-50 dark:bg-trevio-900/30 px-3 py-1.5 mb-3"
      >
        <Users className="h-3 w-3 text-trevio-600 dark:text-trevio-400" />
        <span className="text-xs font-medium text-trevio-700 dark:text-trevio-300">{t("mockup.splitEqually")} · {t("mockup.sample.perPerson")}</span>
      </motion.div>

      {/* Avatars */}
      <div className="flex items-center gap-2">
        {[t("mockup.sample.avatarA"), t("mockup.sample.avatarR"), t("mockup.sample.avatarS"), t("mockup.sample.avatarM")].map((initial, i) => (
          <motion.div
            key={initial}
            initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 + i * 0.1 }}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-trevio-400 to-trevio-600 text-white text-[10px] font-bold ring-2 ring-white dark:ring-slate-800"
          >
            {initial}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
