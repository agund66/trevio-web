"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  enabled?: boolean;
}

/**
 * Pull-to-refresh hook for touch devices.
 * Attach `touchStart`, `touchMove`, `touchEnd` to the scroll container.
 * The `pullDistance` can be used to drive a visual indicator.
 */
export function usePullToRefresh({ onRefresh, threshold = 80, enabled = true }: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enabled || isRefreshing) return;
    // Only start pulling if scrolled to top
    if (e.currentTarget.scrollTop > 0) return;
    startYRef.current = e.touches[0].clientY;
    pullingRef.current = true;
  }, [enabled, isRefreshing]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pullingRef.current || isRefreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      // Dampen the pull distance
      const dampened = Math.min(delta * 0.5, threshold * 1.5);
      setPullDistance(dampened);
    }
  }, [isRefreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      setPullDistance(threshold);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, threshold, onRefresh]);

  // Reset on unmount
  useEffect(() => {
    return () => {
      pullingRef.current = false;
    };
  }, []);

  return {
    pullDistance,
    isRefreshing,
    touchHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
