"use client";

import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const methodColors = [
  "bg-trevio-100 text-trevio-700 dark:bg-trevio-900/30 dark:text-trevio-300",
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
];

export function SplitMethodsMockup() {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("auth");
  const [index, setIndex] = useState(0);

  const methods = [
    { label: t("mockup.sample.methodEqual"), detail: t("mockup.sample.methodEqualDetail"), color: methodColors[0] },
    { label: t("mockup.sample.methodExact"), detail: t("mockup.sample.methodExactDetail"), color: methodColors[1] },
    { label: t("mockup.sample.methodPercent"), detail: t("mockup.sample.methodPercentDetail"), color: methodColors[2] },
    { label: t("mockup.sample.methodShares"), detail: t("mockup.sample.methodSharesDetail"), color: methodColors[3] },
  ];

  useEffect(() => {
    if (reduceMotion) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % methods.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [reduceMotion, methods.length]);

  const current = methods[index];

  return (
    <motion.div
      initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      className="w-full rounded-2xl bg-white/95 dark:bg-slate-800/95 shadow-2xl p-3 sm:p-4 backdrop-blur-md border border-white/40 dark:border-slate-700/50"
    >
      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">{t("mockup.splitMethod")}</p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-3">{t("mockup.splitMethodHint")}</p>

      {/* Method chips row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {methods.map((m, i) => (
          <div
            key={m.label}
            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-medium transition-all ${
              i === index
                ? m.color + " scale-105 shadow-sm"
                : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
            }`}
          >
            {m.label}
          </div>
        ))}
      </div>

      {/* Animated detail */}
      <div className="min-h-[48px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={reduceMotion ? {} : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? {} : { opacity: 0, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className={`w-full rounded-xl px-3 py-2 ${current.color}`}
          >
            <p className="text-xs font-semibold">{current.label}</p>
            <p className="text-[10px] opacity-80 break-words">{current.detail}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
