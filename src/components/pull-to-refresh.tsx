"use client";

import { ReactNode } from "react";
import { Loader2, ArrowDown } from "lucide-react";
import { usePullToRefresh } from "@/lib/hooks/use-pull-to-refresh";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
  className?: string;
}

/**
 * Pull-to-refresh wrapper for touch devices.
 * Shows a spinner indicator when pulled down past threshold.
 * Falls back gracefully on desktop (no effect).
 */
export function PullToRefresh({ onRefresh, children, className }: PullToRefreshProps) {
  const { pullDistance, isRefreshing, touchHandlers } = usePullToRefresh({ onRefresh });

  const progress = Math.min(pullDistance / 80, 1);

  return (
    <div
      {...touchHandlers}
      className={className}
      style={{ position: "relative" }}
    >
      {/* Pull indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center absolute left-0 right-0 z-10"
          style={{
            top: `${isRefreshing ? 80 : pullDistance}px`,
            transform: `translateY(-100%)`,
            transition: isRefreshing ? "none" : "top 0.2s ease-out",
          }}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 shadow-md">
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin text-trevio-600 dark:text-trevio-400" />
            ) : (
              <ArrowDown
                className="h-4 w-4 text-trevio-600 dark:text-trevio-400 transition-transform"
                style={{ transform: `rotate(${progress * 180}deg)` }}
              />
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
