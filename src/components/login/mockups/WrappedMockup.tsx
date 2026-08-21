"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { TrendingUp, Trophy, Plane } from "lucide-react";

export function WrappedMockup() {
  const reduceMotion = useReducedMotion();
  const t = useTranslations("auth");

  return (
    <motion.div
      initial={reduceMotion ? {} : { opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
      className="w-full rounded-2xl bg-gradient-to-br from-trevio-600 to-indigo-700 dark:from-trevio-700 dark:to-indigo-900 shadow-2xl p-4 sm:p-5 text-white"
    >
      {/* Header */}
      <p className="text-xs font-semibold opacity-80">{t("mockup.yourYearInReview")}</p>
      <p className="text-2xl sm:text-3xl font-bold mt-1">{t("mockup.sample.wrappedTotal")}</p>
      <p className="text-[10px] opacity-70">{t("mockup.totalTracked")}</p>

      {/* Stats grid */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { icon: TrendingUp, label: t("mockup.topCategory"), value: t("mockup.sample.wrappedTopCategoryValue") },
          { icon: Plane, label: t("mockup.biggestTrip"), value: t("mockup.sample.wrappedBiggestTripValue") },
          { icon: Trophy, label: t("mockup.splitStreak"), value: t("mockup.sample.wrappedStreakValue") },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={reduceMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.15 }}
              className="rounded-xl bg-white/15 backdrop-blur-sm p-2.5"
            >
              <Icon className="h-4 w-4 mb-1.5 opacity-80" />
              <p className="text-[10px] opacity-70">{stat.label}</p>
              <p className="text-xs font-bold">{stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom highlight */}
      <motion.div
        initial={reduceMotion ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-3 rounded-xl bg-white/10 backdrop-blur-sm px-3 py-2"
      >
        <p className="text-[10px] font-medium opacity-90">{t("mockup.sample.wrappedFriends", { friends: 23, groups: 8 })}</p>
      </motion.div>
    </motion.div>
  );
}
