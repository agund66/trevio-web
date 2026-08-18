"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { queryKeys } from "@/lib/constants/query-keys";
import { Sparkles, AlertCircle, Info, CheckCircle, X } from "lucide-react";
import type { Nudge } from "@/lib/types";

const severityConfig = {
  warning: { icon: AlertCircle, color: "text-amber-500" },
  info: { icon: Info, color: "text-blue-500" },
  positive: { icon: CheckCircle, color: "text-green-500" },
};

const MAX_VISIBLE = 3;

export function NudgeInsightsCard() {
  const { nudge } = useServices();
  const t = useTranslations("nudges");
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);

  const { data: nudges, isLoading } = useQuery<Nudge[]>({
    queryKey: queryKeys.activeNudges,
    queryFn: () => nudge.getActiveNudges(),
  });

  const dismissMutation = useMutation({
    mutationFn: (nudgeId: string) => nudge.dismissNudge(nudgeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeNudges });
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => nudge.generateNudges(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeNudges });
    },
  });

  const activeNudges = nudges?.filter((n) => !n.dismissedAt) ?? [];
  const visibleNudges = expanded ? activeNudges : activeNudges.slice(0, MAX_VISIBLE);
  const hasMore = activeNudges.length > MAX_VISIBLE;

  // Empty state
  if (!isLoading && activeNudges.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
          <Sparkles className="h-5 w-5" />
          <p className="text-sm">{t("noNudges")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t("title")}</span>
          {activeNudges.length > 0 && (
            <span className="rounded-full bg-trevio-100 dark:bg-trevio-900/40 px-2 py-0.5 text-xs font-semibold text-trevio-700 dark:text-trevio-300">
              {activeNudges.length}
            </span>
          )}
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="inline-flex items-center justify-center rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={t("generate")}
        >
          <Sparkles className={`h-4 w-4 ${generateMutation.isPending ? "animate-pulse" : ""}`} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-trevio-200 dark:border-trevio-800 border-t-trevio-600" />
        </div>
      ) : (
        <>
          {/* Nudge items */}
          <div className="space-y-0">
            {visibleNudges.map((item, index) => {
              const config = severityConfig[item.severity] ?? severityConfig.info;
              const Icon = config.icon;
              return (
                <div
                  key={item.nudgeId}
                  className={index > 0 ? "border-t border-slate-100 dark:border-slate-700 pt-3 mt-3" : ""}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100">{item.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.body}</p>
                      {item.actionLabel && (
                        <button
                          className="mt-1.5 inline-flex items-center rounded-lg bg-trevio-50 dark:bg-trevio-900/30 px-2 py-1 text-xs font-semibold text-trevio-600 dark:text-trevio-400 transition hover:bg-trevio-100 dark:hover:bg-trevio-900/50"
                        >
                          {item.actionLabel}
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => dismissMutation.mutate(item.nudgeId)}
                      disabled={dismissMutation.isPending}
                      className="shrink-0 rounded-md p-1 text-slate-300 dark:text-slate-600 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-500 dark:hover:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={t("dismiss")}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* View All */}
          {hasMore && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 w-full text-center text-xs font-semibold text-trevio-600 dark:text-trevio-400 transition hover:text-trevio-700 dark:hover:text-trevio-300"
            >
              {expanded ? t("viewLess") : t("viewAll")}
            </button>
          )}
        </>
      )}
    </div>
  );
}
