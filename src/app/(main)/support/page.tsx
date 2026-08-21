"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useServices } from "@/lib/services/service-provider";
import { seedHelpArticlesIfEmpty } from "@/lib/support/faq-seed";
import {
  LifeBuoy,
  Search,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
  Ticket,
  Calculator,
  HandCoins,
  Receipt,
  Users,
  Wallet,
  UserCircle,
  Bug,
  HelpCircle,
} from "lucide-react";
import DOMPurify from "dompurify";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { staggerContainer, staggerItem } from "@/lib/utils/animations";
import type { HelpArticle, SupportCategory } from "@/lib/types";

const CATEGORY_ICONS: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  calculation: { icon: Calculator, color: "text-blue-600 dark:text-blue-400" },
  settlement: { icon: HandCoins, color: "text-green-600 dark:text-green-400" },
  expense: { icon: Receipt, color: "text-purple-600 dark:text-purple-400" },
  group_access: { icon: Users, color: "text-orange-600 dark:text-orange-400" },
  payment_info: { icon: Wallet, color: "text-teal-600 dark:text-teal-400" },
  account: { icon: UserCircle, color: "text-indigo-600 dark:text-indigo-400" },
  bug: { icon: Bug, color: "text-red-600 dark:text-red-400" },
  general: { icon: HelpCircle, color: "text-slate-600 dark:text-slate-400" },
};

export default function SupportPage() {
  const t = useTranslations("support");
  const tc = useTranslations("common");
  const { support } = useServices();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  useEffect(() => {
    seedHelpArticlesIfEmpty();
  }, []);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["helpArticles"],
    queryFn: () => support.getHelpArticles(),
  });

  const filteredArticles = useMemo(() => {
    if (!articles) return [];
    return articles.filter((a) => {
      const matchesCategory = activeCategory === "all" || a.category === activeCategory;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.content.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [articles, activeCategory, search]);

  const categories = useMemo(() => {
    if (!articles) return [];
    const set = new Set(articles.map((a) => a.category));
    return Array.from(set);
  }, [articles]);

  if (selectedArticle) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <button
          onClick={() => setSelectedArticle(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("backToHelpCenter")}
        </button>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            {selectedArticle.title}
          </h1>
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100 [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_strong]:text-slate-900 dark:[&_strong]:text-slate-100"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(selectedArticle.content),
            }}
          />
        </div>
        <div className="mt-6 rounded-2xl border border-trevio-200 dark:border-trevio-700 bg-trevio-50 dark:bg-trevio-900/20 p-4">
          <p className="text-sm font-semibold text-trevio-700 dark:text-trevio-300">
            {t("article.notFoundHelp")}
          </p>
          <p className="mt-1 text-sm text-trevio-600 dark:text-trevio-400">
            {t("article.notFoundHelpDesc")}
          </p>
          <Link
            href="/support/new"
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <MessageSquarePlus className="h-4 w-4" />
            {t("article.reportIssue")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/profile")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("back")}
      </button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trevio-50 dark:bg-trevio-900/30">
            <LifeBuoy className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <Link
          href="/support/new"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:border-trevio-300 dark:hover:border-trevio-600"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trevio-50 dark:bg-trevio-900/30">
            <MessageSquarePlus className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("quickActions.reportIssue")}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("quickActions.reportIssueDesc")}</p>
          </div>
        </Link>
        <Link
          href="/support/tickets"
          className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:border-trevio-300 dark:hover:border-trevio-600"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
            <Ticket className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t("quickActions.myTickets")}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("quickActions.myTicketsDesc")}</p>
          </div>
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-11 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition",
              activeCategory === "all"
                ? "bg-trevio-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            {t("allCategories")}
          </button>
          {categories.map((cat) => {
            const config = CATEGORY_ICONS[cat] || CATEGORY_ICONS.general;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                  activeCategory === cat
                    ? "bg-trevio-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {t(`categories.${cat}`)}
              </button>
            );
          })}
        </div>
      )}

      {/* Articles list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <HelpCircle className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            {search ? t("empty.noArticlesSearch") : t("empty.noArticles")}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("empty.tryDifferent")}
          </p>
          <Link
            href="/support/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <MessageSquarePlus className="h-4 w-4" />
            {t("article.reportIssue")}
          </Link>
        </div>
      ) : (
        <motion.div variants={staggerContainer(0.06)} initial="hidden" animate="visible" className="space-y-2">
          {filteredArticles.map((article) => {
            const config = CATEGORY_ICONS[article.category] || CATEGORY_ICONS.general;
            const Icon = config.icon;
            return (
              <motion.div key={article.articleId} variants={staggerItem}>
              <button
                onClick={() => setSelectedArticle(article)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-left transition hover:border-trevio-300 dark:hover:border-trevio-600 hover:shadow-sm"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
                  <Icon className={cn("h-4 w-4", config.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {article.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t(`categories.${article.category}`)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </button>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
