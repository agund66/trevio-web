"use client";

import { Award, Users, Lightbulb } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HouseholdGamification } from "@/lib/types";

interface GamificationCardProps {
  gamification: HouseholdGamification;
  isToday?: boolean;
}

export function GamificationCard({ gamification, isToday = true }: GamificationCardProps) {
  const t = useTranslations("household");
  const BADGE_LABELS: Record<string, string> = {
    streak_champion: t('gamification.streakChampionTitle'),
    budget_master: t('gamification.budgetMasterTitle'),
    all_stars: t('gamification.allStarsTitle'),
  };
  const participationPct = Math.min(gamification.participationToday, 100);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
      <div className="flex items-center gap-3">
        {/* Monthly badge (compact) */}
        {gamification.monthlyBadge && (
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-trevio-50 dark:bg-trevio-900/20 text-trevio-600 dark:text-trevio-400">
              <Award className="h-3.5 w-3.5" />
            </span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {BADGE_LABELS[gamification.monthlyBadge] ?? gamification.monthlyBadge}
            </p>
          </div>
        )}

        {/* Participation — only when viewing today */}
        {isToday && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 shrink-0 text-slate-500 dark:text-slate-400">
              <Users className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                {gamification.membersLoggedToday}/{gamification.totalMembers} logged
              </span>
            </div>
            <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-trevio-500 transition-all"
                style={{ width: `${participationPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Insight (compact) */}
      {gamification.insightMessage && (
        <div className="mt-2 flex items-start gap-1.5">
          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-snug">
            {gamification.insightMessage}
          </p>
        </div>
      )}
    </div>
  );
}
