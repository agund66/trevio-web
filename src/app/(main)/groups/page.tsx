"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { Plus, Users, Plane, Dumbbell, Coffee, AlertCircle, LogIn } from "lucide-react";
import type { GroupTemplate } from "@/lib/types";
import { JoinGroupDialog } from "@/components/join-group-dialog";
import { queryKeys } from "@/lib/constants/query-keys";

export default function GroupsPage() {
  const t = useTranslations("groups");
  const td = useTranslations("dashboard");
  const { group } = useServices();
  const { formatBase } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const [showJoinDialog, setShowJoinDialog] = useState(false);

  const { data: groups, isLoading, error } = useQuery({
    queryKey: queryKeys.groups,
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("list.title")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowJoinDialog(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-3 md:px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">{td("joinGroup")}</span>
          </button>
          <Link
            href="/groups/create"
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-3 md:px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{td("newGroup")}</span>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 dark:border-slate-700 border-t-trevio-600" />
        </div>
      ) : error ? (
        <div className="flex min-h-[50vh] items-center justify-center text-center">
          <div className="max-w-md">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{td("error.failedToLoad")}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{(error as Error).message}</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: queryKeys.groups })}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
            >
              {td("error.tryAgain")}
            </button>
          </div>
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => {
            const Icon = templateIcon(g.template);
            const balance = g.yourBalance;
            const balanceColor =
              balance > 0.01
                ? "text-green-600 dark:text-green-400"
                : balance < -0.01
                ? "text-red-600 dark:text-red-400"
                : "text-slate-500 dark:text-slate-400";
            const balanceText =
              balance > 0.01
                ? `${t("list.owesYou")} ${formatBase(balance)}`
                : balance < -0.01
                ? `${t("list.youOwe")} ${formatBase(Math.abs(balance))}`
                : t("list.settledUp");

            return (
              <Link
                key={g.groupId}
                href={`/groups/${g.groupId}`}
                className="group rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:border-trevio-300 dark:hover:border-trevio-700 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-trevio-50 dark:bg-trevio-900/30 text-trevio-600 dark:text-trevio-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold text-slate-900 dark:text-slate-100 group-hover:text-trevio-700 dark:group-hover:text-trevio-400">
                        {g.name}
                      </h3>
                      {g.archived && (
                        <span className="shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {t("list.archived")}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("list.membersCount", { count: g.memberCount })}
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
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
            <Users className="h-7 w-7 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{td("empty.noGroups")}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("list.emptyHint")}
          </p>
          <Link
            href="/groups/create"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <Plus className="h-4 w-4" />
            {td("empty.createGroup")}
          </Link>
        </div>
      )}
      <JoinGroupDialog open={showJoinDialog} onClose={() => setShowJoinDialog(false)} />
    </div>
  );
}
