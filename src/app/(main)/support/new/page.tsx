"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
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
import type { SupportCategory, SupportPriority } from "@/lib/types";

export default function NewTicketPage() {
  const { support } = useServices();
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("support");
  const tCommon = useTranslations("common");

  const [category, setCategory] = useState<SupportCategory | null>(null);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CATEGORIES: {
    value: SupportCategory;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
    priority: SupportPriority;
  }[] = [
    { value: "calculation", label: t('categoryCalculation'), icon: Calculator, description: t('categoryCalculationDesc'), priority: "high" },
    { value: "settlement", label: t('categorySettlement'), icon: HandCoins, description: t('categorySettlementDesc'), priority: "high" },
    { value: "expense", label: t('categoryExpense'), icon: Receipt, description: t('categoryExpenseDesc'), priority: "medium" },
    { value: "group_access", label: t('categoryGroupAccess'), icon: Users, description: t('categoryGroupAccessDesc'), priority: "medium" },
    { value: "payment_info", label: t('categoryPaymentInfo'), icon: Wallet, description: t('categoryPaymentInfoDesc'), priority: "medium" },
    { value: "account", label: t('categoryAccount'), icon: UserCircle, description: t('categoryAccountDesc'), priority: "low" },
    { value: "bug", label: t('categoryBug'), icon: Bug, description: t('categoryBugDesc'), priority: "urgent" },
    { value: "other", label: t('categoryOther'), icon: HelpCircle, description: t('categoryOtherDesc'), priority: "low" },
  ];

  // Auto-capture context from query params (groupId, groupName, screen)
  const contextGroupId = searchParams.get("groupId") || undefined;
  const contextGroupName = searchParams.get("groupName") || undefined;
  const contextScreen = searchParams.get("screen") || undefined;

  const handleSubmit = async () => {
    if (!category) {
      setError(t('categoryRequired'));
      return;
    }
    if (!subject.trim()) {
      setError(t('subjectRequired'));
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError(t('descriptionRequired'));
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
      setError(e instanceof Error ? e.message : t('failedToSubmitTicket'));
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
        {t('backToHelpCenter')}
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trevio-50 dark:bg-trevio-900/30">
            <MessageSquarePlus className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('reportIssue')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('reportIssueDescription')}
            </p>
          </div>
        </div>
      </div>

      {/* Context indicator */}
      {(contextGroupId || contextScreen) && (
        <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
          <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
            📍 {t('contextAttached')} {contextGroupName || contextGroupId || t('groupFallback')}{contextScreen ? ` • ${contextScreen}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">
            {t('contextHelpText')}
          </p>
        </div>
      )}

      {/* Category selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
          {t('issueTypeQuestion')}
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
                  cat.priority === "urgent" ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                  cat.priority === "high" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" :
                  cat.priority === "medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                  "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                )}>
                  {t(`priorityLabels.${cat.priority}`)} {t('priorityWord')}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subject */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {t('subject')}
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={t('subjectPlaceholder')}
          maxLength={100}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {t('characterCount', { count: subject.length, max: 100 })}
        </p>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          {t('describeIssue')}
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('descriptionPlaceholder')}
          rows={6}
          maxLength={2000}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none resize-none"
        />
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
          {t('characterCount', { count: description.length, max: 2000 })}
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
          {tCommon('actions.cancel')}
        </Link>
        <button
          onClick={handleSubmit}
          disabled={submitting || !category || !subject.trim() || !description.trim()}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
          {submitting ? t('submitting') : t('submitIssue')}
        </button>
      </div>
    </div>
  );
}
