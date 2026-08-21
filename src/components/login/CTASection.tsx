"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { TrevioIcon } from "@/components/trevio-logo";

interface CTASectionProps {
  onSignIn: () => void;
}

export function CTASection({ onSignIn }: CTASectionProps) {
  const t = useTranslations("auth");
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative w-full py-12 sm:py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-slate-800/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 sm:p-12 text-center shadow-2xl shadow-black/5 dark:shadow-black/30"
        >
          {/* Decorative gradient */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-r from-trevio-400/30 to-indigo-400/30 blur-3xl rounded-full" />

          <div className="relative">
            <div className="mb-6 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-trevio-50 dark:bg-white/5 ring-1 ring-trevio-100 dark:ring-white/10">
                <TrevioIcon size={40} />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
              {t("cta.title")}
            </h2>
            <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
              {t("cta.subtitle")}
            </p>

            <motion.button
              type="button"
              onClick={onSignIn}
              whileHover={reduceMotion ? undefined : { scale: 1.04 }}
              whileTap={reduceMotion ? undefined : { scale: 0.96 }}
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-trevio-600 to-trevio-700 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-trevio-600/30 transition hover:shadow-xl hover:shadow-trevio-600/40"
            >
              {t("cta.button")}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
