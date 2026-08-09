"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  MessageSquarePlus,
  Calculator,
  HandCoins,
  Receipt,
  Users,
  Wallet,
  UserCircle,
  Bug,
  HelpCircle,
  ChevronLeft,
  Send,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SupportCategory } from "@/lib/types";

const CATEGORIES: {
  value: SupportCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  priority: string;
}[] = [
  { value: "calculation", label: "Balance & Calculations", icon: Calculator, description: "Balance looks wrong, split issues", priority: "High" },
  { value: "settlement", label: "Settlement Issue", icon: HandCoins, description: "Payment recording, settlement not updating", priority: "High" },
  { value: "expense", label: "Expense Issue", icon: Receipt, description: "Can't add/edit/delete expense", priority: "Medium" },
  { value: "group_access", label: "Group Access", icon: Users, description: "Can't join, create, or access a group", priority: "Medium" },
  { value: "payment_info", label: "Payment Info", icon: Wallet, description: "UPI ID or phone number issues", priority: "Medium" },
  { value: "account", label: "Account Issue", icon: UserCircle, description: "Profile, currency, or account settings", priority: "Low" },
  { value: "bug", label: "Bug / Crash", icon: Bug, description: "App crashing, data not loading", priority: "Urgent" },
  { value: "other", label: "Other", icon: HelpCircle, description: "Something else entirely", priority: "Low" },
];

export default function NewTicketPage() {
  const { support } = useServices();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-capture context from query params (groupId, groupName, screen)
  const contextGroupId = searchParams.get("groupId") || undefined;
  const contextGroupName = searchParams.get("groupName") || undefined;
  const contextScreen = searchParams.get("screen") || undefined;

  const handleSubmit = async () => {
    if (!category) {
      setError("Please select a category");
      return;
    }
    if (!subject.trim()) {
      setError("Please enter a subject");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("Please describe your issue (at least 10 characters)");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const ticketId = await support.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        context: {
          groupId: contextGroupId,
          groupName: contextGroupName,
          screen: contextScreen,
        },
      });
      router.push(`/support/tickets/${ticketId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit ticket");
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <Link
        href="/support"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Help Center
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trevio-50 dark:bg-trevio-900/30">
            <MessageSquarePlus className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Report an Issue</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tell us what&apos;s happening and we&apos;ll help you resolve it
            </p>
          </div>
        </div>
      </div>

      {/* Context indicator */}
      {(contextGroupId || contextScreen) && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            📍 Context attached: {contextGroupName || contextGroupId || "Group"}{contextScreen ? ` • ${contextScreen}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
            This helps us understand where you encountered the issue.
          </p>
        </div>
      )}

      {/* Category selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          What type of issue are you facing?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={cn(
                  "flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition",
                  isSelected
                    ? "border-trevio-500 bg-trevio-50 dark:bg-trevio-900/30"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className={cn("h-4 w-4", isSelected ? "text-trevio-600 dark:text-trevio-400" : "text-slate-500 dark:text-slate-400")} />
                  <span className={cn("text-sm font-medium", isSelected ? "text-trevio-700 dark:text-trevio-300" : "text-slate-700 dark:text-slate-200")}>
                    {cat.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{cat.description}</p>
                <span className={cn(
                  "mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold",
                  cat.priority === "Urgent" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                  cat.priority === "High" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
                  cat.priority === "Medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                  "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                )}>
                  {cat.priority} priority
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief summary of the issue"
          maxLength={100}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {subject.length}/100 characters
        </p>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Describe the issue
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please describe what happened, what you expected, and any steps to reproduce the issue..."
          rows={6}
          maxLength={2000}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none resize-none"
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {description.length}/2000 characters
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3">
        <Link
          href="/support"
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-center text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Cancel
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitting || !category || !subject.trim() || !description.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          {submitting ? "Submitting..." : "Submit Issue"}
        </button>
      </div>
    </div>
  );
}
