"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Target,
  BarChart3,
  PieChart,
  Award,
  Lightbulb,
  ShoppingCart,
  Sprout,
  Zap,
  Home,
  Car,
  Stethoscope,
  GraduationCap,
  Film,
  Utensils,
  ShoppingBag,
  Sparkles,
  Shield,
  Package,
  Briefcase,
  PartyPopper,
  Gift,
  Undo2,
  Building2,
  PersonStanding,
  Landmark,
} from "lucide-react";
import type { Expense, Member } from "@/lib/types";
import { computeMonthlyReport } from "@/lib/utils/household-analytics";
import {
  getCategoryIcon,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/utils/household-categories";
import { formatCurrencySymbol } from "@/lib/utils/currency";
import { FULL_MONTH_LABELS } from "@/lib/utils/date";
import { Avatar } from "@/components/avatar";
import { BASE_CURRENCY } from "@/lib/constants/currency";

const ICON_MAP: Record<string, typeof ShoppingCart> = {
  ShoppingCart,
  Sprout,
  Zap,
  Home,
  Car,
  Stethoscope,
  GraduationCap,
  Film,
  Utensils,
  ShoppingBag,
  Sparkles,
  Shield,
  Package,
  Briefcase,
  PartyPopper,
  Gift,
  Undo2,
  TrendingUp,
  Building2,
  PersonStanding,
  Landmark,
};

interface MonthlyReportTabProps {
  expenses: Expense[];
  members: Member[];
  selectedYear: number;
  selectedMonth: number;
  monthlyBudget?: number;
  gamificationInsight?: string;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  userCurrency?: string;
}

export function MonthlyReportTab({
  expenses,
  members,
  selectedYear,
  selectedMonth,
  monthlyBudget,
  gamificationInsight,
  onPreviousMonth,
  onNextMonth,
  userCurrency = BASE_CURRENCY,
}: MonthlyReportTabProps) {
  const t = useTranslations("household");
  const report = useMemo(
    () => computeMonthlyReport(expenses, members, selectedYear, selectedMonth, monthlyBudget),
    [expenses, members, selectedYear, selectedMonth, monthlyBudget]
  );

  const maxDailySpent = useMemo(
    () => Math.max(...report.dailyTrend.map((d) => d.totalSpent), 1),
    [report.dailyTrend]
  );

  const budgetColor =
    report.budget != null
      ? (report.budgetProgress >= 100 ? "bg-red-500" : report.budgetProgress >= 80 ? "bg-amber-500" : "bg-green-500")
      : "bg-gray-400";

  const budgetTextColor =
    report.budgetProgress >= 100
      ? "text-red-500"
      : report.budgetProgress >= 80
        ? "text-amber-500"
        : "text-green-500";

  const isCurrentMonth = selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth();

  return (
    <div className="space-y-4 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPreviousMonth}
          aria-label={t('monthly.previousMonthAria')}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {FULL_MONTH_LABELS[selectedMonth]} {selectedYear}
        </span>
        <button
          onClick={onNextMonth}
          aria-label={t('monthly.nextMonthAria')}
          disabled={isCurrentMonth}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
          <div className="flex items-center gap-1.5 text-red-500">
            <TrendingDown className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">{t('daily.spent')}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
            {formatCurrencySymbol(report.totalSpent, userCurrency)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
          <div className="flex items-center gap-1.5 text-green-500">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">{t('daily.received')}</span>
          </div>
          <p className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100">
            {formatCurrencySymbol(report.totalReceived, userCurrency)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Wallet className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium uppercase tracking-wide">{t('daily.net')}</span>
          </div>
          <p
            className={`mt-1 text-sm font-bold ${
              report.netAmount >= 0 ? "text-green-500" : "text-red-500"
            }`}
          >
            {formatCurrencySymbol(Math.abs(report.netAmount), userCurrency)}
          </p>
        </div>
      </div>

      {/* Budget progress */}
      {report.budget != null && report.budget > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {t('monthly.budget')}
              </span>
            </div>
            <span className={`text-xs font-semibold ${budgetTextColor}`}>
              {report.budgetProgress.toFixed(0)}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full ${budgetColor} transition-all`}
              style={{ width: `${Math.min(report.budgetProgress, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{formatCurrencySymbol(report.totalSpent, userCurrency)} {t('monthly.spent')}</span>
            <span>
              {report.budgetRemaining >= 0
                ? `${formatCurrencySymbol(report.budgetRemaining, userCurrency)} ${t('monthly.left')}`
                : `${formatCurrencySymbol(Math.abs(report.budgetRemaining), userCurrency)} ${t('monthly.over')}`}
            </span>
          </div>
        </div>
      )}

      {/* Daily trend bar chart */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('monthly.dailySpending')}
          </span>
        </div>
        <div className="flex items-end gap-[2px] h-24 sm:h-32">
          {report.dailyTrend.map((d) => {
            const heightPct = (d.totalSpent / maxDailySpent) * 100;
            return (
              <div
                key={d.day}
                className="flex flex-1 flex-col justify-end items-center group relative"
                title={t('monthly.dayTooltip', { day: d.day, amount: formatCurrencySymbol(d.totalSpent, userCurrency) })}
              >
                <div
                  className="w-full rounded-t-sm bg-trevio-400 dark:bg-trevio-500 transition-all group-hover:bg-trevio-600"
                  style={{
                    height: `${Math.max(heightPct, d.totalSpent > 0 ? 4 : 0)}%`,
                    minHeight: d.totalSpent > 0 ? "2px" : "0",
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between text-[9px] text-slate-400">
          <span>1</span>
          <span>{Math.ceil(report.dailyTrend.length / 2)}</span>
          <span>{report.dailyTrend.length}</span>
        </div>
      </div>

      {/* Category breakdown */}
      {report.spentByCategory.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('monthly.topCategories')}
            </span>
          </div>
          <div className="space-y-3">
            {report.spentByCategory.slice(0, 5).map((cat) => {
              const color = getCategoryColor(cat.category);
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {getCategoryLabel(cat.category)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrencySymbol(cat.totalAmount, userCurrency)}
                      </span>
                      <span className="text-[10px] text-slate-400">{cat.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${cat.percentage}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Who-paid rankings */}
      {report.memberContributions.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Award className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('monthly.whoPaid')}
            </span>
          </div>
          <div className="space-y-3">
            {report.memberContributions
              .filter((m) => m.totalSpent > 0 || m.totalReceived > 0)
              .map((m) => (
                <div key={m.uid} className="flex items-center gap-3">
                  <span className="w-4 text-xs font-bold text-slate-400">{m.rank}</span>
                  <Avatar photoURL={m.photoURL} displayName={m.displayName} className="h-8 w-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-900 dark:text-slate-100">
                      {m.displayName}
                    </p>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-trevio-500"
                        style={{ width: `${m.spentPercentage}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrencySymbol(m.totalSpent, userCurrency)}
                    </p>
                    <p className="text-[10px] text-slate-400">{m.spentPercentage}%</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {report.comparisonWithLastMonth && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-trevio-50 to-slate-50 dark:from-trevio-900/20 dark:to-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {t('monthly.insights')}
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {report.comparisonWithLastMonth.spentChange >= 0 ? (
              <>{t('monthly.spendingIncreased', { amount: formatCurrencySymbol(Math.abs(report.comparisonWithLastMonth.spentChange), userCurrency), percent: report.comparisonWithLastMonth.spentChangePercent })}</>
            ) : (
              <>{t('monthly.spendingDecreased', { amount: formatCurrencySymbol(Math.abs(report.comparisonWithLastMonth.spentChange), userCurrency), percent: Math.abs(report.comparisonWithLastMonth.spentChangePercent) })}</>
            )}
          </p>
        </div>
      )}

      {gamificationInsight && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/30 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{t('monthly.insight')}</h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">{gamificationInsight}</p>
        </div>
      )}
    </div>
  );
}
