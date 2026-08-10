"use client";

import { CloudOff } from "lucide-react";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";

/**
 * A thin banner shown at the top of the main content area when the browser
 * reports no network connection. Firestore IndexedDB persistence keeps cached
 * data readable and queues writes, so users can continue to browse; the banner
 * explains why data may be stale.
 */
export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="flex items-center gap-2.5 bg-amber-500 px-4 py-2.5 text-white">
      <CloudOff className="h-4 w-4 shrink-0" />
      <p className="text-sm font-medium">
        You&apos;re offline. Some data may be outdated.
      </p>
    </div>
  );
}
