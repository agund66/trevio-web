"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import type { BroadcastMessage, BroadcastPriority } from "@/lib/types";
import { AlertTriangle, Wrench, Info, X, Check } from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const priorityStyles: Record<
  BroadcastPriority,
  { bg: string; border: string; headerBg: string; text: string; icon: React.ComponentType<{ className?: string }>; iconColor: string; btn: string }
> = {
  critical: {
    bg: "bg-red-50",
    border: "border-red-300",
    headerBg: "bg-red-600",
    text: "text-red-900",
    icon: AlertTriangle,
    iconColor: "text-white",
    btn: "bg-red-600 hover:bg-red-700 text-white",
  },
  maintenance: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    headerBg: "bg-amber-500",
    text: "text-amber-900",
    icon: Wrench,
    iconColor: "text-white",
    btn: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    headerBg: "bg-blue-500",
    text: "text-blue-900",
    icon: Info,
    iconColor: "text-white",
    btn: "bg-blue-500 hover:bg-blue-600 text-white",
  },
};

export function BroadcastPopup() {
  const { user } = useAuth();
  const { broadcast } = useServices();
  const [unreadBroadcasts, setUnreadBroadcasts] = useState<BroadcastMessage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acknowledging, setAcknowledging] = useState(false);
  const [dismissedInfo, setDismissedInfo] = useState<Set<string>>(new Set());

  const loadUnread = useCallback(async () => {
    if (!user) return;
    try {
      const unread = await broadcast.getUnreadBroadcastsForUser(user.uid, user.blocked);
      setUnreadBroadcasts(unread);
      setCurrentIndex(0);
    } catch (e) {
      console.error("Failed to load broadcasts:", e);
    }
  }, [user, broadcast]);

  useEffect(() => {
    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    return () => clearInterval(interval);
  }, [loadUnread]);

  const currentBroadcast = unreadBroadcasts[currentIndex];
  const isDismissed = currentBroadcast && dismissedInfo.has(currentBroadcast.id);
  const visibleBroadcast = isDismissed
    ? unreadBroadcasts.slice(currentIndex + 1).find((b) => !dismissedInfo.has(b.id))
    : currentBroadcast;

  if (!visibleBroadcast) return null;

  const style = priorityStyles[visibleBroadcast.priority];
  const isCritical = visibleBroadcast.priority === "critical";

  const handleAcknowledge = async () => {
    if (!user) return;
    setAcknowledging(true);
    try {
      await broadcast.acknowledgeBroadcast(visibleBroadcast.id, user.uid);
      const remaining = unreadBroadcasts.filter((b) => b.id !== visibleBroadcast.id);
      setUnreadBroadcasts(remaining);
      setCurrentIndex(0);
    } catch (e) {
      console.error("Failed to acknowledge:", e);
    } finally {
      setAcknowledging(false);
    }
  };

  const handleDismiss = () => {
    if (!isCritical) {
      setDismissedInfo((prev) => new Set(prev).add(visibleBroadcast.id));
    }
  };

  const sanitizedHtml = DOMPurify.sanitize(visibleBroadcast.htmlContent, {
    ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li", "a", "span", "div", "blockquote", "code", "pre"],
    ALLOWED_ATTR: ["href", "target", "style", "class"],
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-2xl border-2 shadow-2xl",
          style.border,
          style.bg
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center gap-2 px-5 py-3", style.headerBg)}>
          <style.icon className={cn("h-5 w-5", style.iconColor)} />
          <span className="text-sm font-semibold text-white uppercase tracking-wide">
            {visibleBroadcast.priority === "critical" ? "Critical Alert" : visibleBroadcast.priority === "maintenance" ? "Maintenance Notice" : "Information"}
          </span>
          {!isCritical && (
            <button
              onClick={handleDismiss}
              className="ml-auto rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          <h2 className={cn("text-lg font-bold mb-3", style.text)}>{visibleBroadcast.title}</h2>
          <div
            className={cn("prose prose-sm max-w-none", style.text)}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200/50 px-5 py-3">
          <button
            onClick={handleAcknowledge}
            disabled={acknowledging}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition disabled:opacity-50",
              style.btn
            )}
          >
            {acknowledging ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {isCritical ? "Understood" : "OK, Got it"}
          </button>
        </div>
      </div>
    </div>
  );
}
