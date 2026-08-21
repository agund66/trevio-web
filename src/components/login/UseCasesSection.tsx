"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Plane,
  Home,
  Trophy,
  Users,
  PartyPopper,
  Coffee,
} from "lucide-react";

const useCaseConfig = [
  { key: "trips", icon: Plane, color: "from-trevio-400 to-trevio-600", bg: "bg-trevio-50 dark:bg-trevio-900/20", iconColor: "text-trevio-600 dark:text-trevio-400" },
  { key: "household", icon: Home, color: "from-indigo-400 to-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-900/20", iconColor: "text-indigo-600 dark:text-indigo-400" },
  { key: "turf", icon: Trophy, color: "from-amber-400 to-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", iconColor: "text-amber-600 dark:text-amber-400" },
  { key: "roommates", icon: Users, color: "from-rose-400 to-rose-600", bg: "bg-rose-50 dark:bg-rose-900/20", iconColor: "text-rose-600 dark:text-rose-400" },
  { key: "events", icon: PartyPopper, color: "from-purple-400 to-purple-600", bg: "bg-purple-50 dark:bg-purple-900/20", iconColor: "text-purple-600 dark:text-purple-400" },
  { key: "daily", icon: Coffee, color: "from-cyan-400 to-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-900/20", iconColor: "text-cyan-600 dark:text-cyan-400" },
];

export function UseCasesSection() {
  const t = useTranslations("auth");
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative w-full py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("useCases.sectionTitle")}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            {t("useCases.sectionSubtitle")}
          </p>
        </motion.div>

        {/* Use case cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {useCaseConfig.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <motion.div
                key={uc.key}
                initial={reduceMotion ? {} : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={reduceMotion ? undefined : { y: -6 }}
                className="group relative overflow-hidden rounded-2xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 p-6 shadow-lg shadow-black/5 dark:shadow-black/20 transition-all"
              >
                {/* Gradient glow on hover */}
                <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${uc.color} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity duration-500`} />

                {/* Icon */}
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${uc.bg}`}>
                  <Icon className={`h-6 w-6 ${uc.iconColor}`} />
                </div>

                {/* Text */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t(`useCases.${uc.key}.title`)}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t(`useCases.${uc.key}.desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
