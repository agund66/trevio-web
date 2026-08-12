"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  X,
  Trash2,
  Save,
  Loader2,
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
} from "lucide-react";
import type { Expense, Member, TransactionType } from "@/lib/types";
import { getCategories } from "@/lib/utils/household-categories";
import { formatCurrencySymbol, getCurrencySymbol } from "@/lib/utils/currency";
import { Avatar } from "@/components/avatar";
import { BASE_CURRENCY } from "@/lib/constants/currency";

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

interface EditEntrySheetProps {
  entry: Expense | null;
  members: Member[];
  isSaving: boolean;
  userCurrency?: string;
  onUpdate: (
    expenseId: string,
    amount: number,
    description: string,
    category: string,
    paidBy: string,
    date: number,
    note: string,
    transactionType: TransactionType
  ) => void;
  onDelete: (expenseId: string) => void;
  onClose: () => void;
}

export function EditEntrySheet({
  entry,
  members,
  isSaving,
  userCurrency = BASE_CURRENCY,
  onUpdate,
  onDelete,
  onClose,
}: EditEntrySheetProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("other");
  const [paidBy, setPaidBy] = useState("");
  const [transactionType, setTransactionType] = useState<TransactionType>("expense");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("household");

  useEffect(() => {
    if (!entry) return;
    setAmount(String(entry.amount));
    setDescription(entry.description);
    setNote(entry.note ?? "");
    setCategory(entry.category || "other");
    setPaidBy(entry.paidBy);
    setTransactionType(entry.transactionType ?? "expense");

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
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

  const categories = getCategories(transactionType === "income");
  const activeMembers = members.filter((m) => m.status === "active");

  const handleSave = () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    if (!paidBy || paidBy.trim() === "") return;
    onUpdate(
      entry.expenseId,
      parsed,
      description.trim(),
      category,
      paidBy,
      entry.date ?? Date.now(),
      note.trim(),
      transactionType
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div ref={sheetRef} role="dialog" aria-modal="true" className="relative w-full left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200 dark:bg-slate-600" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {t('editEntry.title')}
          </h3>
          <button
            onClick={onClose}
            aria-label={t('editEntry.closeAria')}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Amount */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('editEntry.amount')}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {getCurrencySymbol(userCurrency)}
              </span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSaving}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-2.5 pl-8 pr-3 text-sm font-semibold text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Transaction type toggle */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('editEntry.type')}
            </label>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-600 overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  setTransactionType("expense");
                  setCategory("other");
                }}
                disabled={isSaving}
                className={`flex-1 py-2.5 text-xs font-semibold transition ${
                  transactionType === "expense"
                    ? "bg-red-500 text-white"
                    : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {t('editEntry.spent')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransactionType("income");
                  setCategory("other_income");
                }}
                disabled={isSaving}
                className={`flex-1 py-2.5 text-xs font-semibold transition ${
                  transactionType === "income"
                    ? "bg-green-500 text-white"
                    : "bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {t('editEntry.received')}
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('editEntry.description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={isSaving}
              placeholder={t('editEntry.descriptionPlaceholder')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500 disabled:opacity-50"
            />
          </div>

          {/* Category chips */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('editEntry.category')}
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = ICON_MAP[cat.icon] ?? Package;
                const selected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    disabled={isSaving}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50 ${
                      selected
                        ? "border-transparent text-white"
                        : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                    style={selected ? { backgroundColor: cat.color } : undefined}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid by */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('editEntry.paidBy')}
            </label>
            <div className="flex flex-wrap gap-2">
              {activeMembers.map((m) => {
                const selected = paidBy === m.uid;
                return (
                  <button
                    key={m.uid}
                    type="button"
                    onClick={() => setPaidBy(m.uid)}
                    disabled={isSaving}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
                      selected
                        ? "border-trevio-500 bg-trevio-50 dark:bg-trevio-900/20 text-trevio-700 dark:text-trevio-300"
                        : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <Avatar photoURL={m.photoURL} displayName={m.displayName} className="h-5 w-5" textClassName="text-[9px]" />
                    {m.displayName.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('editEntry.note')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              disabled={isSaving}
              rows={2}
              placeholder={t('editEntry.notePlaceholder')}
              className="w-full resize-none rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 py-2.5 px-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500 disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          {showDeleteConfirm ? (
            <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
              <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                {t('editEntry.deleteConfirm')}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  aria-label={t('editEntry.cancelAria')}
                  disabled={isSaving}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  {t('editEntry.cancel')}
                </button>
                <button
                  onClick={() => onDelete(entry.expenseId)}
                  aria-label={t('editEntry.deleteEntryAria')}
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  {isSaving ? t('editEntry.deleting') : t('editEntry.delete')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                aria-label={t('editEntry.deleteEntryAria')}
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {t('editEntry.delete')}
              </button>
              <button
                onClick={handleSave}
                aria-label={t('editEntry.saveEntryAria')}
                disabled={isSaving || !amount || !paidBy}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t('editEntry.save')}
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
