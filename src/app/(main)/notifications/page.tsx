"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { Bell, AlertCircle, Megaphone, AlertTriangle, Wrench, Info, ChevronDown, ChevronUp, Check, X, UserPlus } from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import type { BroadcastMessage, BroadcastPriority } from "@/lib/types";

const broadcastIcon: Record<BroadcastPriority, React.ComponentType<{ className?: string }>> = {
  critical: AlertTriangle,
  maintenance: Wrench,
  info: Info,
};

const broadcastColors: Record<BroadcastPriority, { border: string; bg: string; iconBg: string; icon: string }> = {
  critical: { border: "border-red-200", bg: "bg-red-50", iconBg: "bg-red-100", icon: "text-red-600" },
  maintenance: { border: "border-amber-200", bg: "bg-amber-50", iconBg: "bg-amber-100", icon: "text-amber-600" },
  info: { border: "border-blue-200", bg: "bg-blue-50", iconBg: "bg-blue-100", icon: "text-blue-600" },
};

const formatNotificationTime = (createdAt: number) => {
  if (!createdAt) return "";
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

export default function NotificationsPage() {
  const { notification, broadcast, group } = useServices();
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeBroadcasts, setActiveBroadcasts] = useState<BroadcastMessage[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [invitationAction, setInvitationAction] = useState<string | null>(null);
  const [invitationResult, setInvitationResult] = useState<Record<string, "accepted" | "declined">>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notification.getNotifications(50),
  });

  useEffect(() => {
    if (!user) return;
    broadcast
      .getActiveBroadcastsForUser(user.uid, user.blocked)
      .then(setActiveBroadcasts)
      .catch(() => {});
  }, [user, broadcast]);

  const markAllMutation = useMutation({
    mutationFn: () => notification.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const acceptInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => group.acceptInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const declineInvitationMutation = useMutation({
    mutationFn: (invitationId: string) => group.declineInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleAcceptInvitation = (notificationId: string, invitationId: string, groupId: string) => {
    setInvitationAction(invitationId);
    acceptInvitationMutation.mutate(invitationId, {
      onSuccess: async () => {
        setInvitationAction(null);
        setInvitationResult((prev) => ({ ...prev, [invitationId]: "accepted" }));
        try {
          await notification.updateNotificationData(notificationId, { status: "accepted" });
        } catch {
          // ignore notification update errors
        }
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
      onError: () => setInvitationAction(null),
    });
  };

  const handleDeclineInvitation = (notificationId: string, invitationId: string) => {
    setInvitationAction(invitationId);
    declineInvitationMutation.mutate(invitationId, {
      onSuccess: async () => {
        setInvitationAction(null);
        setInvitationResult((prev) => ({ ...prev, [invitationId]: "declined" }));
        try {
          await notification.updateNotificationData(notificationId, { status: "declined" });
        } catch {
          // ignore notification update errors
        }
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      },
      onError: () => setInvitationAction(null),
    });
  };

  const notifications = data?.notifications || [];
  const hasUnread = notifications.some((n) => !n.read);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
        {hasUnread && (
          <button
            onClick={() => markAllMutation.mutate()}
            className="text-sm font-medium text-trevio-600 hover:text-trevio-700"
          >
            Mark all read
          </button>
        )}
      </div>

      {error ? (
        <div className="flex min-h-[50vh] items-center justify-center text-center">
          <div className="max-w-md">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900">Failed to load notifications</h2>
            <p className="mt-1 text-sm text-slate-500">{(error as Error).message}</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["notifications"] })}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {/* Active broadcasts */}
          {activeBroadcasts.map((b) => {
            const Icon = broadcastIcon[b.priority];
            const colors = broadcastColors[b.priority];
            const isExpanded = expandedId === b.id;
            const sanitizedHtml = DOMPurify.sanitize(b.htmlContent, {
              ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li", "a", "span", "div", "blockquote", "code", "pre"],
              ALLOWED_ATTR: ["href", "target", "style", "class"],
            });
            return (
              <div
                key={b.id}
                className={cn("rounded-2xl border p-4", colors.border, colors.bg)}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("mt-0.5 flex h-8 w-8 items-center justify-center rounded-full", colors.iconBg)}>
                    <Icon className={cn("h-4 w-4", colors.icon)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase", colors.iconBg, colors.icon)}>
                        {b.priority}
                      </span>
                    </div>
                    {!isExpanded && (
                      <p className="mt-0.5 text-sm text-slate-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    )}
                    {isExpanded && (
                      <div className="mt-2 prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    )}
                    <button
                      onClick={() => toggleExpand(b.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      {isExpanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Read more</>}
                    </button>
                  </div>
                  <Megaphone className="h-4 w-4 text-slate-300" />
                </div>
              </div>
            );
          })}

          {/* Regular notifications */}
          {notifications.map((n) => {
            const isInvitation = n.type === "invitation" && n.data?.invitationId;
            const isSettlement = n.type === "settlement" && n.data?.groupId;
            const isExpense = n.type === "expense_added" && n.data?.groupId;
            const hasGroupLink = isSettlement || isExpense;
            const invitationStatus = n.data?.status || invitationResult[n.data?.invitationId || ""];
            const isAccepted = invitationStatus === "accepted";
            const isDeclined = invitationStatus === "declined";
            return (
              <div
                key={n.notificationId}
                className={`flex flex-col rounded-2xl border p-4 ${
                  n.read ? "border-slate-200 bg-white" : "border-trevio-200 bg-trevio-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${n.read ? "bg-slate-100" : "bg-trevio-100"}`}>
                    {isInvitation ? (
                      <UserPlus className={`h-4 w-4 ${n.read ? "text-slate-400" : "text-trevio-600"}`} />
                    ) : (
                      <Bell className={`h-4 w-4 ${n.read ? "text-slate-400" : "text-trevio-600"}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                    <p className="text-sm text-slate-500">{n.body}</p>
                    {n.createdAt > 0 && (
                      <p className="mt-1 text-xs text-slate-400">{formatNotificationTime(n.createdAt)}</p>
                    )}
                  </div>
                  {!n.read && <div className="mt-1 h-2 w-2 rounded-full bg-trevio-500" />}
                </div>
                {isInvitation && !isAccepted && !isDeclined && (
                  <div className="mt-3 flex items-center gap-2 pl-11">
                    <button
                      onClick={() => handleAcceptInvitation(n.notificationId, n.data.invitationId, n.data.groupId)}
                      disabled={invitationAction === n.data.invitationId}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-trevio-700 disabled:opacity-50"
                    >
                      {invitationAction === n.data.invitationId ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Accept & Join
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(n.notificationId, n.data.invitationId)}
                      disabled={invitationAction === n.data.invitationId}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                      Decline
                    </button>
                  </div>
                )}
                {isInvitation && isAccepted && (
                  <div className="mt-2 pl-11">
                    <button
                      onClick={() => router.push(`/groups/${n.data.groupId}`)}
                      className="text-xs font-medium text-green-600 hover:text-green-700"
                    >
                      Open Group →
                    </button>
                  </div>
                )}
                {isInvitation && isDeclined && (
                  <div className="mt-2 pl-11">
                    <span className="text-xs font-medium text-slate-500">Declined</span>
                  </div>
                )}
                {hasGroupLink && (
                  <div className="mt-2 pl-11">
                    <button
                      onClick={() => router.push(`/groups/${n.data.groupId}`)}
                      className="text-xs font-medium text-trevio-600 hover:text-trevio-700"
                    >
                      View Group →
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {activeBroadcasts.length === 0 && notifications.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <Bell className="h-8 w-8 text-slate-300" />
              </div>
              <p className="mt-4 text-sm text-slate-500">No notifications yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
