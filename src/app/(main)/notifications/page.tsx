"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { Bell, AlertCircle } from "lucide-react";

export default function NotificationsPage() {
  const { notification } = useServices();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notification.getNotifications(50),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notification.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = data?.notifications || [];
  const hasUnread = notifications.some((n) => !n.read);

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
          </div>
        </div>
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.notificationId}
              className={`flex items-start gap-3 rounded-2xl border p-4 ${
                n.read ? "border-slate-200 bg-white" : "border-trevio-200 bg-trevio-50"
              }`}
            >
              <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${n.read ? "bg-slate-100" : "bg-trevio-100"}`}>
                <Bell className={`h-4 w-4 ${n.read ? "text-slate-400" : "text-trevio-600"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                <p className="text-sm text-slate-500">{n.body}</p>
              </div>
              {!n.read && <div className="mt-1 h-2 w-2 rounded-full bg-trevio-500" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <Bell className="h-8 w-8 text-slate-300" />
          </div>
          <p className="mt-4 text-sm text-slate-500">No notifications yet</p>
        </div>
      )}
    </div>
  );
}
