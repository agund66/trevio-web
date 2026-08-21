"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { SplitSquareHorizontal, Smartphone, Wallet, Repeat } from "lucide-react";

const highlights = [
  { key: "splitMethods", icon: SplitSquareHorizontal },
  { key: "settlement", icon: Smartphone },
  { key: "budgets", icon: Wallet },
  { key: "recurring", icon: Repeat },
];

export function StatsBanner() {
  const t = useTranslations("auth");
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative w-full py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-trevio-600 to-trevio-800 dark:from-trevio-800 dark:to-slate-900 p-8 sm:p-12 shadow-2xl shadow-trevio-600/20"
        >
          {/* Decorative blobs */}
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-white/5 rounded-full blur-3xl" />

          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {highlights.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.key}
                  initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-white">
                    {t(`features.${item.key}.title`)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
