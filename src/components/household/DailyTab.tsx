"use client";

import { useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Users,
  Trash2,
  Pencil,
  ShoppingCart,
  Sprout,
  Zap,
  Home,
  Car,
  Stethoscope,
  GraduationCap,
  Film,
  Utensils,
  ShoppingBag,
  Sparkles,
  Shield,
  Package,
  Briefcase,
  PartyPopper,
  Gift,
  Undo2,
  TrendingUp,
  Building2,
  PersonStanding,
  Landmark,
  Receipt,
} from "lucide-react";
import type { Expense, Member } from "@/lib/types";
import {
  computeDailySummary,
  computeGamification,
} from "@/lib/utils/household-analytics";
import {
  getCategoryIcon,
  getCategoryColor,
  getCategoryLabel,
} from "@/lib/utils/household-categories";
import { formatCurrencySymbol } from "@/lib/utils/currency";
import { formatTime, formatShortDate } from "@/lib/utils/date";
import { Avatar } from "@/components/avatar";
import { GamificationCard } from "./GamificationCard";

const ICON_MAP: Record<string, typeof ShoppingCart> = {
  ShoppingCart,
  Sprout,
  Zap,
  Home,
  Car,
  Stethoscope,
  GraduationCap,
  Film,
  Utensils,
  ShoppingBag,
  Sparkles,
  Shield,
  Package,
  Briefcase,
  PartyPopper,
  Gift,
  Undo2,
  TrendingUp,
  Building2,
  PersonStanding,
  Landmark,
};

interface DailyTabProps {
  expenses: Expense[];
  members: Member[];
  selectedDate: number;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onGoToToday?: () => void;
  onViewEntry: (expense: Expense) => void;
  onEditEntry: (expense: Expense) => void;
  onDeleteEntry: (expenseId: string) => void;
  isSaving: boolean;
  monthlyBudget?: number;
  userCurrency?: string;
}

function memberName(members: Member[], uid: string): string {
  return members.find((m) => m.uid === uid)?.displayName ?? "Someone";
}

