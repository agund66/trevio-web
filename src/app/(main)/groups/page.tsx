"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { Plus, Users, Plane, Dumbbell, Coffee, AlertCircle } from "lucide-react";
import type { GroupTemplate } from "@/lib/types";

export default function GroupsPage() {
  const { group } = useServices();
  const { formatBase } = useCurrencyDisplay();

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ["groups"],
    queryFn: () => group.getUserGroups(),
  });

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
        <h1 className="text-2xl font-bold text-slate-900">Groups</h1>
        <Link
          href="/groups/create"
          className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
        >
          <Plus className="h-4 w-4" />
          New Group
        </Link>
      </div>

      {isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 border-t-trevio-600" />
        </div>
      ) : error ? (
        <div className="flex min-h-[50vh] items-center justify-center text-center">
          <div className="max-w-md">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Failed to load groups</h2>
            <p className="mt-1 text-sm text-slate-500">{(error as Error).message}</p>
          </div>
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const Icon = templateIcon(g.template);
            const balance = g.yourBalance;
            const balanceColor =
              balance > 0.01
                ? "text-green-600"
                : balance < -0.01
                ? "text-red-600"
                : "text-slate-500";
            const balanceText =
              balance > 0.01
                ? `owes you ${formatBase(balance)}`
                : balance < -0.01
                ? `you owe ${formatBase(Math.abs(balance))}`
                : "settled up";

            return (
              <Link
                key={g.groupId}
                href={`/groups/${g.groupId}`}
                className="group rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-trevio-300 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-trevio-50 text-trevio-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900 group-hover:text-trevio-700">
                        {g.name}
                      </h3>
                      {g.archived && (
                        <span className="shrink-0 rounded-lg bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          Archived
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500">
                      {g.memberCount} {g.memberCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>
                <p className={`mt-3 text-sm font-medium ${balanceColor}`}>
                  {balanceText}
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Users className="h-7 w-7 text-slate-400" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No groups yet</h3>
          <p className="mt-1 text-sm text-slate-500">
            Create your first group to start splitting bills with friends.
          </p>
          <Link
            href="/groups/create"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <Plus className="h-4 w-4" />
            Create Group
          </Link>
        </div>
      )}
    </div>
  );
}
