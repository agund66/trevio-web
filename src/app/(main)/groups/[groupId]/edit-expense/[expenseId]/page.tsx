"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { useAuth } from "@/lib/hooks/use-auth";
import { ArrowLeft, Calendar, Loader2, Trash2, StickyNote } from "lucide-react";
import type { SplitType, SplitEntry } from "@/lib/types";

export default function EditExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const expenseId = params.expenseId as string;
  const { expense, settlement, group } = useServices();
  const { userCurrency } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(userCurrency);
  const [category, setCategory] = useState("other");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [paidByUid, setPaidByUid] = useState("");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [excludedMembers, setExcludedMembers] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [loaded, setLoaded] = useState(false);

  const { data: members } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => settlement.getGroupBalances(groupId),
  });

  const { data: expensesData } = useQuery({
    queryKey: ["expenses", groupId],
    queryFn: () => expense.getGroupExpenses(groupId, 50),
  });

  const activeMembers = useMemo(
    () => members?.filter((m) => m.status === "active") ?? [],
    [members]
  );

  const existingExpense = useMemo(
    () => expensesData?.expenses.find((e) => e.expenseId === expenseId),
    [expensesData, expenseId]
  );

  const canEdit = useMemo(() => {
    if (!existingExpense || !user) return false;
    const member = members?.find((m) => m.uid === user.uid);
    return existingExpense.createdBy === user.uid || member?.role === "admin";
  }, [existingExpense, user, members]);

  useEffect(() => {
    if (existingExpense && !loaded) {
      setDescription(existingExpense.description);
      setAmount(String(existingExpense.amount));
      setCurrency(existingExpense.currency);
      setCategory(existingExpense.category);
      setSplitType(existingExpense.splitType);
      setPaidByUid(existingExpense.paidBy);
      setNote(existingExpense.note || "");
      if (existingExpense.splitType !== "equal" && existingExpense.splits) {
        const sv: Record<string, string> = {};
        for (const [uid, split] of Object.entries(existingExpense.splits)) {
          sv[uid] = split.shareValue !== undefined ? String(split.shareValue) : String(split.amount);
        }
        setSplitValues(sv);
      }
      setLoaded(true);
    }
  }, [existingExpense, loaded]);

  const includedMembers = useMemo(
    () => activeMembers.filter((m) => !excludedMembers.has(m.uid)),
    [activeMembers, excludedMembers]
  );

  const numericAmount = useMemo(() => {
    const cleaned = amount.replace(/[^0-9.+\-*/]/g, "");
    if (!cleaned) return 0;
    try {
      const result = Function(`"use strict"; return (${cleaned})`)();
      return typeof result === "number" && isFinite(result) ? result : 0;
    } catch {
      return parseFloat(cleaned) || 0;
    }
  }, [amount]);

  const splitSummary = useMemo(() => {
    if (splitType === "equal" || !numericAmount) return null;
    let totalEntered = 0;
    for (const m of includedMembers) {
      const val = parseFloat(splitValues[m.uid] || "0") || 0;
      totalEntered += val;
    }
    if (splitType === "percent") return { entered: totalEntered, expected: 100, label: "%" };
    if (splitType === "exact") return { entered: totalEntered, expected: numericAmount, label: currency };
    if (splitType === "shares") return { entered: totalEntered, expected: 0, label: "shares" };
    return null;
  }, [splitType, splitValues, includedMembers, numericAmount, currency]);

  const isSplitValid = useMemo(() => {
    if (splitType === "equal") return includedMembers.length > 0;
    if (!numericAmount || includedMembers.length === 0) return false;
    if (splitType === "shares") return Object.values(splitValues).some((v) => parseFloat(v) > 0);
    if (!splitSummary) return false;
    return Math.abs(splitSummary.entered - splitSummary.expected) < 0.01;
  }, [splitType, splitValues, includedMembers, numericAmount, splitSummary]);

  const currencySymbol = (curr: string) => {
    const symbols: Record<string, string> = { INR: "\u20B9", USD: "$", EUR: "\u20AC", GBP: "\u00A3", JPY: "\u00A5", AUD: "A$", CAD: "C$", SGD: "S$", AED: "\u062F.\u0625" };
    return symbols[curr] || curr;
  };

  const buildSplits = (): Record<string, SplitEntry> => {
    if (splitType === "equal") return {};
    const splits: Record<string, SplitEntry> = {};
    for (const m of includedMembers) {
      const val = parseFloat(splitValues[m.uid] || "0") || 0;
      if (splitType === "shares" && val > 0) splits[m.uid] = { amount: 0, shareValue: val };
      else if (splitType === "percent" && val > 0) splits[m.uid] = { amount: 0, shareValue: val };
      else if (splitType === "exact" && val > 0) splits[m.uid] = { amount: val };
    }
    return splits;
  };

  const toggleExclude = (uid: string) => {
    setExcludedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const categories = ["food", "transport", "shopping", "turf", "accommodation", "other"];
  const splitTypes: SplitType[] = ["equal", "exact", "percent", "shares"];

  const splitLabel = (st: SplitType) => {
    switch (st) {
      case "equal": return "Equal";
      case "exact": return "Exact Amount";
      case "percent": return "Percentage";
      case "shares": return "Shares";
    }
  };

  const splitPlaceholder = (st: SplitType) => {
    switch (st) {
      case "exact": return "0.00";
      case "percent": return "0";
      case "shares": return "0";
      default: return "";
    }
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      expense.updateExpense({
        groupId,
        expenseId,
        description,
        amount: numericAmount,
        currency,
        paidBy: paidByUid || activeMembers.find((m) => m.uid === user?.uid)?.uid || activeMembers[0]?.uid || "",
        splitType,
        splits: buildSplits(),
        memberUids: includedMembers.map((m) => m.uid),
        category,
        note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      router.push(`/groups/${groupId}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => expense.deleteExpense(groupId, expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      router.push(`/groups/${groupId}`);
    },
  });

  if (!existingExpense && loaded) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">Expense not found.</p>
        <button onClick={() => router.push(`/groups/${groupId}`)} className="mt-4 text-sm text-trevio-600 dark:text-trevio-400 hover:underline">
          Back to group
        </button>
      </div>
    );
  }

  if (loaded && !canEdit) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">You can only edit expenses you created. Group admins can also edit any expense.</p>
        <button onClick={() => router.push(`/groups/${groupId}`)} className="mt-4 text-sm text-trevio-600 dark:text-trevio-400 hover:underline">
          Back to group
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Edit Expense</h1>

      {!loaded ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-trevio-600" />
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
                {currencySymbol(currency)}
              </span>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.+\-*/]/g, ""))}
                placeholder="0.00"
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-4 pl-12 text-3xl font-bold text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Dinner at restaurant"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition ${
                    category === cat ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <StickyNote className="h-4 w-4 text-slate-400" />
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this expense..."
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none resize-none"
            />
          </div>

          {activeMembers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Paid by</label>
              <div className="flex flex-wrap gap-2">
                {activeMembers.map((m) => (
                  <button
                    key={m.uid}
                    onClick={() => setPaidByUid(m.uid)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                      (paidByUid || activeMembers.find((m) => m.uid === user?.uid)?.uid || activeMembers[0]?.uid) === m.uid
                        ? "bg-trevio-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {m.displayName.split(" ")[0]}
                    {m.uid === user?.uid && <span className="ml-1 text-xs opacity-70">(You)</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Split method</label>
            <div className="flex flex-wrap gap-2">
              {splitTypes.map((st) => (
                <button
                  key={st}
                  onClick={() => setSplitType(st)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    splitType === st ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  }`}
                >
                  {splitLabel(st)}
                </button>
              ))}
            </div>
          </div>

          {splitType !== "equal" && activeMembers.length > 0 && numericAmount > 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {splitType === "exact" && "Enter exact amount for each member"}
                  {splitType === "percent" && "Enter percentage for each member"}
                  {splitType === "shares" && "Enter shares for each member"}
                </span>
                {splitSummary && splitType !== "shares" && (
                  <span className={`text-xs font-semibold ${isSplitValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}`}>
                    {splitSummary.entered.toFixed(2)} / {splitSummary.expected.toFixed(2)} {splitSummary.label}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {includedMembers.map((m) => {
                  const val = splitValues[m.uid] || "";
                  return (
                    <div key={m.uid} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{m.displayName}{m.uid === user?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">(You)</span>}</p>
                      </div>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setSplitValues({ ...splitValues, [m.uid]: e.target.value.replace(/[^0-9.]/g, "") })}
                        placeholder={splitPlaceholder(splitType)}
                        className="w-20 sm:w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 text-right focus:border-trevio-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {updateMutation.isError && (
            <p className="text-sm text-red-500 dark:text-red-400">{updateMutation.error instanceof Error ? updateMutation.error.message : "Failed to update expense"}</p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => updateMutation.mutate()}
              disabled={!description.trim() || !amount || !isSplitValid || updateMutation.isPending}
              className="flex-1 rounded-xl bg-trevio-600 py-4 text-base font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateMutation.isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </span>
              ) : (
                "Save Changes"
              )}
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this expense? This action cannot be undone.")) {
                  deleteMutation.mutate();
                }
              }}
              disabled={deleteMutation.isPending}
              className="rounded-xl border-2 border-red-200 dark:border-red-800 px-6 py-4 text-base font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
