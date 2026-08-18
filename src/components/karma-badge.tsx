"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { queryKeys } from "@/lib/constants/query-keys";
import { Star } from "lucide-react";

const TIER_STYLES: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  silver: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
  gold: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  platinum: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
};

export function KarmaBadge({ uid }: { uid: string }) {
  const { karma } = useServices();
  const t = useTranslations("karma");

  const { data: breakdown } = useQuery({
    queryKey: queryKeys.publicKarma(uid),
    queryFn: () => karma.getPublicKarma(uid),
    staleTime: 60_000,
  });

  if (!breakdown) return null;

  const tierStyle = TIER_STYLES[breakdown.tier] || TIER_STYLES.bronze;
  const tierLabel = t(`tier.${breakdown.tier}` as const);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
      <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tierStyle}`}>
        <Star className="h-3 w-3" />
        <span>{t("publicBadge")}: {breakdown.score}</span>
      </div>
      <span className="text-xs text-white/80 dark:text-white/80 font-medium">{tierLabel}</span>
    </div>
  );
}
