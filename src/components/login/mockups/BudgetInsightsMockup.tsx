"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { TrendingUp, Flame, BarChart3 } from "lucide-react";

const categoryColors = ["bg-amber-400", "bg-indigo-400", "bg-rose-400"];

export function BudgetInsightsMockup() {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("auth");

  const categories = [
    { label: t("mockup.sample.categoryFood"), pct: 65, color: categoryColors[0] },
    { label: t("mockup.sample.categoryTravel"), pct: 40, color: categoryColors[1] },
    { label: t("mockup.sample.categoryShopping"), pct: 25, color: categoryColors[2] },
  ];

  return (
    <motion.div
      initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      className="w-full rounded-2xl bg-white/95 dark:bg-slate-800/95 shadow-2xl p-3 sm:p-4 backdrop-blur-md border border-white/40 dark:border-slate-700/50"
    >
      {/* Budget ring + streak */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t("mockup.monthlyBudget")}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{t("mockup.sample.budgetAmount")}</p>
        </div>
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.5 }}
          className="flex items-center gap-1 rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-1"
        >
          <Flame className="h-3 w-3 text-orange-500" />
          <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">{t("mockup.sample.streakCount")}</span>
        </motion.div>
      </div>

      {/* Progress ring (simplified as bar) */}
      <motion.div
        initial={reduceMotion ? {} : { width: 0 }}
        animate={{ width: "60%" }}
        transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
        className="h-2 rounded-full bg-gradient-to-r from-trevio-400 to-trevio-600 mb-3"
      />

      {/* Category bars */}
      <div className="space-y-2 mb-3">
        {categories.map((cat, i) => (
          <div key={cat.label} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-600 dark:text-slate-300 w-14">{cat.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <motion.div
                initial={reduceMotion ? { width: `${cat.pct}%` } : { width: 0 }}
                animate={{ width: `${cat.pct}%` }}
                transition={{ duration: 0.8, delay: 0.6 + i * 0.15, ease: "easeOut" }}
                className={`h-full rounded-full ${cat.color}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Insight chip */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="flex items-center gap-2 rounded-xl bg-trevio-50 dark:bg-trevio-900/20 px-3 py-2"
      >
        <TrendingUp className="h-3.5 w-3.5 text-trevio-600 dark:text-trevio-400" />
        <span className="text-[10px] font-medium text-trevio-700 dark:text-trevio-300">{t("mockup.youSaved")}</span>
      </motion.div>

      {/* Wrapped hint */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.3 }}
        className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500"
      >
        <BarChart3 className="h-3 w-3" />
        <span>{t("mockup.wrappedAvailable")}</span>
      </motion.div>
    </motion.div>
  );
}
