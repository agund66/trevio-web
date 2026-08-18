"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { queryKeys } from "@/lib/constants/query-keys";
import { Star, RotateCw, ChevronDown, ChevronUp } from "lucide-react";
import type { KarmaBreakdown, KarmaComponents } from "@/lib/types";

const TIER_STYLES: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  silver: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  platinum: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

const TIER_ICON_COLORS: Record<string, string> = {
  bronze: "text-amber-500 dark:text-amber-400",
  silver: "text-slate-400 dark:text-slate-300",
  gold: "text-yellow-500 dark:text-yellow-400",
  platinum: "text-cyan-500 dark:text-cyan-400",
};

const COMPONENT_META: {
  key: keyof KarmaComponents;
  labelKey: string;
  descKey: string;
  max: number;
}[] = [
  { key: "reliabilityScore", labelKey: "reliability", descKey: "reliabilityDesc", max: 300 },
  { key: "generosityScore", labelKey: "generosity", descKey: "generosityDesc", max: 250 },
  { key: "consistencyScore", labelKey: "consistency", descKey: "consistencyDesc", max: 200 },
  { key: "settlementSpeedScore", labelKey: "settlementSpeed", descKey: "settlementSpeedDesc", max: 150 },
  { key: "groupHealthScore", labelKey: "groupHealth", descKey: "groupHealthDesc", max: 100 },
];

export function KarmaCard() {
  const { karma } = useServices();
  const { user, refreshUser } = useAuth();
  const t = useTranslations("karma");
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: breakdown, isLoading } = useQuery<KarmaBreakdown>({
    queryKey: queryKeys.karmaBreakdown,
    queryFn: () => karma.getKarmaBreakdown(),
  });

  const refreshMutation = useMutation({
    mutationFn: () => karma.refreshKarma(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.karmaBreakdown, data);
    },
  });

  const togglePublicMutation = useMutation({
    mutationFn: (isPublic: boolean) => karma.setKarmaPublic(isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.karmaBreakdown });
      refreshUser();
    },
  });

  const tier = (breakdown?.tier || "bronze").toLowerCase();
  const isPublic = user?.karmaPublic ?? false;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className={`h-5 w-5 ${TIER_ICON_COLORS[tier] ?? TIER_ICON_COLORS.bronze}`} fill="currentColor" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("title")}</span>
        </div>
        <button
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t("refresh")}
        >
          <RotateCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 dark:border-trevio-800 border-t-trevio-600" />
        </div>
      ) : !breakdown ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t("noData")}</p>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      ) : (
        <>
          {/* Score display */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">{breakdown.score}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                TIER_STYLES[tier] ?? TIER_STYLES.bronze
              }`}
            >
              {tier}
            </span>
          </div>

          {/* Expandable breakdown */}
          <div className="border-t border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-between py-3 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-slate-100"
            >
              {t("breakdown")}
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {expanded && (
              <div className="space-y-4 pb-3">
                {COMPONENT_META.map((meta) => {
                  const value = breakdown.components[meta.key] ?? 0;
                  const fraction = Math.min(100, (value / meta.max) * 100);
                  return (
                    <div key={meta.key}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-700 dark:text-slate-300 truncate">{t(meta.labelKey)}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{t(meta.descKey)}</p>
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
                          {value} / {meta.max}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-trevio-600 transition-all"
                          style={{ width: `${fraction}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Public toggle */}
          <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
            <div className="flex items-center justify-between">
              <div className="pr-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("makePublic")}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t("publicDescription")}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isPublic}
                onClick={() => togglePublicMutation.mutate(!isPublic)}
                disabled={togglePublicMutation.isPending}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed ${
                  isPublic ? "bg-trevio-600" : "bg-slate-200 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    isPublic ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
            <p className={`mt-2 text-xs ${isPublic ? "text-green-600 dark:text-green-400" : "text-slate-500 dark:text-slate-400"}`}>
              {isPublic ? t("shared") : t("notShared")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
