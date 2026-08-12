"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { usePaginatedQuery } from "@/lib/hooks/use-paginated-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/app";
import { LoadMoreButton } from "@/components/load-more-button";
import {
  Ticket,
  ChevronLeft,
  MessageSquarePlus,
  CircleDot,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/date";
import type { SupportStatus, SupportPriority } from "@/lib/types";

type TranslateFn = (key: string) => string;

function getStatusConfig(t: TranslateFn): Record<
  SupportStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> {
  return {
    open: { label: t('statusOpen'), icon: CircleDot, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
    in_progress: { label: t('statusInProgress'), icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
    waiting_user: { label: t('statusAwaitingReply'), icon: MessageCircle, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
    resolved: { label: t('statusResolved'), icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
    closed: { label: t('statusClosed'), icon: XCircle, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-700" },
  };
}

const PRIORITY_COLORS: Record<SupportPriority, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

function formatTime(ts: number): string {
  return formatRelativeTime(ts);
}

export default function MyTicketsPage() {
  const { support } = useServices();
  const t = useTranslations("support");

  const ticketsPagination = usePaginatedQuery({
    queryKey: ["myTickets"],
    queryFn: (pageSize, lastId) => support.getMyTickets(pageSize, lastId),
    pageSize: DEFAULT_PAGE_SIZE,
    extractItems: (r) => r.tickets,
    extractHasMore: (r) => r.hasMore,
    extractLastId: (r) => r.lastTicketId,
  });
  const tickets = ticketsPagination.items;
  const isLoading = ticketsPagination.isLoading;

  const unreadCount = tickets?.filter((t) => t.unreadByUser).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <Link
        href="/support"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('backToHelpCenter')}
      </Link>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-700">
            <Ticket className="h-5 w-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('myTickets')}</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-trevio-600 dark:text-trevio-400">
                {t('newUpdates', { count: unreadCount })}
              </p>
            )}
          </div>
        </div>
        <Link
          href="/support/new"
          className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {t('newBadge')}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
        </div>
      ) : !tickets || tickets.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <Ticket className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            {t('noTicketsYet')}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('noTicketsYetDesc')}
          </p>
          <Link
            href="/support/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <MessageSquarePlus className="h-4 w-4" />
            {t('reportIssue')}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => {
            const statusConfig = getStatusConfig(t)[ticket.status];
            const StatusIcon = statusConfig.icon;
            return (
              <Link
                key={ticket.ticketId}
                href={`/support/tickets/${ticket.ticketId}`}
                className={cn(
                  "block rounded-xl border bg-white dark:bg-slate-800 p-4 transition hover:shadow-sm",
                  ticket.unreadByUser
                    ? "border-trevio-300 dark:border-trevio-600"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Priority indicator */}
                  <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", PRIORITY_COLORS[ticket.priority])} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        "text-sm truncate",
                        ticket.unreadByUser ? "font-bold text-slate-900 dark:text-slate-100" : "font-medium text-slate-700 dark:text-slate-200"
                      )}>
                        {ticket.subject}
                      </p>
                      {ticket.unreadByUser && (
                        <span className="shrink-0 rounded-full bg-trevio-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {t('newBadge')}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                      {ticket.description}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", statusConfig.bg, statusConfig.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">
                        {formatTime(ticket.updatedAt)}
                      </span>
                      {ticket.context?.groupName && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          • {ticket.context.groupName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
          <LoadMoreButton
            onClick={ticketsPagination.loadMore}
            loading={ticketsPagination.loadingMore}
            hasMore={ticketsPagination.hasMore}
          />
        </div>
      )}
    </div>
  );
}
