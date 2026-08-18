"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { usePaginatedQuery } from "@/lib/hooks/use-paginated-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/app";
import { LoadMoreButton } from "@/components/load-more-button";
import {
  Inbox,
  BookOpen,
  Search,
  ChevronLeft,
  ChevronRight,
  Send,
  CircleDot,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  AlertCircle,
  MapPin,
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  X,
  Save,
  Filter,
} from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/date";
import type {
  SupportTicket,
  SupportStatus,
  SupportPriority,
  SupportCategory,
  SupportMessage,
  HelpArticle,
} from "@/lib/types";

function getStatusConfig(t: TranslateFn): Record<
  SupportStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> {
  return {
    open: { label: t('support.statusLabels.open'), icon: CircleDot, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
    in_progress: { label: t('support.statusLabels.in_progress'), icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
    waiting_user: { label: t('support.statusLabels.waiting_user'), icon: MessageCircle, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
    resolved: { label: t('support.statusLabels.resolved'), icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
    closed: { label: t('support.statusLabels.closed'), icon: XCircle, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-700" },
  };
}

function getPriorityConfig(t: TranslateFn): Record<SupportPriority, { label: string; color: string; dot: string }> {
  return {
    urgent: { label: t('support.priorityLabels.urgent'), color: "text-red-600 dark:text-red-400", dot: "bg-red-500" },
    high: { label: t('support.priorityLabels.high'), color: "text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
    medium: { label: t('support.priorityLabels.medium'), color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
    low: { label: t('support.priorityLabels.low'), color: "text-slate-500 dark:text-slate-400", dot: "bg-slate-400" },
  };
}

type TranslateFn = (key: string) => string;

function getCategoryLabels(t: TranslateFn): Record<string, string> {
  return {
    calculation: t('support.categoryLabels.calculation'),
    settlement: t('support.categoryLabels.settlement'),
    expense: t('support.categoryLabels.expense'),
    group_access: t('support.categoryLabels.group_access'),
    payment_info: t('support.categoryLabels.payment_info'),
    account: t('support.categoryLabels.account'),
    bug: t('support.categoryLabels.bug'),
    other: t('support.categoryLabels.other'),
    general: t('support.categoryLabels.general'),
  };
}

function formatTime(ts: number): string {
  return formatRelativeTime(ts);
}

function formatDateTime(ts: number): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type SubTab = "tickets" | "articles";

export function SupportTab() {
  const t = useTranslations("admin");
  const [subTab, setSubTab] = useState<SubTab>("tickets");

  return (
    <div>
      {/* Sub-tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setSubTab("tickets")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition",
            subTab === "tickets"
              ? "border-trevio-600 text-trevio-700 dark:text-trevio-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <Inbox className="h-4 w-4" />
          {t('support.ticketsTab')}
        </button>
        <button
          onClick={() => setSubTab("articles")}
          className={cn(
            "flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition",
            subTab === "articles"
              ? "border-trevio-600 text-trevio-700 dark:text-trevio-400"
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          )}
        >
          <BookOpen className="h-4 w-4" />
          {t('support.helpArticlesTab')}
        </button>
      </div>

      {subTab === "tickets" && <TicketsPanel />}
      {subTab === "articles" && <ArticlesPanel />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Tickets Panel
// ═══════════════════════════════════════════════════════════════════

function TicketsPanel() {
  const { support } = useServices();
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
  const categoryLabels = getCategoryLabels(t);
  const statusConfig = getStatusConfig(t);
  const priorityConfig = getPriorityConfig(t);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<SupportCategory | "all">("all");
  const [search, setSearch] = useState("");

  const ticketsPagination = usePaginatedQuery<SupportTicket, { tickets: SupportTicket[]; hasMore: boolean; lastTicketId: string | null }>({
    queryKey: ["adminTickets", statusFilter, categoryFilter],
    queryFn: (pageSize, lastId) =>
      support.getAllTickets(
        {
          ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
        },
        pageSize,
        lastId,
      ),
    pageSize: DEFAULT_PAGE_SIZE,
    extractItems: (r) => r.tickets,
    extractHasMore: (r) => r.hasMore,
    extractLastId: (r) => r.lastTicketId,
  });
  const tickets = ticketsPagination.items;
  const isLoading = ticketsPagination.isLoading;

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    if (!search.trim()) return tickets;
    const q = search.toLowerCase();
    return tickets.filter((t) => {
      return (
        t.subject.toLowerCase().includes(q) ||
        t.userDisplayName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.userUsername.toLowerCase().includes(q)
      );
    });
  }, [tickets, search]);

  const unreadCount = tickets?.filter((t) => t.unreadByAdmin).length ?? 0;
  const openCount = tickets?.filter((t) => t.status === "open" || t.status === "in_progress").length ?? 0;

  if (selectedTicket) {
    return (
      <TicketDetailAdmin
        ticket={selectedTicket}
        onBack={() => {
          setSelectedTicket(null);
          ticketsPagination.refresh();
        }}
      />
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('support.total')}</p>
          <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{tickets?.length ?? 0}</p>
        </div>
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3">
          <p className="text-xs text-amber-600 dark:text-amber-400">{t('support.openInProgress')}</p>
          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{openCount}</p>
        </div>
        <div className="rounded-xl border border-trevio-200 dark:border-trevio-700 bg-trevio-50 dark:bg-trevio-900/20 p-3">
          <p className="text-xs text-trevio-600 dark:text-trevio-400">{t('support.unread')}</p>
          <p className="text-xl font-bold text-trevio-700 dark:text-trevio-300">{unreadCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('support.searchPlaceholder')}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SupportStatus | "all")}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
        >
          <option value="all">{t('support.allStatus')}</option>
          <option value="open">{t('support.statusLabels.open')}</option>
          <option value="in_progress">{t('support.statusLabels.in_progress')}</option>
          <option value="waiting_user">{t('support.statusLabels.waiting_user')}</option>
          <option value="resolved">{t('support.statusLabels.resolved')}</option>
          <option value="closed">{t('support.statusLabels.closed')}</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as SupportCategory | "all")}
          className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
        >
          <option value="all">{t('support.allCategories')}</option>
          <option value="calculation">{t('support.categoryLabels.calculation')}</option>
          <option value="settlement">{t('support.categoryLabels.settlement')}</option>
          <option value="expense">{t('support.categoryLabels.expense')}</option>
          <option value="group_access">{t('support.categoryLabels.group_access')}</option>
          <option value="payment_info">{t('support.categoryLabels.payment_info')}</option>
          <option value="account">{t('support.categoryLabels.account')}</option>
          <option value="bug">{t('support.categoryLabels.bug')}</option>
          <option value="other">{t('support.categoryLabels.other')}</option>
        </select>
      </div>

      {/* Ticket list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <Inbox className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{t('support.noTicketsFound')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTickets.map((ticket) => {
            const ticketStatusConfig = statusConfig[ticket.status];
            const StatusIcon = ticketStatusConfig.icon;
            const ticketPriorityConfig = priorityConfig[ticket.priority];
            return (
              <button
                key={ticket.ticketId}
                onClick={() => setSelectedTicket(ticket)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl border bg-white dark:bg-slate-800 p-4 text-left transition hover:shadow-sm",
                  ticket.unreadByAdmin
                    ? "border-trevio-300 dark:border-trevio-600"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", ticketPriorityConfig.dot)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn(
                      "text-sm truncate",
                      ticket.unreadByAdmin ? "font-bold text-slate-900 dark:text-slate-100" : "font-medium text-slate-700 dark:text-slate-200"
                    )}>
                      {ticket.subject}
                    </p>
                    {ticket.unreadByAdmin && (
                      <span className="shrink-0 rounded-full bg-trevio-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
                    {ticket.userDisplayName} @{ticket.userUsername}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", ticketStatusConfig.bg, ticketStatusConfig.color)}>
                      <StatusIcon className="h-3 w-3" />
                      {ticketStatusConfig.label}
                    </span>
                    <span className={cn("text-[10px] font-medium", ticketPriorityConfig.color)}>
                      {ticketPriorityConfig.label}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      {categoryLabels[ticket.category] || ticket.category}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      • {formatTime(ticket.updatedAt)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0 mt-1" />
              </button>
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

// ═══════════════════════════════════════════════════════════════════
// Admin Ticket Detail
// ═══════════════════════════════════════════════════════════════════

function TicketDetailAdmin({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const { support } = useServices();
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
  const categoryLabels = getCategoryLabels(t);
  const statusConfig = getStatusConfig(t);
  const priorityConfig = getPriorityConfig(t);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["adminTicketMessages", ticket.ticketId],
    queryFn: () => support.getMessages(ticket.ticketId),
  });

  // Mark as read by admin
  useEffect(() => {
    if (ticket.unreadByAdmin) {
      support.markTicketReadByAdmin(ticket.ticketId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      }).catch(console.error);
    }
  }, [ticket.unreadByAdmin, ticket.ticketId, support, queryClient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const replyMutation = useMutation({
    mutationFn: (body: string) => support.sendAdminMessage(ticket.ticketId, body),
    onSuccess: () => {
      setReply("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["adminTicketMessages", ticket.ticketId] });
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : t('support.failedToSendMessage'));
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: SupportStatus) => support.updateTicketStatus(ticket.ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
      onBack();
    },
  });

  const priorityMutation = useMutation({
    mutationFn: (priority: SupportPriority) => support.updateTicketPriority(ticket.ticketId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTickets"] });
    },
  });

  const ticketStatusConfig = statusConfig[ticket.status];
  const StatusIcon = ticketStatusConfig.icon;
  const ticketPriorityConfig = priorityConfig[ticket.priority];

  const handleSendReply = () => {
    if (!reply.trim()) return;
    replyMutation.mutate(reply.trim());
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        {t('support.backToTickets')}
      </button>

      {/* Ticket info */}
      <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex-1">
            {ticket.subject}
          </h2>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shrink-0", ticketStatusConfig.bg, ticketStatusConfig.color)}>
            <StatusIcon className="h-3 w-3" />
            {ticketStatusConfig.label}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{ticket.description}</p>

        {/* User info */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-3 mb-3">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">{t('support.reportedBy')}</p>
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{ticket.userDisplayName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">@{ticket.userUsername} • {ticket.userEmail}</p>
            </div>
          </div>
        </div>

        {/* Context */}
        {(ticket.context?.groupId || ticket.context?.screen) && (
          <div className="mb-3 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <MapPin className="h-3 w-3" />
            Context: {ticket.context.groupName || ticket.context.groupId || "N/A"}
            {ticket.context.screen ? ` • ${ticket.context.screen}` : ""}
          </div>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span>{t('support.createdLabel')} {formatDateTime(ticket.createdAt)}</span>
          <span>•</span>
          <span>{t('support.updatedLabel')} {formatTime(ticket.updatedAt)}</span>
          <span>•</span>
          <span>Category: {categoryLabels[ticket.category] || ticket.category}</span>
        </div>

        {/* Admin controls */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
          {/* Status controls */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">{t('support.statusLabel')}</span>
            {(["open", "in_progress", "waiting_user", "resolved", "closed"] as SupportStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => statusMutation.mutate(s)}
                disabled={statusMutation.isPending || ticket.status === s}
                className={cn(
                  "rounded-lg px-2 py-1 text-[10px] font-medium transition disabled:opacity-50",
                  ticket.status === s
                    ? statusConfig[s].bg + " " + statusConfig[s].color
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                )}
              >
                {statusConfig[s].label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">{t('support.priorityLabel')}</span>
          {(["urgent", "high", "medium", "low"] as SupportPriority[]).map((p) => (
            <button
              key={p}
              onClick={() => priorityMutation.mutate(p)}
              disabled={priorityMutation.isPending || ticket.priority === p}
              className={cn(
                "rounded-lg px-2 py-1 text-[10px] font-medium transition disabled:opacity-50",
                ticket.priority === p
                  ? "bg-trevio-100 dark:bg-trevio-900/30 text-trevio-700 dark:text-trevio-300"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
              )}
            >
              {priorityConfig[p].label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-4 overflow-y-auto min-h-[300px]" style={{ maxHeight: "50vh" }}>
        {messagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">{t('support.noMessagesYet')}</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isAdmin = msg.fromRole === "superadmin";
              return (
                <div key={msg.messageId} className={cn("flex", isAdmin ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    isAdmin
                      ? "bg-trevio-600 text-white rounded-br-sm"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-sm"
                  )}>
                    {isAdmin ? (
                      <p className="text-xs font-semibold text-trevio-200 mb-0.5">{t('support.youAdmin')}</p>
                    ) : (
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-0.5">{msg.fromName}</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={cn("mt-1 text-[10px]", isAdmin ? "text-trevio-200" : "text-slate-400 dark:text-slate-500")}>
                      {formatDateTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Closed ticket notice */}
      {ticket.status === "closed" && (
        <div className="mb-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {t('support.closedTicketNotice')}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Reply box — always visible so admin can reply even to closed tickets */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t('support.typeResponsePlaceholder')}
            rows={3}
            maxLength={2000}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleSendReply();
              }
            }}
          />
          <button
            onClick={handleSendReply}
            disabled={!reply.trim() || replyMutation.isPending}
            className="self-end rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {t('support.replyHelpText')}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Help Articles Panel
// ═══════════════════════════════════════════════════════════════════

function ArticlesPanel() {
  const { support } = useServices();
  const queryClient = useQueryClient();
  const t = useTranslations("admin");
  const categoryLabels = getCategoryLabels(t);
  const [editing, setEditing] = useState<HelpArticle | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: articles, isLoading } = useQuery({
    queryKey: ["adminArticles"],
    queryFn: () => support.getAllHelpArticles(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => support.deleteHelpArticle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminArticles"] });
      queryClient.invalidateQueries({ queryKey: ["helpArticles"] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      support.updateHelpArticle(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminArticles"] });
      queryClient.invalidateQueries({ queryKey: ["helpArticles"] });
    },
  });

  if (creating || editing) {
    return (
      <ArticleEditor
        article={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["adminArticles"] });
          queryClient.invalidateQueries({ queryKey: ["helpArticles"] });
          setCreating(false);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('support.manageArticlesDesc')}
        </p>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700"
        >
          <Plus className="h-4 w-4" />
          {t('support.newArticle')}
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
        </div>
      ) : !articles || articles.length === 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">{t('support.noArticlesYet')}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('support.createFirstArticle')}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <div
              key={article.articleId}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {article.title}
                  </p>
                  {!article.active && (
                    <span className="shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {categoryLabels[article.category] || article.category} • Order: {article.order}
                </p>
              </div>
              <button
                onClick={() => toggleActiveMutation.mutate({ id: article.articleId, active: !article.active })}
                className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                title={article.active ? t('support.hideArticle') : t('support.showArticle')}
              >
                {article.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setEditing(article)}
                className="rounded-lg p-2 text-slate-400 hover:text-trevio-600 dark:hover:text-trevio-400 transition"
                title={t('support.editArticle')}
              >
                <Edit3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (confirm(t('support.deleteArticleConfirm', { title: article.title }))) {
                    deleteMutation.mutate(article.articleId);
                  }
                }}
                className="rounded-lg p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                title={t('support.deleteArticle')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Article Editor
// ═══════════════════════════════════════════════════════════════════

function ArticleEditor({
  article,
  onClose,
  onSaved,
}: {
  article: HelpArticle | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { support } = useServices();
  const [title, setTitle] = useState(article?.title ?? "");
  const [content, setContent] = useState(article?.content ?? "");
  const [category, setCategory] = useState<string>(article?.category ?? "general");
  const [tags, setTags] = useState(article?.tags.join(", ") ?? "");
  const [order, setOrder] = useState(article?.order ?? 99);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("admin");

  const handleSave = async () => {
    if (!title.trim()) {
      setError(t('support.titleRequired'));
      return;
    }
    if (!content.trim()) {
      setError(t('support.contentRequired'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const tagsList = tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (article) {
        await support.updateHelpArticle(article.articleId, {
          title: title.trim(),
          content: content.trim(),
          category: category as HelpArticle["category"],
          tags: tagsList,
          order,
        });
      } else {
        await support.createHelpArticle({
          title: title.trim(),
          content: content.trim(),
          category,
          tags: tagsList,
          order,
        });
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('support.failedToSaveArticle'));
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {article ? t('support.editArticleTitle') : t('support.newArticleTitle')}
        </h2>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('support.titleField')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('support.articleTitlePlaceholder')}
            maxLength={200}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('support.categoryField')}</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            >
              <option value="general">{t('support.categoryLabels.general')}</option>
              <option value="calculation">{t('support.categoryLabels.calculation')}</option>
              <option value="settlement">{t('support.categoryLabels.settlement')}</option>
              <option value="expense">{t('support.categoryLabels.expense')}</option>
              <option value="group_access">{t('support.categoryLabels.group_access')}</option>
              <option value="payment_info">{t('support.categoryLabels.payment_info')}</option>
              <option value="account">{t('support.categoryLabels.account')}</option>
              <option value="bug">{t('support.categoryLabels.bug')}</option>
              <option value="other">{t('support.categoryLabels.other')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('support.displayOrder')}</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t('support.tagsLabel')}
          </label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t('support.tagsPlaceholder')}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            {t('support.contentLabel')}
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('support.contentPlaceholder')}
            rows={12}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none font-mono"
          />
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            {t('support.htmlTagsHint')}
          </p>
        </div>

        {/* Preview */}
        {content && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('support.preview')}</label>
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 max-h-48 overflow-y-auto">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 [&_h3]:text-slate-900 dark:[&_h3]:text-slate-100 [&_h3]:font-semibold [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-trevio-600 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? t('support.saving') : t('support.saveArticle')}
          </button>
        </div>
      </div>
    </div>
  );
}
