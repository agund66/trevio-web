"use client";

import { useEffect, useRef, useState } from "react";
import {
  X, Pencil, Trash2, TrendingDown, TrendingUp, Calendar, User, StickyNote,
  ShoppingCart, Sprout, Zap, Home, Car, Stethoscope, GraduationCap,
  Film, Utensils, ShoppingBag, Sparkles, Shield, Package,
  Briefcase, PartyPopper, Gift, Undo2, Building2, PersonStanding, Landmark,
} from "lucide-react";
import type { Expense, Member, TransactionType } from "@/lib/types";
import { getCategoryIcon, getCategoryColor, getCategoryLabel } from "@/lib/utils/household-categories";
import { formatCurrencySymbol } from "@/lib/utils/currency";
import { formatFullDate } from "@/lib/utils/date";
import { Avatar } from "@/components/avatar";

const ICON_MAP: Record<string, typeof Package> = {
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

interface EntryDetailSheetProps {
  entry: Expense | null;
  members: Member[];
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  userCurrency?: string;
}

function memberInfo(members: Member[], uid: string): Member | undefined {
  return members.find((m) => m.uid === uid);
}

export function EntryDetailSheet({
  entry,
  members,
  onEdit,
  onDelete,
  onClose,
  userCurrency = "INR",
}: EntryDetailSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (entry) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      setShowDeleteConfirm(false);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [entry, onClose]);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = sheet.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    sheet.addEventListener("keydown", handleTab);
    // Focus first element on open
    const focusable = sheet.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable.length > 0) focusable[0].focus();
    return () => sheet.removeEventListener("keydown", handleTab);
  }, []);

  if (!entry) return null;

  const iconName = getCategoryIcon(entry.category);
  const Icon = ICON_MAP[iconName] ?? Package;
  const color = getCategoryColor(entry.category);
  const isIncome = (entry.transactionType ?? "expense") === "income";
  const payer = memberInfo(members, entry.paidBy);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity"
        onClick={onClose}
      />
      <div ref={sheetRef} role="dialog" aria-modal="true" className="fixed inset-x-0 bottom-0 z-50 w-full left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-600" />

        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Entry Details</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category + Amount */}
        <div className="flex items-center gap-3 mb-5">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="h-7 w-7" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {getCategoryLabel(entry.category)}
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
              {isIncome ? "+" : "-"}{formatCurrencySymbol(entry.amount, userCurrency)}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              isIncome
                ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
            }`}
          >
            {isIncome ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isIncome ? "Received" : "Spent"}
          </span>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-5">
          {entry.description && entry.description !== getCategoryLabel(entry.category) && (
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Description</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{entry.description}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            <div className="flex items-center gap-2">
              {payer && <Avatar photoURL={payer.photoURL} displayName={payer.displayName} className="h-6 w-6" textClassName="text-xs" />}
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {payer?.displayName ?? "Someone"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {entry.date ? formatFullDate(entry.date, userCurrency) : "—"}
            </p>
          </div>

          {entry.note && (
            <div className="flex items-start gap-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 p-3">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Note</p>
                <p className="text-sm text-slate-700 dark:text-slate-300">{entry.note}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {showDeleteConfirm ? (
          <div className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm font-semibold text-red-900 dark:text-red-300 mb-3">
              Delete this entry? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                aria-label="Cancel"
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={onDelete}
                aria-label="Delete entry"
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={onEdit}
              aria-label="Edit entry"
              className="flex-1 rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700"
            >
              <span className="flex items-center justify-center gap-2">
                <Pencil className="h-4 w-4" />
                Edit
              </span>
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete entry"
              className="rounded-xl border-2 border-red-200 dark:border-red-800 px-6 py-3 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
