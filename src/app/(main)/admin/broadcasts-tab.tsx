"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import type { BroadcastMessage, BroadcastPriority, BroadcastTargetType, User } from "@/lib/types";
import {
  Megaphone,
  Plus,
  Square,
  AlertTriangle,
  Info,
  Wrench,
  Eye,
  X,
  Users,
  UserCheck,
  Search,
  AlertCircle,
  Calendar,
  EyeOff,
  ArrowLeft,
  CheckCircle2,
  Clock,
} from "lucide-react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

const priorityConfig: Record<
  BroadcastPriority,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string; text: string }
> = {
  critical: {
    label: "Critical",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-400",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
  },
  info: {
    label: "Info",
    icon: Info,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
  },
};

const targetTypeConfig: Record<BroadcastTargetType, string> = {
  all: "All Users",
  all_except_blocked: "All Users (except blocked)",
  specific: "Specific Users",
};

export function BroadcastsTab() {
  const { broadcast, admin } = useServices();
  const { user: currentUser } = useAuth();
  const { formatDate: formatDateFn } = useCurrencyDisplay();
  const [showForm, setShowForm] = useState(false);
  const [selectedBroadcastId, setSelectedBroadcastId] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readCounts, setReadCounts] = useState<Record<string, number>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadBroadcasts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await broadcast.getAllBroadcasts();
      setBroadcasts(all);
      const counts: Record<string, number> = {};
      for (const b of all) {
        counts[b.id] = await broadcast.getReadCount(b.id);
      }
      setReadCounts(counts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load broadcasts");
    } finally {
      setLoading(false);
    }
  }, [broadcast]);

  useEffect(() => {
    loadBroadcasts();
  }, [loadBroadcasts]);

  const handleStop = async (id: string) => {
    setActionLoading(id);
    try {
      await broadcast.stopBroadcast(id);
      await loadBroadcasts();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stop broadcast");
    } finally {
      setActionLoading(null);
    }
  };

  const activeBroadcasts = broadcasts.filter((b) => b.active);
  const inactiveBroadcasts = broadcasts.filter((b) => !b.active);

  if (showForm) {
    return (
      <BroadcastForm
        onClose={() => setShowForm(false)}
        onCreated={() => {
          setShowForm(false);
          loadBroadcasts();
        }}
      />
    );
  }

  if (selectedBroadcastId) {
    const selected = broadcasts.find((b) => b.id === selectedBroadcastId);
    if (selected) {
      return (
        <BroadcastDetail
          broadcast={selected}
          readCount={readCounts[selected.id] ?? 0}
          onClose={() => setSelectedBroadcastId(null)}
        />
      );
    }
  }

  return (
    <>
      {/* Header with create button */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Broadcast Messages</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Send HTML-formatted messages to users</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-trevio-700"
        >
          <Plus className="h-4 w-4" />
          New Broadcast
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{broadcasts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Active</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{activeBroadcasts.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Stopped</p>
          <p className="mt-1 text-2xl font-bold text-slate-400 dark:text-slate-500">{inactiveBroadcasts.length}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-trevio-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((b) => {
            const config = priorityConfig[b.priority];
            const isActive = b.active;
            return (
              <div
                key={b.id}
                onClick={() => setSelectedBroadcastId(b.id)}
                className={cn(
                  "flex flex-col gap-3 rounded-2xl border bg-white dark:bg-slate-900 p-4 sm:flex-row sm:items-start sm:justify-between cursor-pointer transition hover:shadow-md",
                  config.border
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", config.bg, config.text)}>
                      <config.icon className="h-3 w-3" />
                      {config.label}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
                      {targetTypeConfig[b.targetType]}
                    </span>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                        Stopped
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-medium text-slate-900 dark:text-slate-100">{b.title}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {readCounts[b.id] ?? 0} reads
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDateFn(b.startAt)}
                    </span>
                    {b.endAt && (
                      <span className="flex items-center gap-1">
                        → {formatDateFn(b.endAt)}
                      </span>
                    )}
                    <span>by {b.createdByName || "Unknown"}</span>
                  </div>
                </div>
                {isActive && (
                  <button
                    onClick={() => handleStop(b.id)}
                    disabled={actionLoading === b.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
                  >
                    <Square className="h-4 w-4" />
                    Stop
                  </button>
                )}
              </div>
            );
          })}
          {broadcasts.length === 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No broadcasts yet. Create one to get started.</p>
            </div>
          )}
        </div>
      )}

    </>
  );
}

function BroadcastForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { broadcast, admin } = useServices();
  const { user: currentUser } = useAuth();
  const [title, setTitle] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [priority, setPriority] = useState<BroadcastPriority>("info");
  const [targetType, setTargetType] = useState<BroadcastTargetType>("all");
  const [targetUids, setTargetUids] = useState<string[]>([]);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    admin.getAllUsers().then(setAllUsers).catch(() => {});
  }, [admin]);

  useEffect(() => {
    if (editorRef.current && htmlContent !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = htmlContent;
    }
  }, []);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const handleEditorInput = () => {
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  const handleAddLink = () => {
    const url = prompt("Enter URL:");
    if (url) {
      execCommand("createLink", url);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    if (u.uid === currentUser?.uid) return false;
    const q = userSearch.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  const toggleUser = (uid: string) => {
    setTargetUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!htmlContent.trim()) {
      setError("Message content is required");
      return;
    }
    if (!startAt) {
      setError("Start date and time is required");
      return;
    }
    if (targetType === "specific" && targetUids.length === 0) {
      setError("Select at least one user for specific targeting");
      return;
    }

    setSubmitting(true);
    try {
      const startMs = new Date(startAt).getTime();
      const endMs = endAt ? new Date(endAt).getTime() : null;

      if (endMs && endMs < startMs) {
        setError("End time must be after start time");
        setSubmitting(false);
        return;
      }

      await broadcast.createBroadcast({
        title: title.trim(),
        htmlContent,
        priority,
        targetType,
        targetUids: targetType === "specific" ? targetUids : [],
        startAt: startMs,
        endAt: endMs,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create broadcast");
    } finally {
      setSubmitting(false);
    }
  };

  const sanitizedHtml = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li", "a", "span", "div", "blockquote", "code", "pre"],
    ALLOWED_ATTR: ["href", "target", "style", "class"],
  });

  const toolbarButtons = [
    { cmd: "bold", label: "B", style: "font-bold" },
    { cmd: "italic", label: "I", style: "italic" },
    { cmd: "underline", label: "U", style: "underline" },
    { cmd: "strikeThrough", label: "S", style: "line-through" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Broadcasts
          </button>
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Broadcast</h2>
      </div>

      {/* Body */}
      <div className="space-y-5">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Broadcast title..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(priorityConfig) as BroadcastPriority[]).map((p) => {
                const config = priorityConfig[p];
                return (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition",
                      priority === p
                        ? cn(config.bg, config.border, config.text)
                        : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                    )}
                  >
                    <config.icon className="h-4 w-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target audience */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Target Audience</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(targetTypeConfig) as BroadcastTargetType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTargetType(t)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition",
                    targetType === t
                      ? "border-trevio-500 bg-trevio-50 dark:bg-trevio-900/20 text-trevio-700 dark:text-trevio-300"
                      : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  {t === "all" && <Users className="h-4 w-4" />}
                  {t === "all_except_blocked" && <UserCheck className="h-4 w-4" />}
                  {t === "specific" && <Search className="h-4 w-4" />}
                  <span className="truncate">{targetTypeConfig[t]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Specific user selection */}
          {targetType === "specific" && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredUsers.map((u) => (
                  <label
                    key={u.uid}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <input
                      type="checkbox"
                      checked={targetUids.includes(u.uid)}
                      onChange={() => toggleUser(u.uid)}
                      className="h-4 w-4 rounded border-slate-300 text-trevio-600 focus:ring-trevio-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{u.displayName}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500">{u.email}</span>
                  </label>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="py-2 text-center text-xs text-slate-400 dark:text-slate-500">No users found</p>
                )}
              </div>
              {targetUids.length > 0 && (
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{targetUids.length} user(s) selected</p>
              )}
            </div>
          )}

          {/* Schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Date & Time</label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Date & Time (optional)</label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Leave empty to run until manually stopped</p>
            </div>
          </div>

          {/* Rich text editor + preview */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Message Content</label>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                {showPreview ? <><EyeOff className="h-3.5 w-3.5" /> Hide Preview</> : <><Eye className="h-3.5 w-3.5" /> Show Preview</>}
              </button>
            </div>

            <div className={cn("grid gap-3", showPreview ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
              {/* Editor */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-700 px-2 py-1.5">
                  {toolbarButtons.map((btn) => (
                    <button
                      key={btn.cmd}
                      onClick={() => execCommand(btn.cmd)}
                      className={cn(
                        "h-8 w-8 rounded text-sm hover:bg-slate-100 dark:hover:bg-slate-800",
                        btn.style
                      )}
                      title={btn.cmd}
                    >
                      {btn.label}
                    </button>
                  ))}
                  <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                  <button
                    onClick={() => execCommand("formatBlock", "<h2>")}
                    className="h-8 rounded px-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Heading 2"
                  >
                    H2
                  </button>
                  <button
                    onClick={() => execCommand("formatBlock", "<h3>")}
                    className="h-8 rounded px-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Heading 3"
                  >
                    H3
                  </button>
                  <button
                    onClick={() => execCommand("formatBlock", "<p>")}
                    className="h-8 rounded px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Paragraph"
                  >
                    P
                  </button>
                  <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                  <button
                    onClick={() => execCommand("insertUnorderedList")}
                    className="h-8 rounded px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Bullet List"
                  >
                    • List
                  </button>
                  <button
                    onClick={() => execCommand("insertOrderedList")}
                    className="h-8 rounded px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Numbered List"
                  >
                    1. List
                  </button>
                  <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
                  <button
                    onClick={handleAddLink}
                    className="h-8 rounded px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Add Link"
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => execCommand("removeFormat")}
                    className="h-8 rounded px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Clear Formatting"
                  >
                    Clear
                  </button>
                </div>
                {/* Editable area */}
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  className="min-h-[200px] max-h-[300px] overflow-y-auto px-4 py-3 text-sm focus:outline-none prose prose-sm dark:prose-invert max-w-none"
                />
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="border-b border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                    Live Preview
                  </div>
                  <div
                    className="min-h-[200px] max-h-[300px] overflow-y-auto px-4 py-3 prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                </div>
              )}
            </div>
          </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-trevio-700 disabled:opacity-50"
          >
            {submitting ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Megaphone className="h-4 w-4" />
            )}
            Send Broadcast
          </button>
        </div>
      </div>
    </div>
  );
}

function BroadcastDetail({
  broadcast,
  readCount,
  onClose,
}: {
  broadcast: BroadcastMessage;
  readCount: number;
  onClose: () => void;
}) {
  const { broadcast: broadcastService, admin } = useServices();
  const { formatDate: formatDateFn } = useCurrencyDisplay();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [reads, setReads] = useState<{ uid: string; readAt: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      admin.getAllUsers(),
      broadcastService.getBroadcastReads(broadcast.id),
    ]).then(([users, readData]) => {
      setAllUsers(users);
      setReads(readData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [broadcast.id, admin, broadcastService]);

  const readUids = new Set(reads.map((r) => r.uid));
  const readMap = new Map(reads.map((r) => [r.uid, r.readAt]));

  const targetUsers = allUsers.filter((u) => {
    if (u.uid === broadcast.createdBy) return false;
    switch (broadcast.targetType) {
      case "all":
        return true;
      case "all_except_blocked":
        return !u.blocked;
      case "specific":
        return broadcast.targetUids.includes(u.uid);
      default:
        return false;
    }
  });

  const readUsers = targetUsers.filter((u) => readUids.has(u.uid));
  const unreadUsers = targetUsers.filter((u) => !readUids.has(u.uid));

  const config = priorityConfig[broadcast.priority];
  const sanitizedHtml = DOMPurify.sanitize(broadcast.htmlContent, {
    ALLOWED_TAGS: ["h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "b", "strong", "i", "em", "u", "s", "ul", "ol", "li", "a", "span", "div", "blockquote", "code", "pre"],
    ALLOWED_ATTR: ["href", "target", "style", "class"],
  });

  return (
    <>
      {/* Back button */}
      <button
        onClick={onClose}
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:text-slate-900 dark:hover:text-slate-100"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Broadcasts
      </button>

      {/* Broadcast info card */}
      <div className={cn("rounded-2xl border-2 p-5", config.border, config.bg)}>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", config.bg, config.text)}>
            <config.icon className="h-3 w-3" />
            {config.label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-300">
            {targetTypeConfig[broadcast.targetType]}
          </span>
          {broadcast.active ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
              Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Stopped
            </span>
          )}
        </div>
        <h2 className={cn("text-lg font-bold mb-2", config.text)}>{broadcast.title}</h2>
        <div
          className={cn("prose prose-sm dark:prose-invert max-w-none mb-3", config.text)}
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDateFn(broadcast.startAt, true)}
          </span>
          {broadcast.endAt && (
            <span className="flex items-center gap-1">
              → {formatDateFn(broadcast.endAt, true)}
            </span>
          )}
          <span>by {broadcast.createdByName || "Unknown"}</span>
        </div>
      </div>

      {/* Read stats */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Target Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{targetUsers.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Read</p>
          <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">{readUsers.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Unread</p>
          <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{unreadUsers.length}</p>
        </div>
      </div>

      {/* User list */}
      {loading ? (
        <div className="mt-6 flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-trevio-600" />
        </div>
      ) : (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">User Read Status</h3>
          <div className="space-y-2">
            {targetUsers.map((u) => {
              const hasRead = readUids.has(u.uid);
              const readAt = readMap.get(u.uid);
              return (
                <div
                  key={u.uid}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium text-slate-600 dark:text-slate-300">
                    {u.displayName?.charAt(0)?.toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{u.displayName}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.email}</p>
                  </div>
                  {hasRead ? (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      {readAt ? formatDateFn(readAt) : "Read"}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="h-4 w-4" />
                      Pending
                    </div>
                  )}
                </div>
              );
            })}
            {targetUsers.length === 0 && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 text-center">
                <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No target users found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