export function DailyTab({
  expenses,
  members,
  selectedDate,
  onPreviousDay,
  onNextDay,
  onGoToToday,
  onViewEntry,
  onEditEntry,
  onDeleteEntry,
  isSaving,
  monthlyBudget,
  userCurrency = "INR",
}: DailyTabProps) {
  const summary = useMemo(
    () => computeDailySummary(expenses, selectedDate),
    [expenses, selectedDate]
  );

  const monthlySpent = useMemo(() => {
    if (!expenses || expenses.length === 0) return 0;
    const sel = new Date(selectedDate);
    const selYear = sel.getFullYear();
    const selMonth = sel.getMonth();
    return expenses
      .filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return (
          d.getFullYear() === selYear &&
          d.getMonth() === selMonth &&
          (e.transactionType ?? "expense") === "expense"
        );
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, selectedDate]);

  const gamification = useMemo(
    () => computeGamification(expenses, members, monthlyBudget, monthlySpent, userCurrency),
    [expenses, members, monthlyBudget, monthlySpent, userCurrency]
  );

  const isToday = useMemo(() => {
    const now = new Date();
    const sel = new Date(selectedDate);
    return (
      now.getFullYear() === sel.getFullYear() &&
      now.getMonth() === sel.getMonth() &&
      now.getDate() === sel.getDate()
    );
  }, [selectedDate]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") onPreviousDay();
      if (e.key === "ArrowRight" && !isToday) onNextDay();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onPreviousDay, onNextDay, isToday]);

  // Find the most recent day that has entries (for empty state hint)
  const lastEntryDay = useMemo(() => {
    if (!expenses || expenses.length === 0) return null;
    const sorted = [...expenses].sort((a, b) => (b.date ?? 0) - (a.date ?? 0));
    const latest = sorted[0];
    if (!latest?.date) return null;
    const latestDate = new Date(latest.date);
    // Check if it's not today
    const now = new Date();
    if (
      latestDate.getFullYear() === now.getFullYear() &&
      latestDate.getMonth() === now.getMonth() &&
      latestDate.getDate() === now.getDate()
    ) {
      return null; // Latest entry is today, no hint needed
    }
    return latest.date;
  }, [expenses]);

  const recentEntries = useMemo(() => {
    if (!lastEntryDay) return [];
    return expenses
      .filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        const ld = new Date(lastEntryDay);
        return (
          d.getFullYear() === ld.getFullYear() &&
          d.getMonth() === ld.getMonth() &&
          d.getDate() === ld.getDate()
        );
      })
      .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))
      .slice(0, 3);
  }, [expenses, lastEntryDay]);

  const lastEntryDayLabel = useMemo(() => {
    if (!lastEntryDay) return "";
    const d = new Date(lastEntryDay);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate()
    ) {
      return "Yesterday";
    }
    return formatShortDate(d.getTime(), userCurrency);
  }, [lastEntryDay]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 space-y-4 px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {/* Date navigator */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPreviousDay}
            aria-label="Previous day"
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              if (!isToday && onGoToToday) onGoToToday();
            }}
            aria-label="Go to today"
            disabled={isToday}
            className="text-sm font-semibold text-slate-900 dark:text-slate-100 disabled:opacity-60"
          >
            {summary.dateLabel}
          </button>
          <button
            onClick={onNextDay}
            aria-label="Next day"
            disabled={isToday}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Summary card */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Spent</p>
            <p className="mt-1 text-sm font-bold text-red-500">
              {formatCurrencySymbol(summary.totalSpent, userCurrency)}
            </p>
          </div>
          <div className="text-center border-x border-slate-100 dark:border-slate-700">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Received</p>
            <p className="mt-1 text-sm font-bold text-green-500">
              {formatCurrencySymbol(summary.totalReceived, userCurrency)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Net</p>
            <p
              className={`mt-1 text-sm font-bold ${
                summary.netAmount >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrencySymbol(Math.abs(summary.netAmount), userCurrency)}
              {summary.netAmount >= 0 ? " +" : " -"}
            </p>
          </div>
        </div>

        {/* Streak + participation */}
        <div className="flex flex-wrap items-center gap-2">
          {gamification.loggingStreak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/20 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
              <Flame className="h-3.5 w-3.5" />
              {gamification.loggingStreak} day streak
            </span>
          )}
          {isToday && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <Users className="h-3.5 w-3.5" />
              {gamification.membersLoggedToday}/{gamification.totalMembers} logged today
            </span>
          )}
        </div>

        {/* Gamification card */}
        {gamification && (gamification.monthlyBadge || gamification.insightMessage || isToday) && (
          <GamificationCard gamification={gamification} isToday={isToday} />
        )}

        {/* Entries list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {summary.entries.length === 0 ? (
            <div className="col-span-full space-y-3">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 py-10 text-center">
                <Receipt className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
                  {isToday ? "No entries yet today" : "No entries for this day"}
                </p>
                <p className="text-xs text-slate-400">Tap Add Entry to log a new entry</p>
              </div>
              {isToday && recentEntries.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {lastEntryDayLabel} · {recentEntries.length} {recentEntries.length === 1 ? "entry" : "entries"}
                    </p>
                    <button
                      onClick={onPreviousDay}
                      className="text-xs font-semibold text-trevio-600 dark:text-trevio-400 hover:underline"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {recentEntries.map((entry) => {
                      const iconName = getCategoryIcon(entry.category);
                      const Icon = ICON_MAP[iconName] ?? Package;
                      const color = getCategoryColor(entry.category);
                      const isIncome = (entry.transactionType ?? "expense") === "income";
                      return (
                        <button
                          key={entry.expenseId}
                          onClick={() => onViewEntry(entry)}
                          className="flex w-full items-center gap-2.5 rounded-lg bg-white dark:bg-slate-800 px-3 py-2 transition hover:bg-slate-50 dark:hover:bg-slate-700 text-left"
                        >
                          <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${color}`}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <p className="flex-1 text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                            {entry.description || getCategoryLabel(entry.category)}
                          </p>
                          <p className={`text-xs font-bold ${isIncome ? "text-green-500" : "text-red-500"}`}>
                            {formatCurrencySymbol(entry.amount, userCurrency)}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            summary.entries.map((entry) => {
              const iconName = getCategoryIcon(entry.category);
              const Icon = ICON_MAP[iconName] ?? Package;
              const color = getCategoryColor(entry.category);
              const isIncome = (entry.transactionType ?? "expense") === "income";
              const name = memberName(members, entry.paidBy);

              return (
                <div
                  key={entry.expenseId}
                  className="group flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 transition hover:border-slate-300 dark:hover:border-slate-600"
                >
                  <button
                    onClick={() => onViewEntry(entry)}
                    className="flex flex-1 items-center gap-2.5 text-left min-w-0"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${color}20`, color }}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {entry.description || getCategoryLabel(entry.category)}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {name} · {entry.date ? formatTime(entry.date, userCurrency) : ""}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-sm font-bold ${
                        isIncome ? "text-green-500" : "text-red-500"
                      }`}
                    >
                      {isIncome ? "+" : "-"}
                      {formatCurrencySymbol(entry.amount, userCurrency)}
                    </span>
                    <button
                      onClick={() => onEditEntry(entry)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteEntry(entry.expenseId)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
