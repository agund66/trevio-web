"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import {
  ChevronLeft,
  Send,
  CircleDot,
  Clock,
  CheckCircle2,
  XCircle,
  MessageCircle,
  AlertCircle,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  SupportStatus,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string }
> = {
  open: { label: "Open", icon: CircleDot, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/30" },
  waiting_user: { label: "Awaiting Your Reply", icon: MessageCircle, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30" },
  resolved: { label: "Resolved", icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/30" },
  closed: { label: "Closed", icon: XCircle, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-700" },
};

function formatTime(ts: number): string {
  if (!ts) return "";
  const date = new Date(ts);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function TicketDetailPage() {
  const { support } = useServices();
  const params = useParams();
  const ticketId = params.id as string;
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["ticket", ticketId],
    queryFn: () => support.getTicket(ticketId),
    enabled: !!ticketId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["ticketMessages", ticketId],
    queryFn: () => support.getMessages(ticketId),
    enabled: !!ticketId,
  });

  // Mark as read when ticket is loaded and has unread flag
  useEffect(() => {
    if (ticket?.unreadByUser) {
      support.markTicketReadByUser(ticketId).then(() => {
        queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
        queryClient.invalidateQueries({ queryKey: ["myTickets"] });
      }).catch(console.error);
    }
  }, [ticket?.unreadByUser, ticketId, support, queryClient]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const replyMutation = useMutation({
    mutationFn: (body: string) => support.sendMessage(ticketId, body),
    onSuccess: () => {
      setReply("");
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["ticketMessages", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["myTickets"] });
    },
    onError: (e) => {
      setError(e instanceof Error ? e.message : "Failed to send message");
    },
  });

  const handleSendReply = () => {
    if (!reply.trim()) return;
    replyMutation.mutate(reply.trim());
  };

  if (ticketLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Ticket not found or you don&apos;t have access.</p>
        <Link href="/support/tickets" className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-trevio-600 dark:text-trevio-400">
          <ChevronLeft className="h-4 w-4" /> Back to My Tickets
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[ticket.status];
  const StatusIcon = statusConfig.icon;
  const isClosed = ticket.status === "closed";

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6 flex flex-col" style={{ minHeight: "calc(100vh - 4rem)" }}>
      {/* Header */}
      <Link
        href="/support/tickets"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to My Tickets
      </Link>

      <div className="mb-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex-1">
            {ticket.subject}
          </h1>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium shrink-0", statusConfig.bg, statusConfig.color)}>
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{ticket.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
          <span>Category: <span className="font-medium text-slate-600 dark:text-slate-300">{ticket.category.replace(/_/g, " ")}</span></span>
          <span>•</span>
          <span>Created: {formatTime(ticket.createdAt)}</span>
          {ticket.context?.groupName && (
            <>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {ticket.context.groupName}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Conversation thread */}
      <div className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-4 overflow-y-auto min-h-[300px]" style={{ maxHeight: "60vh" }}>
        {messagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
          </div>
        ) : !messages || messages.length === 0 ? (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8">No messages yet</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isUser = msg.fromRole === "user";
              return (
                <div key={msg.messageId} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    isUser
                      ? "bg-trevio-600 text-white rounded-br-sm"
                      : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-sm"
                  )}>
                    {!isUser && (
                      <p className="text-xs font-semibold text-trevio-600 dark:text-trevio-400 mb-0.5">Support Team</p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={cn("mt-1 text-[10px]", isUser ? "text-trevio-200" : "text-slate-400 dark:text-slate-500")}>
                      {formatTime(msg.createdAt)}
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
      {isClosed && (
        <div className="mb-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            This ticket is closed. Send a message below to reopen it.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Reply box — always visible so user can reopen closed tickets */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={isClosed ? "Send a message to reopen this ticket..." : "Type your reply..."}
            rows={2}
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
          Press Ctrl+Enter to send
        </p>
      </div>
    </div>
  );
}
