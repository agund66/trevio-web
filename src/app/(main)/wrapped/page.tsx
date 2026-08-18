"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { queryKeys } from "@/lib/constants/query-keys";
import { Sparkles, TrendingUp, Wallet, Calendar, Tag, Users, ArrowLeft, ArrowRight, RotateCw } from "lucide-react";
import type { WrappedSummary } from "@/lib/types";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { formatCurrencySymbol } from "@/lib/utils/currency";

const PERSONALITY_KEY_MAP: Record<string, string> = {
  "The Generous One": "generous",
  "The Active Splitter": "active",
  "The Big Spender": "big_spender",
  "The Social Butterfly": "social",
  "The Steady Splitter": "steady",
};

function formatAmount(amount: number, currency: string): string {
  return formatCurrencySymbol(Math.round(amount), currency);
}

export default function WrappedPage() {
  const t = useTranslations("wrapped");
  const { wrapped } = useServices();
  const { userCurrency } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.wrappedSummary(year),
    queryFn: () => wrapped.getWrappedSummary(year),
  });

  const generateMutation = useMutation({
    mutationFn: () => wrapped.generateWrappedSummary(year),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.wrappedSummary(year), data);
    },
  });

  const hasData = summary && summary.expenseCount > 0;
  const personalityKey = summary ? PERSONALITY_KEY_MAP[summary.personality] || "steady" : "steady";

  const monthlyEntries = summary
    ? Object.entries(summary.monthlyBreakdown)
        .map(([m, amt]) => ({ month: Number(m), amount: Number(amt) }))
        .sort((a, b) => a.month - b.month)
    : [];
  const categoryEntries = summary
    ? Object.entries(summary.categoryBreakdown)
        .map(([cat, amt]) => ({ category: cat, amount: Number(amt) }))
        .sort((a, b) => b.amount - a.amount)
    : [];
  const groupEntries = summary
    ? Object.entries(summary.groupBreakdown)
        .map(([grp, amt]) => ({ group: grp, amount: Number(amt) }))
        .sort((a, b) => b.amount - a.amount)
    : [];

  const maxMonthAmount = monthlyEntries.reduce((max, e) => Math.max(max, e.amount), 0);
  const maxCategoryAmount = categoryEntries.reduce((max, e) => Math.max(max, e.amount), 0);
  const maxGroupAmount = groupEntries.reduce((max, e) => Math.max(max, e.amount), 0);

  const totalFronted = summary ? summary.totalPaid - summary.totalSpent : 0;

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-trevio-600 dark:text-trevio-400" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Previous year"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[3.5rem] text-center text-lg font-bold text-slate-900 dark:text-slate-100">{year}</span>
          <button
            onClick={() => setYear((y) => Math.min(y + 1, currentYear))}
            disabled={year >= currentYear}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Next year"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 dark:border-trevio-800 border-t-trevio-600" />
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t("generating")}</p>
        </div>
      ) : !hasData ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-trevio-50 dark:bg-trevio-900/30">
            <Sparkles className="h-10 w-10 text-trevio-400 dark:text-trevio-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t("yearInReview")}</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{t("noData")}</p>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="h-4 w-4" />
            {generateMutation.isPending ? t("generating") : t("generate")}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero section */}
          <div className="rounded-2xl bg-gradient-to-br from-trevio-500 to-trevio-700 p-6 md:p-8">
            <p className="text-sm font-medium text-white/80">{t("yourYear")}</p>
            <h2 className="mt-1 text-3xl md:text-4xl font-bold text-white">{year}</h2>
            <p className="mt-3 text-xl font-semibold text-white">{t(`personalities.${personalityKey}`)}</p>
            <p className="mt-2 max-w-xl text-sm text-white/90">{summary.personalityDesc}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <StatCard
              icon={<Wallet className="h-5 w-5" />}
              label={t("totalSpent")}
              value={formatAmount(summary.totalSpent, summary.currency || userCurrency)}
            />
            <StatCard
              icon={<Calendar className="h-5 w-5" />}
              label={t("expensesLogged")}
              value={String(summary.expenseCount)}
            />
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label={t("groupsActive")}
              value={String(summary.groupCount)}
            />
            <StatCard
              icon={<TrendingUp className="h-5 w-5" />}
              label={t("totalPaid")}
              value={formatAmount(summary.totalPaid, summary.currency || userCurrency)}
            />
            <StatCard
              icon={<Sparkles className="h-5 w-5" />}
              label={t("totalFronted")}
              value={formatAmount(totalFronted, summary.currency || userCurrency)}
            />
            <StatCard
              icon={<Tag className="h-5 w-5" />}
              label={t("avgExpense")}
              value={formatAmount(summary.avgExpense, summary.currency || userCurrency)}
            />
          </div>

          {/* Top highlights */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t("yearInReview")}</h3>
            <div className="space-y-3">
              <HighlightRow icon={<Tag className="h-4 w-4" />} label={t("topCategory")} value={`${summary.topCategory} · ${formatAmount(summary.topCategoryAmount, summary.currency || userCurrency)}`} />
              <HighlightRow icon={<Users className="h-4 w-4" />} label={t("topGroup")} value={`${summary.topGroup} · ${formatAmount(summary.topGroupAmount, summary.currency || userCurrency)}`} />
              <HighlightRow icon={<Calendar className="h-4 w-4" />} label={t("busiestMonth")} value={`${t(`months.${summary.busiestMonth}`)} · ${formatAmount(summary.busiestMonthAmount, summary.currency || userCurrency)}`} />
              <HighlightRow icon={<TrendingUp className="h-4 w-4" />} label={t("largestExpense")} value={`${summary.largestExpenseDesc || "—"} · ${formatAmount(summary.largestExpense, summary.currency || userCurrency)}`} />
            </div>
          </div>

          {/* Breakdown by Month */}
          {monthlyEntries.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t("breakdownByMonth")}</h3>
              <div className="space-y-3">
                {monthlyEntries.map((entry) => (
                  <BreakdownBar
                    key={entry.month}
                    label={t(`months.${entry.month}`)}
                    amount={entry.amount}
                    maxAmount={maxMonthAmount}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Breakdown by Category */}
          {categoryEntries.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t("breakdownByCategory")}</h3>
              <div className="space-y-3">
                {categoryEntries.map((entry) => (
                  <BreakdownBar
                    key={entry.category}
                    label={entry.category}
                    amount={entry.amount}
                    maxAmount={maxCategoryAmount}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Breakdown by Group */}
          {groupEntries.length > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 md:p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{t("breakdownByGroup")}</h3>
              <div className="space-y-3">
                {groupEntries.map((entry) => (
                  <BreakdownBar
                    key={entry.group}
                    label={entry.group}
                    amount={entry.amount}
                    maxAmount={maxGroupAmount}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Refresh button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-5 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCw className={`h-4 w-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
              {generateMutation.isPending ? t("generating") : t("refresh")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-trevio-50 dark:bg-trevio-900/30 text-trevio-600 dark:text-trevio-400">
          {icon}
        </div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function HighlightRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 shrink-0">
        <span className="text-trevio-600 dark:text-trevio-400">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 text-right truncate min-w-0">{value}</span>
    </div>
  );
}

function BreakdownBar({ label, amount, maxAmount }: { label: string; amount: number; maxAmount: number }) {
  const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm gap-2">
        <span className="text-slate-700 dark:text-slate-300 truncate">{label}</span>
        <span className="font-medium text-slate-900 dark:text-slate-100 shrink-0">₹{Math.round(amount).toLocaleString("en-IN")}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full bg-trevio-500 transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
