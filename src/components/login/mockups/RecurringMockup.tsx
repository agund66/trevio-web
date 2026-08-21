"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Repeat } from "lucide-react";

const recurringColors = [
  "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300",
  "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
];

export function RecurringMockup() {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("auth");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const recurringItems = [
    { label: t("mockup.sample.recurringTurf"), detail: t("mockup.sample.recurringTurfDetail"), amount: t("mockup.sample.recurringTurfAmount"), color: recurringColors[0] },
    { label: t("mockup.sample.recurringRent"), detail: t("mockup.sample.recurringRentDetail"), amount: t("mockup.sample.recurringRentAmount"), color: recurringColors[1] },
    { label: t("mockup.sample.recurringNetflix"), detail: t("mockup.sample.recurringNetflixDetail"), amount: t("mockup.sample.recurringNetflixAmount"), color: recurringColors[2] },
  ];

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setHighlightIndex((prev) => (prev + 1) % recurringItems.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [reduceMotion, recurringItems.length]);

  return (
    <motion.div
      initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      className="w-full rounded-2xl bg-white/95 dark:bg-slate-800/95 shadow-2xl p-3 sm:p-4 backdrop-blur-md border border-white/40 dark:border-slate-700/50"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t("mockup.recurringExpenses")}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{t("mockup.activeSchedules", { count: 3 })}</p>
        </div>
        <div className="flex items-center gap-1 rounded-full bg-trevio-100 dark:bg-trevio-900/30 px-2 py-1">
          <Repeat className="h-3 w-3 text-trevio-600 dark:text-trevio-400" />
          <span className="text-[10px] font-bold text-trevio-600 dark:text-trevio-400">{t("mockup.auto")}</span>
        </div>
      </div>

      {/* Recurring items */}
      <div className="space-y-2">
        {recurringItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={reduceMotion ? {} : { opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
            className={`flex items-center justify-between rounded-xl p-2.5 transition-all ${i === highlightIndex && !reduceMotion ? "ring-2 ring-trevio-300 dark:ring-trevio-700" : ""} ${item.color}`}
          >
            <div>
              <p className="text-xs font-semibold">{item.label}</p>
              <p className="text-[10px] opacity-70">{item.detail}</p>
            </div>
            <span className="text-sm font-bold">{item.amount}</span>
          </motion.div>
        ))}
      </div>

      {/* Next auto-log hint */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500"
      >
        <Repeat className="h-3 w-3" />
        <span>{t("mockup.nextAutoLog")}</span>
      </motion.div>
    </motion.div>
  );
}
