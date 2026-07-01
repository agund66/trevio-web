"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { Plus, Users, Plane, Dumbbell, Coffee, TrendingUp, TrendingDown, Wallet, ArrowRight, AlertCircle } from "lucide-react";
import type { GroupTemplate } from "@/lib/types";

export default function DashboardPage() {
  const { group } = useServices();
  const { formatBase } = useCurrencyDisplay();

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ["groups"],
    queryFn: () => group.getUserGroups(),
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
      default: return Coffee;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <Link
          href="/groups/create"
          className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
        >
          <Plus className="h-4 w-4" />
          New Group
        </Link>
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
          <div className="rounded-xl bg-trevio-50 p-3 md:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 md:h-4 md:w-4 text-trevio-600" />
              <p className="text-xs font-medium text-trevio-700">You&apos;ll get</p>
            </div>
            <p className="text-sm md:text-lg font-bold text-trevio-600">{formatBase(totalOwed)}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3 md:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingDown className="h-3.5 w-3.5 md:h-4 md:w-4 text-red-500" />
              <p className="text-xs font-medium text-red-700">You&apos;ll pay</p>
            </div>
            <p className="text-sm md:text-lg font-bold text-red-500">{formatBase(totalOwing)}</p>
          </div>
          <div className="rounded-xl bg-slate-100 p-3 md:p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4 text-slate-600" />
              <p className="text-xs font-medium text-slate-600">Total Spent</p>
            </div>
            <p className="text-sm md:text-lg font-bold text-slate-700">{formatBase(totalExpenses)}</p>
          </div>
        </div>

        {/* Active groups count */}
        {activeGroups > 0 && (
          <p className="mt-3 text-sm text-slate-500">
            Across <span className="font-semibold text-slate-700">{activeGroups}</span> active {activeGroups === 1 ? "group" : "groups"}
          </p>
        )}
      </div>

      {/* Groups */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <h3 className="mt-3 text-lg font-semibold text-slate-900">Failed to load groups</h3>
          <p className="mt-1 text-sm text-slate-500">{(error as Error).message}</p>
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Your Groups</h2>
          {groups.map((g) => {
            const Icon = templateIcon(g.template);
            const balance = g.yourBalance;
            return (
              <Link
                key={g.groupId}
                href={`/groups/${g.groupId}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 md:gap-4 transition hover:border-trevio-300 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-trevio-50 shrink-0">
                  <Icon className="h-5 w-5 md:h-6 md:w-6 text-trevio-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{g.name}</p>
                  <p className="text-xs md:text-sm text-slate-500">
                    {g.memberCount} members · {formatBase(g.totalExpenses)} total
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {balance > 0.01 ? (
                    <span className="rounded-lg bg-green-50 px-2 md:px-3 py-1 text-xs md:text-sm font-semibold text-green-600">
                      you&apos;ll get {formatBase(balance)}
                    </span>
                  ) : balance < -0.01 ? (
                    <span className="rounded-lg bg-red-50 px-2 md:px-3 py-1 text-xs md:text-sm font-semibold text-red-500">
                      you&apos;ll pay {formatBase(Math.abs(balance))}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-50 px-2 md:px-3 py-1 text-xs md:text-sm font-medium text-slate-400">
                      settled up
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
          <Link
            href="/groups"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            View All Groups
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-trevio-50">
            <Users className="h-10 w-10 text-trevio-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No groups yet</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-500">
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
    </div>
  );
}
