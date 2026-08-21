"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, Smartphone } from "lucide-react";

export function SettlementMockup() {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("auth");

  const balances = [
    { from: t("mockup.sample.nameAarav"), to: t("mockup.sample.nameRiya"), amount: t("mockup.sample.amount450") },
    { from: t("mockup.sample.nameSahil"), to: t("mockup.sample.nameAarav"), amount: t("mockup.sample.amount200") },
  ];

  return (
    <motion.div
      initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      className="w-full rounded-2xl bg-white/95 dark:bg-slate-800/95 shadow-2xl p-3 sm:p-4 backdrop-blur-md border border-white/40 dark:border-slate-700/50"
    >
      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">{t("mockup.simplifiedBalances")}</p>

      {/* Balance rows */}
      <div className="space-y-2 mb-3">
        {balances.map((row, i) => (
          <motion.div
            key={i}
            initial={reduceMotion ? {} : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.2 }}
            className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 px-3 py-2"
          >
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.from}</span>
            <ArrowRight className="h-3 w-3 text-slate-400" />
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{row.to}</span>
            <span className="ml-auto text-xs font-bold text-trevio-600 dark:text-trevio-400">{row.amount}</span>
          </motion.div>
        ))}
      </div>

      {/* UPI settle chip */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.9 }}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-trevio-500 to-trevio-600 px-3 py-2.5 text-white"
      >
        <Smartphone className="h-4 w-4" />
        <span className="text-xs font-semibold">{t("mockup.settleViaUpi")}</span>
        <ArrowRight className="ml-auto h-3 w-3" />
      </motion.div>
    </motion.div>
  );
}
