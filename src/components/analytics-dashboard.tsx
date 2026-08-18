"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { Expense, Member } from "@/lib/types";
import { computeGroupAnalytics } from "@/lib/utils/analytics";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { formatFullDate } from "@/lib/utils/date";
import { useAuth } from "@/lib/hooks/use-auth";
import { Avatar } from "@/components/avatar";
import {
  TrendingUp,
  Receipt,
  Calendar,
  Award,
  PieChart,
  BarChart3,
  Activity,
  ArrowUpRight,
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  food: "bg-orange-500",
  transport: "bg-blue-500",
  shopping: "bg-purple-500",
  turf: "bg-green-500",
  accommodation: "bg-pink-500",
  other: "bg-slate-400",
};

interface AnalyticsDashboardProps {
  groupId: string;
  groupName: string;
  groupCurrency: string;
  expenses: Expense[];
  members: Member[];
}

export function AnalyticsDashboard({ groupId, groupName, groupCurrency, expenses, members }: AnalyticsDashboardProps) {
  const { user } = useAuth();
  const { formatGroup } = useCurrencyDisplay();
  const t = useTranslations("groups");
  const CATEGORY_LABELS: Record<string, string> = {
    food: t('analytics.food'),
    transport: t('analytics.transport'),
    shopping: t('analytics.shopping'),
    turf: t('analytics.turf'),
    accommodation: t('analytics.stay'),
    other: t('analytics.other'),
  };

  const analytics = useMemo(
    () => computeGroupAnalytics(groupId, groupName, expenses, members, user?.uid || ""),
    [groupId, groupName, expenses, members, user?.uid]
  );

  const maxTrendAmount = Math.max(...analytics.monthlyTrends.map((t) => t.totalAmount), 1);
  const maxMemberPaid = Math.max(...analytics.memberSpending.map((m) => m.totalPaid), 1);

  return (
    <div className="space-y-6">
      {/* Key Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Receipt className="h-4 w-4" />}
          label={t('analytics.totalSpent')}
          value={formatGroup(analytics.totalExpenses, groupCurrency)}
          color="trevio"
        />
        <StatCard
          icon={<BarChart3 className="h-4 w-4" />}
          label={t('analytics.avgExpense')}
          value={formatGroup(analytics.avgExpenseAmount, groupCurrency)}
          color="blue"
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label={t('analytics.expenses')}
          value={String(analytics.expenseCount)}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={t('analytics.recentActivity')}
          value={`${analytics.recentActivityRate}%`}
          color="green"
        />
      </div>

      {/* Monthly Trend Chart */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('analytics.monthlySpending')}</h3>
        </div>
        <div className="flex items-end justify-between gap-2 h-40">
          {analytics.monthlyTrends.map((trend) => (
            <div key={trend.month} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex flex-col justify-end items-center" style={{ height: "120px" }}>
                <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">
                  {trend.totalAmount > 0 ? formatGroup(trend.totalAmount, groupCurrency) : ""}
                </div>
                <div
                  className="w-full max-w-[60px] rounded-t-lg bg-gradient-to-t from-trevio-600 to-trevio-400 transition-all hover:from-trevio-700 hover:to-trevio-500"
                  style={{
                    height: `${Math.max((trend.totalAmount / maxTrendAmount) * 80, 2)}px`,
                    minHeight: "2px",
                  }}
                />
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{trend.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      {analytics.categoryBreakdown.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('analytics.byCategory')}</h3>
          </div>
          <div className="space-y-3">
            {analytics.categoryBreakdown.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_COLORS[cat.category] || "bg-slate-400"}`} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {CATEGORY_LABELS[cat.category] || cat.category}
                    </span>
                    <span className="text-xs text-slate-400">({cat.expenseCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatGroup(cat.totalAmount, groupCurrency)}
                    </span>
                    <span className="text-xs text-slate-400">{cat.percentage}%</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[cat.category] || "bg-slate-400"}`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Member Spending Leaderboard */}
      {analytics.memberSpending.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('analytics.topSpenders')}</h3>
          </div>
          <div className="space-y-3">
            {analytics.memberSpending
              .filter((m) => m.totalPaid > 0)
              .slice(0, 5)
              .map((member, index) => (
                <div key={member.uid} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-slate-400 w-5">{index + 1}</span>
                  <Avatar photoURL={member.photoURL} displayName={member.displayName} className="h-8 w-8" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {member.displayName}
                    </p>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden mt-1">
                      <div
                        className="h-full rounded-full bg-trevio-500"
                        style={{ width: `${(member.totalPaid / maxMemberPaid) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatGroup(member.totalPaid, groupCurrency)}
                    </p>
                    <p className="text-[10px] text-slate-400">{t('analytics.expensesCount', { count: member.expenseCount })}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Highest Expense & Insights */}
      {analytics.highestExpense && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-trevio-50 to-slate-50 dark:from-trevio-900/20 dark:to-slate-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpRight className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{t('analytics.biggestExpense')}</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {analytics.highestExpense.description}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {analytics.highestExpense.date
                  ? formatFullDate(analytics.highestExpense.date)
                  : ""}
              </p>
            </div>
            <p className="text-lg font-bold text-trevio-600 dark:text-trevio-400">
              {formatGroup(analytics.highestExpense.amount, groupCurrency)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "trevio" | "blue" | "purple" | "green";
}) {
  const colorMap = {
    trevio: "bg-trevio-50 dark:bg-trevio-900/30 text-trevio-600 dark:text-trevio-400",
    blue: "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    purple: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    green: "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400",
  };
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      <div className={`inline-flex items-center justify-center h-8 w-8 rounded-lg ${colorMap[color]} mb-2`}>
        {icon}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">{label}</p>
      <p className="text-base md:text-lg font-bold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}
