"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  SplitSquareHorizontal,
  Smartphone,
  Wallet,
  BarChart3,
  Repeat,
  WifiOff,
} from "lucide-react";
import { SplitMethodsMockup } from "./mockups/SplitMethodsMockup";
import { SettlementMockup } from "./mockups/SettlementMockup";
import { BudgetInsightsMockup } from "./mockups/BudgetInsightsMockup";
import { WrappedMockup } from "./mockups/WrappedMockup";
import { RecurringMockup } from "./mockups/RecurringMockup";
import { OfflineMockup } from "./mockups/OfflineMockup";

const features = [
  { key: "splitMethods", icon: SplitSquareHorizontal, mockup: <SplitMethodsMockup /> },
  { key: "settlement", icon: Smartphone, mockup: <SettlementMockup /> },
  { key: "budgets", icon: Wallet, mockup: <BudgetInsightsMockup /> },
  { key: "wrapped", icon: BarChart3, mockup: <WrappedMockup /> },
  { key: "recurring", icon: Repeat, mockup: <RecurringMockup /> },
  { key: "offline", icon: WifiOff, mockup: <OfflineMockup /> },
];

export function FeatureShowcase() {
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
            {t("features.sectionTitle")}
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-600 dark:text-slate-300">
            {t("features.sectionSubtitle")}
          </p>
        </motion.div>

        {/* Alternating feature rows */}
        <div className="space-y-16 sm:space-y-24">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const isReversed = i % 2 === 1;
            return (
              <motion.div
                key={feature.key}
                initial={reduceMotion ? {} : { opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6 }}
                className={`flex flex-col items-center gap-8 lg:gap-16 ${isReversed ? "lg:flex-row-reverse" : "lg:flex-row"}`}
              >
                {/* Text side */}
                <div className="flex-1 max-w-lg">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-trevio-50 dark:bg-trevio-900/30 ring-1 ring-trevio-100 dark:ring-trevio-800/50">
                    <Icon className="h-6 w-6 text-trevio-600 dark:text-trevio-400" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                    {t(`features.${feature.key}.title`)}
                  </h3>
                  <p className="mt-3 text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t(`features.${feature.key}.desc`)}
                  </p>
                </div>

                {/* Mockup side */}
                <div className="flex-1 max-w-sm w-full">
                  <motion.div
                    initial={reduceMotion ? {} : { opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="relative"
                  >
                    {/* Glow behind mockup */}
                    <div className="absolute inset-0 bg-gradient-to-br from-trevio-400/20 to-indigo-400/20 blur-3xl rounded-full" />
                    <div className="relative">
                      {feature.mockup}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
