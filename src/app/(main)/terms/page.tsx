"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { FileText, ShieldCheck, Lock, Wallet, Gavel, UserX } from "lucide-react";
import { staggerContainer, staggerItem } from "@/lib/utils/animations";

const SECTIONS = [
  { icon: ShieldCheck, titleKey: "section1Title", bodyKey: "section1Body", color: "text-trevio-600 dark:text-trevio-400", bg: "bg-trevio-50 dark:bg-trevio-900/30" },
  { icon: Lock, titleKey: "section2Title", bodyKey: "section2Body", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/30" },
  { icon: Wallet, titleKey: "section3Title", bodyKey: "section3Body", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/30" },
  { icon: Gavel, titleKey: "section4Title", bodyKey: "section4Body", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/30" },
  { icon: UserX, titleKey: "section5Title", bodyKey: "section5Body", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/30" },
] as const;

export default function TermsPage() {
  const t = useTranslations("common");

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="rounded-2xl bg-gradient-to-br from-trevio-600 to-trevio-700 p-6 md:p-8 mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{t("termsTitle")}</h1>
        </div>
        <p className="text-sm text-white/85">{t("terms.introNormal")}</p>
      </motion.div>

      {/* Section cards */}
      <motion.div
        variants={staggerContainer(0.08)}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <motion.div
              key={section.titleKey}
              variants={staggerItem}
              className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5"
            >
              <div className="flex items-start gap-4">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${section.bg}`}>
                  <Icon className={`h-5 w-5 ${section.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100">
                    {t(`terms.${section.titleKey}`)}
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t(`terms.${section.bodyKey}`)}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        {t("terms.introNormal")}
      </p>
    </div>
  );
}
