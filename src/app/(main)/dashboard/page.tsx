"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useServices } from "@/lib/services/service-provider";
import { formatCurrency } from "@/lib/utils";
import { Plus, Users, Plane, Dumbbell, Coffee } from "lucide-react";
import type { GroupTemplate } from "@/lib/types";

export default function DashboardPage() {
  const { group } = useServices();

  const { data: groups, isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => group.getUserGroups(),
  });

  const totalOwed = groups?.filter((g) => g.yourBalance > 0).reduce((sum, g) => sum + g.yourBalance, 0) ?? 0;
  const totalOwing = groups?.filter((g) => g.yourBalance < 0).reduce((sum, g) => sum + Math.abs(g.yourBalance), 0) ?? 0;

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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 md:gap-4 md:mb-8">
        <div className="rounded-2xl bg-trevio-50 p-4 md:p-5">
          <p className="text-xs md:text-sm font-medium text-trevio-700">You&apos;ll get</p>
          <p className="mt-1 text-xl md:text-2xl font-bold text-trevio-600">{formatCurrency(totalOwed)}</p>
        </div>
        <div className="rounded-2xl bg-red-50 p-4 md:p-5">
          <p className="text-xs md:text-sm font-medium text-red-700">You&apos;ll pay</p>
          <p className="mt-1 text-xl md:text-2xl font-bold text-red-500">{formatCurrency(totalOwing)}</p>
        </div>
      </div>

      {/* Groups */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
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
                    {g.memberCount} members · {formatCurrency(g.totalExpenses, g.currency)} total
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {balance > 0.01 ? (
                    <span className="rounded-lg bg-green-50 px-2 md:px-3 py-1 text-xs md:text-sm font-semibold text-green-600">
                      you&apos;ll get {formatCurrency(balance, g.currency)}
                    </span>
                  ) : balance < -0.01 ? (
                    <span className="rounded-lg bg-red-50 px-2 md:px-3 py-1 text-xs md:text-sm font-semibold text-red-500">
                      you&apos;ll pay {formatCurrency(Math.abs(balance), g.currency)}
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
