"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { JoinGroupDialog } from "@/components/join-group-dialog";
import { Plus, Users, Plane, Dumbbell, Coffee, Home, TrendingUp, TrendingDown, Wallet, ArrowRight, AlertCircle, LogIn } from "lucide-react";
import type { GroupTemplate } from "@/lib/types";

export default function DashboardPage() {
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const { group } = useServices();
  const { formatBase } = useCurrencyDisplay();
  const queryClient = useQueryClient();

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ["groups"],
    queryFn: () => group.getUserGroups(),
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const totalOwed = groups?.filter((g) => g.yourBalance > 0).reduce((sum, g) => sum + g.yourBalance, 0) ?? 0;
  const totalOwing = groups?.filter((g) => g.yourBalance < 0).reduce((sum, g) => sum + Math.abs(g.yourBalance), 0) ?? 0;
  const netBalance = totalOwed - totalOwing;
  const totalExpenses = groups?.reduce((sum, g) => sum + g.totalExpenses, 0) ?? 0;
  const activeGroups = groups?.filter((g) => !g.archived).length ?? 0;

  const templateIcon = (template: GroupTemplate) => {
    switch (template) {
      case "trip": return Plane;
      case "turf": return Dumbbell;
      case "household": return Home;
      default: return Coffee;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinDialog(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 md:px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Join Group</span>
          </button>
          <Link
            href="/groups/create"
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-3 md:px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Group</span>
          </Link>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="mb-6 md:mb-8">
        {/* Net balance hero card */}
        <div className={`rounded-2xl p-5 md:p-6 mb-3 md:mb-4 ${netBalance >= 0 ? "bg-gradient-to-br from-trevio-500 to-trevio-700" : "bg-gradient-to-br from-red-500 to-red-700"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Net Balance</p>
              <p className="mt-1 text-2xl md:text-3xl font-bold text-white">
                {netBalance >= 0 ? "+" : "-"}{formatBase(Math.abs(netBalance))}
              </p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
              {netBalance >= 0 ? <TrendingUp className="h-6 w-6 text-white" /> : <TrendingDown className="h-6 w-6 text-white" />}
            </div>
          </div>
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="rounded-xl bg-trevio-50 dark:bg-trevio-900/30 p-3 md:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-trevio-600 dark:text-trevio-400" />
              <p className="text-xs font-medium text-trevio-700 dark:text-trevio-300">You&apos;ll get</p>
            </div>
            <p className="text-sm md:text-lg font-bold text-trevio-600 dark:text-trevio-400">{formatBase(totalOwed)}</p>
          </div>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/30 p-3 md:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500 dark:text-red-400" />
              <p className="text-xs font-medium text-red-700 dark:text-red-400">You&apos;ll pay</p>
            </div>
            <p className="text-sm md:text-lg font-bold text-red-500 dark:text-red-400">{formatBase(totalOwing)}</p>
          </div>
          <div className="rounded-xl bg-slate-100 dark:bg-slate-800 p-3 md:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-600 dark:text-slate-400" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">Total Spent</p>
            </div>
            <p className="text-sm md:text-lg font-bold text-slate-700 dark:text-slate-300">{formatBase(totalExpenses)}</p>
          </div>
        </div>

        {/* Active groups count */}
        {activeGroups > 0 && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            Across <span className="font-semibold text-slate-700 dark:text-slate-300">{activeGroups}</span> active {activeGroups === 1 ? "group" : "groups"}
          </p>
        )}
      </div>

      {/* Groups */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <h3 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">Failed to load groups</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{(error as Error).message}</p>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ["groups"] })}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            Try Again
          </button>
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your Groups</h2>
          {groups.map((g) => {
            const Icon = templateIcon(g.template);
            const balance = g.yourBalance;
            const isHouseholdGroup = g.template === "household";
            const budgetProgress = isHouseholdGroup && g.monthlyBudget && g.monthlyBudget > 0
              ? Math.min((g.totalExpenses / g.monthlyBudget) * 100, 100)
              : 0;
            return (
              <Link
                key={g.groupId}
                href={`/groups/${g.groupId}`}
                className={`block rounded-2xl border p-3 md:p-4 transition hover:shadow-sm ${
                  isHouseholdGroup
                    ? "border-teal-200 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-900/10 hover:border-teal-300 dark:hover:border-teal-700"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-trevio-300 dark:hover:border-trevio-700"
                }`}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl shrink-0 ${
                    isHouseholdGroup
                      ? "bg-teal-100 dark:bg-teal-900/30"
                      : "bg-trevio-50 dark:bg-trevio-900/30"
                  }`}>
                    <Icon className={`h-5 w-5 md:h-6 md:w-6 ${
                      isHouseholdGroup
                        ? "text-teal-600 dark:text-teal-400"
                        : "text-trevio-600 dark:text-trevio-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{g.name}</p>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                      {g.memberCount} members · {formatBase(g.totalExpenses)} total
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {isHouseholdGroup ? (
                      <div className="space-y-0.5">
                        <p className="text-xs font-medium text-teal-600 dark:text-teal-400">
                          {formatBase(g.totalExpenses)}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">spent</p>
                      </div>
                    ) : balance > 0.01 ? (
                      <span className="rounded-lg bg-green-50 dark:bg-green-900/20 px-2 md:px-3 py-1 text-xs md:text-sm font-semibold text-green-600 dark:text-green-400">
                        you&apos;ll get {formatBase(balance)}
                      </span>
                    ) : balance < -0.01 ? (
                      <span className="rounded-lg bg-red-50 dark:bg-red-900/20 px-2 md:px-3 py-1 text-xs md:text-sm font-semibold text-red-500 dark:text-red-400">
                        you&apos;ll pay {formatBase(Math.abs(balance))}
                      </span>
                    ) : (
                      <span className="rounded-lg bg-slate-50 dark:bg-slate-800 px-2 md:px-3 py-1 text-xs md:text-sm font-medium text-slate-400 dark:text-slate-500">
                        settled up
                      </span>
                    )}
                  </div>
                </div>
                {isHouseholdGroup && g.monthlyBudget && g.monthlyBudget > 0 && (
                  <div className="mt-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Budget</span>
                      <span className={`text-[10px] font-semibold ${
                        budgetProgress >= 100 ? "text-red-500" : budgetProgress >= 80 ? "text-amber-500" : "text-teal-600 dark:text-teal-400"
                      }`}>
                        {formatBase(g.totalExpenses)} / {formatBase(g.monthlyBudget)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          budgetProgress >= 100 ? "bg-red-500" : budgetProgress >= 80 ? "bg-amber-500" : "bg-teal-500"
                        }`}
                        style={{ width: `${budgetProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
          <Link
            href="/groups"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            View All Groups
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-trevio-50 dark:bg-trevio-900/30">
            <Users className="h-10 w-10 text-trevio-400 dark:text-trevio-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">No groups yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
            Create your first group to start splitting bills with friends. Perfect for trips, turf sessions, or casual splits!
          </p>
          <Link
            href="/groups/create"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <Plus className="h-4 w-4" />
            Create Group
          </Link>
        </div>
      )}

      <JoinGroupDialog open={showJoinDialog} onClose={() => setShowJoinDialog(false)} />
    </div>
  );
}
