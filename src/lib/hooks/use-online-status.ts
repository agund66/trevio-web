"use client";

import { useEffect, useState } from "react";

/**
 * Reactively tracks the browser's online/offline status using
 * `navigator.onLine` and the `online`/`offline` window events.
 *
 * SSR-safe: the initial state is always `true` (matching the server's
 * assumption), and the real value is set in a `useEffect` after hydration
 * to avoid hydration mismatches.
 *
 * @returns `true` when the browser reports an active network connection.
 */
export function useOnlineStatus(): boolean {
  // Start with `true` on both server and client to avoid hydration mismatch.
  // The real value is applied in useEffect after mount.
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    // Set the real value from the browser after hydration.
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
