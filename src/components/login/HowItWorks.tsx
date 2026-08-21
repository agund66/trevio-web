"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { LogIn, Users, CheckCircle2 } from "lucide-react";

const steps = [
  { key: "step1", icon: LogIn, color: "from-trevio-400 to-trevio-600" },
  { key: "step2", icon: Users, color: "from-indigo-400 to-indigo-600" },
  { key: "step3", icon: CheckCircle2, color: "from-emerald-400 to-emerald-600" },
];

export function HowItWorks() {
  const t = useTranslations("auth");
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative w-full py-12 sm:py-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-2xl text-center mb-12 sm:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t("howItWorks.sectionTitle")}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            {t("howItWorks.sectionSubtitle")}
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-trevio-300 via-indigo-300 to-emerald-300 dark:from-trevio-700 dark:via-indigo-700 dark:to-emerald-700" />

          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.key}
                initial={reduceMotion ? {} : { opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center"
              >
                {/* Step number circle */}
                <div className="relative z-10 mb-5">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${step.color} shadow-lg`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white dark:bg-slate-900 ring-2 ring-trevio-200 dark:ring-trevio-800 text-xs font-bold text-trevio-600 dark:text-trevio-400">
                    {i + 1}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {t(`howItWorks.${step.key}Title`)}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs">
                  {t(`howItWorks.${step.key}Desc`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
