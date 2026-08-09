"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

interface UsePaginatedQueryOptions<T, R> {
  queryKey: string[];
  queryFn: (pageSize: number, lastId?: string) => Promise<R>;
  pageSize?: number;
  enabled?: boolean;
  extractItems: (result: R) => T[];
  extractHasMore: (result: R) => boolean;
  extractLastId: (result: R) => string | null;
}

interface UsePaginatedQueryReturn<T> {
  items: T[];
  isLoading: boolean;
  error: unknown;
  hasMore: boolean;
  loadingMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

export function usePaginatedQuery<T, R>(
  options: UsePaginatedQueryOptions<T, R>
): UsePaginatedQueryReturn<T> {
  const {
    queryKey,
    queryFn,
    pageSize = 20,
    enabled = true,
    extractItems,
    extractHasMore,
    extractLastId,
  } = options;

  const queryClient = useQueryClient();
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastIdRef = useRef<string | null>(null);
  const loadedKeyRef = useRef<string>("");

  const fetchPage = useCallback(
    async (isInitial: boolean) => {
      if (!enabled) return;
      if (isInitial) {
        setIsLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const result = await queryFn(pageSize, isInitial ? undefined : lastIdRef.current ?? undefined);
        const newItems = extractItems(result);
        if (isInitial) {
          setItems(newItems);
        } else {
          setItems((prev) => [...prev, ...newItems]);
        }
        setHasMore(extractHasMore(result));
        lastIdRef.current = extractLastId(result);
      } catch (e) {
        setError(e);
      } finally {
        if (isInitial) setIsLoading(false);
        else setLoadingMore(false);
      }
    },
    [enabled, queryFn, pageSize, extractItems, extractHasMore, extractLastId]
  );

  const keyString = JSON.stringify(queryKey);
  useEffect(() => {
    if (!enabled) {
      loadedKeyRef.current = "";
      return;
    }
    if (loadedKeyRef.current === keyString) return;
    loadedKeyRef.current = keyString;
    lastIdRef.current = null;
    setItems([]);
    fetchPage(true);
  }, [enabled, keyString, fetchPage]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      fetchPage(false);
    }
  }, [hasMore, loadingMore, fetchPage]);

  const refresh = useCallback(() => {
    lastIdRef.current = null;
    setItems([]);
    queryClient.invalidateQueries({ queryKey });
    fetchPage(true);
  }, [fetchPage, queryClient, queryKey]);

  return { items, isLoading, error, hasMore, loadingMore, loadMore, refresh };
}
