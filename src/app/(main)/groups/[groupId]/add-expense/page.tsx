"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { useAuth } from "@/lib/hooks/use-auth";
import { ArrowLeft, Calendar, Plus, Loader2, StickyNote, Repeat, Receipt } from "lucide-react";
import type { SplitType, SplitEntry, Member, RecurringFrequency, ItemizedSplitData, BillItem } from "@/lib/types";
import { ItemizedSplitEditor } from "@/components/itemized-split-editor";

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { expense, settlement, group } = useServices();
  const { userCurrency } = useCurrencyDisplay();
  const queryClient = useQueryClient();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(userCurrency);
  const [category, setCategory] = useState("other");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [paidByUid, setPaidByUid] = useState("");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [excludedMembers, setExcludedMembers] = useState<Set<string>>(new Set());
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [note, setNote] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState<RecurringFrequency>("monthly");
  const [itemizedData, setItemizedData] = useState<ItemizedSplitData>({ items: [], taxAmount: 0, tipAmount: 0, taxSplitMode: "proportional", tipSplitMode: "proportional" });
  const { user } = useAuth();

  const { data: members } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => settlement.getGroupBalances(groupId),
  });

  const { data: groupInfo } = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: () => group.getGroupInfo(groupId),
  });

  const activeMembers = useMemo(
    () => members?.filter((m) => m.status === "active") ?? [],
    [members]
  );
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
  const equalPerPerson = useMemo(() => {
    if (splitType !== "equal" || numericAmount <= 0 || includedMembers.length === 0) return 0;
    return numericAmount / includedMembers.length;
  }, [splitType, numericAmount, includedMembers]);

  const splitSummary = useMemo(() => {
    if (splitType === "equal" || !numericAmount) return null;
    let totalEntered = 0;
    for (const m of includedMembers) {
      const val = parseFloat(splitValues[m.uid] || "0") || 0;
      totalEntered += val;
    }
    if (splitType === "percent") {
      return { entered: totalEntered, expected: 100, label: "%" };
    }
    if (splitType === "exact") {
      return { entered: totalEntered, expected: numericAmount, label: currency };
    }
    if (splitType === "shares") {
      return { entered: totalEntered, expected: 0, label: "shares" };
    }
    return null;
  }, [splitType, splitValues, includedMembers, numericAmount, currency]);

  const currencySymbol = (curr: string) => {
    const symbols: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", JPY: "¥", AUD: "A$", CAD: "C$", SGD: "S$", AED: "د.إ" };
    return symbols[curr] || curr;
  };

  const isSplitValid = useMemo(() => {
    if (splitType === "equal") return includedMembers.length > 0;
    if (splitType === "itemized") {
      if (itemizedData.items.length === 0) return false;
      return itemizedData.items.every((i) => i.name.trim() && i.amount > 0 && i.assignedTo.length > 0);
    }
    if (!numericAmount || includedMembers.length === 0) return false;
    if (splitType === "shares") {
      return Object.values(splitValues).some((v) => parseFloat(v) > 0);
    }
    if (!splitSummary) return false;
    return Math.abs(splitSummary.entered - splitSummary.expected) < 0.01;
  }, [splitType, splitValues, includedMembers, numericAmount, splitSummary, itemizedData]);

  const buildSplits = (): Record<string, SplitEntry> => {
    if (splitType === "equal" || splitType === "itemized") return {};

    const splits: Record<string, SplitEntry> = {};
    for (const m of includedMembers) {
      const val = parseFloat(splitValues[m.uid] || "0") || 0;
      if (splitType === "shares" && val > 0) {
        splits[m.uid] = { amount: 0, shareValue: val };
      } else if (splitType === "percent" && val > 0) {
        splits[m.uid] = { amount: 0, shareValue: val };
      } else if (splitType === "exact" && val > 0) {
        splits[m.uid] = { amount: val };
      }
    }
    return splits;
  };

  const resetForm = () => {
    setDescription("");
    setAmount("");
    setCategory("other");
    setSplitType("equal");
    setSplitValues({});
    setExcludedMembers(new Set());
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setNote("");
    setIsRecurring(false);
    setItemizedData({ items: [], taxAmount: 0, tipAmount: 0, taxSplitMode: "proportional", tipSplitMode: "proportional" });
  };

  const addMutation = useMutation({
    mutationFn: () =>
      expense.addExpense({
        groupId,
        description,
        amount: numericAmount,
        currency,
        paidBy: paidByUid || activeMembers.find((m) => m.uid === user?.uid)?.uid || activeMembers[0]?.uid || "",
        splitType,
        splits: buildSplits(),
        memberUids: includedMembers.map((m) => m.uid),
        category,
        date: new Date(expenseDate).getTime(),
        note: note.trim() || undefined,
        recurring: isRecurring ? { frequency: recurringFreq } : undefined,
        itemizedData: splitType === "itemized" ? itemizedData : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      if (saveAndAddAnother) {
        resetForm();
        setSaveAndAddAnother(false);
      } else {
        router.push(`/groups/${groupId}`);
      }
    },
  });

  const categories = ["food", "transport", "shopping", "turf", "accommodation", "other"];
  const splitTypes: SplitType[] = ["equal", "exact", "percent", "shares", "itemized"];

  const toggleExclude = (uid: string) => {
    setExcludedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const splitLabel = (st: SplitType) => {
    switch (st) {
      case "equal": return "Equal";
      case "exact": return "Exact Amount";
      case "percent": return "Percentage";
      case "shares": return "Shares";
      case "itemized": return "Items";
    }
  };

  const splitPlaceholder = (st: SplitType) => {
    switch (st) {
      case "exact": return "0.00";
      case "percent": return "0";
      case "shares": return "0";
      case "itemized": return "";
      default: return "";
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Add Expense</h1>

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
          {numericAmount > 0 && /[+\-*/]/.test(amount) && (
            <p className="mt-1 text-xs text-trevio-600 font-medium">
              = {currencySymbol(currency)}{numericAmount.toFixed(2)}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-400 dark:text-slate-500">Quick calc:</span>
            {[
              { label: "+", op: "+" },
              { label: "−", op: "-" },
              { label: "×", op: "*" },
              { label: "÷", op: "/" },
            ].map((btn) => (
              <button
                key={btn.op}
                onClick={() => setAmount((prev) => prev + btn.op)}
                className="h-8 w-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 transition hover:bg-trevio-50 dark:hover:bg-trevio-900/30 hover:border-trevio-300 dark:hover:border-trevio-700 hover:text-trevio-600 dark:hover:text-trevio-400"
              >
                {btn.label}
              </button>
            ))}
            {amount && (
              <button
                onClick={() => setAmount("")}
                className="ml-auto rounded-lg px-2 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 transition hover:text-slate-600 dark:hover:text-slate-300"
              >
                Clear
              </button>
            )}
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
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 pl-10 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>
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

        {members === undefined ? (
          <div className="space-y-2">
            <div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-9 w-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ))}
            </div>
          </div>
        ) : activeMembers.length > 0 ? (
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
        ) : null}

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

        {splitType === "equal" && activeMembers.length > 0 && numericAmount > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {currencySymbol(currency)}{equalPerPerson.toFixed(2)} per person
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">{includedMembers.length} of {activeMembers.length} members</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeMembers.map((m) => {
                const excluded = excludedMembers.has(m.uid);
                return (
                  <button
                    key={m.uid}
                    onClick={() => toggleExclude(m.uid)}
                    className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                      excluded
                        ? "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 line-through"
                        : "bg-trevio-50 dark:bg-trevio-900/30 text-trevio-700 dark:text-trevio-300 border border-trevio-200 dark:border-trevio-700"
                    }`}
                  >
                    {m.displayName.split(" ")[0]}{m.uid === user?.uid && <span className="ml-1 text-xs opacity-70">(You)</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {splitType === "itemized" && activeMembers.length > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Receipt className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Split bill by items
              </span>
            </div>
            <ItemizedSplitEditor
              members={activeMembers}
              currency={currency}
              itemizedData={itemizedData}
              onChange={setItemizedData}
            />
          </div>
        )}

        {splitType !== "equal" && splitType !== "itemized" && activeMembers.length > 0 && numericAmount > 0 && (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {splitType === "exact" && "Enter exact amount for each member"}
                {splitType === "percent" && "Enter percentage for each member"}
                {splitType === "shares" && "Enter shares for each member"}
              </span>
              {splitSummary && splitType !== "shares" && (
                <span className={`text-xs font-semibold ${
                  isSplitValid ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"
                }`}>
                  {splitSummary.entered.toFixed(2)} / {splitSummary.expected.toFixed(2)} {splitSummary.label}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {includedMembers.map((m) => {
                const val = splitValues[m.uid] || "";
                let displayAmount = "";
                if (splitType === "percent" && val && numericAmount) {
                  displayAmount = `= ${currencySymbol(currency)}${((parseFloat(val) / 100) * numericAmount).toFixed(2)}`;
                } else if (splitType === "shares" && val) {
                  const totalShares = Object.values(splitValues).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                  if (totalShares > 0 && numericAmount) {
                    displayAmount = `= ${currencySymbol(currency)}${((parseFloat(val) / totalShares) * numericAmount).toFixed(2)}`;
                  }
                }
                return (
                  <div key={m.uid} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{m.displayName}{m.uid === user?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">(You)</span>}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {displayAmount && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">{displayAmount}</span>
                      )}
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setSplitValues({ ...splitValues, [m.uid]: e.target.value.replace(/[^0-9.]/g, "") })}
                        placeholder={splitPlaceholder(splitType)}
                        className="w-20 sm:w-24 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 text-right focus:border-trevio-500 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {includedMembers.length < activeMembers.length && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Excluded members (tap to include):</p>
                <div className="flex flex-wrap gap-2">
                  {activeMembers.filter((m) => excludedMembers.has(m.uid)).map((m) => (
                    <button
                      key={m.uid}
                      onClick={() => toggleExclude(m.uid)}
                      className="rounded-xl px-3 py-1.5 text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                    >
                      {m.displayName.split(" ")[0]}{m.uid === user?.uid && <span className="ml-1 text-xs opacity-70">(You)</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {splitType === "shares" && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Amounts are split proportionally based on share values.</p>
            )}
          </div>
        )}

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

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-trevio-600 focus:ring-trevio-500"
            />
            <Repeat className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Make this a recurring expense</span>
          </label>
          {isRecurring && (
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setRecurringFreq("weekly")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  recurringFreq === "weekly" ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setRecurringFreq("monthly")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  recurringFreq === "monthly" ? "bg-trevio-600 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                Monthly
              </button>
            </div>
          )}
        </div>

        {addMutation.isError && (
          <p className="text-sm text-red-500 dark:text-red-400">{addMutation.error instanceof Error ? addMutation.error.message : "Failed to add expense"}</p>
        )}

        {!isSplitValid && numericAmount > 0 && splitType !== "equal" && splitType !== "itemized" && includedMembers.length > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            {splitType === "percent" && `Total must be 100% (currently ${splitSummary?.entered ?? 0}%)`}
            {splitType === "exact" && `Total must match ${currencySymbol(currency)}${numericAmount.toFixed(2)} (currently ${currencySymbol(currency)}${(splitSummary?.entered ?? 0).toFixed(2)})`}
            {splitType === "shares" && "Enter at least one share value"}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => addMutation.mutate()}
            disabled={!description.trim() || !amount || !isSplitValid || addMutation.isPending}
            className="flex-1 rounded-xl bg-trevio-600 py-4 text-base font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {addMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </span>
            ) : (
              "Save Expense"
            )}
          </button>
          <button
            onClick={() => {
              setSaveAndAddAnother(true);
              addMutation.mutate();
            }}
            disabled={!description.trim() || !amount || !isSplitValid || addMutation.isPending}
            className="flex-1 rounded-xl border-2 border-trevio-600 py-4 text-base font-semibold text-trevio-600 dark:text-trevio-400 transition hover:bg-trevio-50 dark:hover:bg-trevio-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="flex items-center justify-center gap-2">
              <Plus className="h-5 w-5" />
              Save & Add Another
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
