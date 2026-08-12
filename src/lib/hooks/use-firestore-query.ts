"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Query, DocumentData, QuerySnapshot } from "firebase/firestore";

/**
 * Subscribe to a Firestore query in real-time and feed the results into
 * the React Query cache so all consumers of the same query key see live
 * updates.  With IndexedDB persistent cache enabled (see firebase.ts),
 * the first emission arrives instantly from cache, followed by a silent
 * server update — eliminating the full-screen loader on repeat visits.
 *
 * Usage:
 *   useFirestoreSubscription(
 *     queryKeys.groups,
 *     () => query(collection(db, "groups"), where(...)),
 *     (snapshot) => mapToGroups(snapshot)
 *   );
 *
 * The hook is intentionally minimal: it only manages the listener
 * lifecycle and cache writes.  Components read the data via the normal
 * `useQuery({ queryKey })` call, which will return the cached data
 * instantly.
 *
 * @param queryKey   React Query cache key to write to
 * @param queryFactory  Function that returns the Firestore Query to listen on
 * @param mapper     Function that converts the QuerySnapshot to the cached data shape
 */
export function useFirestoreSubscription<T>(
  queryKey: readonly unknown[],
  queryFactory: () => Query<DocumentData>,
  mapper: (snapshot: QuerySnapshot<DocumentData>) => T
): void {
  const queryClient = useQueryClient();
  const queryFactoryRef = useRef(queryFactory);
  const mapperRef = useRef(mapper);

  // Keep refs updated without re-subscribing on every render
  queryFactoryRef.current = queryFactory;
  mapperRef.current = mapper;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    // Import onSnapshot dynamically so the hook doesn't pull the entire
    // firestore module into every component that uses it at module-eval time.
    import("firebase/firestore").then(({ onSnapshot }) => {
      if (cancelled) return;
      try {
        const q = queryFactoryRef.current();
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const data = mapperRef.current(snapshot);
            queryClient.setQueryData(queryKey, data);
          },
          (error) => {
            console.warn(`[useFirestoreSubscription] Listener error for key ${JSON.stringify(queryKey)}:`, error);
          }
        );
      } catch (e) {
        console.warn(`[useFirestoreSubscription] Failed to start listener:`, e);
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(queryKey)]);
}

/**
 * Subscribe to a single Firestore document in real-time and feed the
 * result into the React Query cache.
 *
 * @param queryKey   React Query cache key
 * @param docRefFactory  Function that returns the Firestore DocumentReference
 * @param mapper     Function that converts the doc snapshot to the cached data shape (or null if not exists)
 */
export function useFirestoreDocSubscription<T>(
  queryKey: readonly unknown[],
  docRefFactory: () => import("firebase/firestore").DocumentReference<DocumentData>,
  mapper: (doc: import("firebase/firestore").DocumentSnapshot<DocumentData>) => T | null
): void {
  const queryClient = useQueryClient();
  const docRefFactoryRef = useRef(docRefFactory);
  const mapperRef = useRef(mapper);

  docRefFactoryRef.current = docRefFactory;
  mapperRef.current = mapper;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    import("firebase/firestore").then(({ onSnapshot }) => {
      if (cancelled) return;
      try {
        const ref = docRefFactoryRef.current();
        unsubscribe = onSnapshot(
          ref,
          (docSnapshot) => {
            const data = mapperRef.current(docSnapshot);
            queryClient.setQueryData(queryKey, data);
          },
          (error) => {
            console.warn(`[useFirestoreDocSubscription] Listener error for key ${JSON.stringify(queryKey)}:`, error);
          }
        );
      } catch (e) {
        console.warn(`[useFirestoreDocSubscription] Failed to start listener:`, e);
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(queryKey)]);
}

/**
 * Subscribe to a Firestore query, then asynchronously enrich each
 * emission with secondary document fetches before writing to the
 * React Query cache.  Used for patterns like getUserGroups() where
 * a collectionGroup("members") listener is followed by per-group
 * doc fetches.
 *
 * @param queryKey   React Query cache key
 * @param queryFactory  Function that returns the Firestore Query to listen on
 * @param enricher   Async function that takes the snapshot and returns the final data
 */
export function useFirestoreAsyncSubscription<T>(
  queryKey: readonly unknown[],
  queryFactory: () => Query<DocumentData>,
  enricher: (snapshot: QuerySnapshot<DocumentData>) => Promise<T>
): void {
  const queryClient = useQueryClient();
  const queryFactoryRef = useRef(queryFactory);
  const enricherRef = useRef(enricher);

  queryFactoryRef.current = queryFactory;
  enricherRef.current = enricher;

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;
    let emissionId = 0;

    import("firebase/firestore").then(({ onSnapshot }) => {
      if (cancelled) return;
      try {
        const q = queryFactoryRef.current();
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const currentEmission = ++emissionId;
            enricherRef.current(snapshot).then((data) => {
              // Only write if this is still the latest emission
              // (prevents out-of-order writes from stale snapshots)
              if (!cancelled && currentEmission === emissionId) {
                queryClient.setQueryData(queryKey, data);
              }
            }).catch((e) => {
              console.warn(`[useFirestoreAsyncSubscription] Enricher error for key ${JSON.stringify(queryKey)}:`, e);
            });
          },
          (error) => {
            console.warn(`[useFirestoreAsyncSubscription] Listener error for key ${JSON.stringify(queryKey)}:`, error);
          }
        );
      } catch (e) {
        console.warn(`[useFirestoreAsyncSubscription] Failed to start listener:`, e);
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(queryKey)]);
}
