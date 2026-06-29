"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { ArrowLeft, Repeat } from "lucide-react";
import type { SplitType, SplitEntry } from "@/lib/types";

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { expense, settlement, group } = useServices();
  const queryClient = useQueryClient();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("daily");
  const [paidByUid, setPaidByUid] = useState("");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});

  const { data: members } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => settlement.getGroupBalances(groupId),
  });

  const { data: groupInfo } = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: () => group.getGroupInfo(groupId),
  });

  const currency = groupInfo?.currency || "INR";
  const activeMembers = useMemo(
    () => members?.filter((m) => m.status === "active") ?? [],
    [members]
  );
  const numericAmount = parseFloat(amount) || 0;

  const splitSummary = useMemo(() => {
    if (splitType === "equal" || !numericAmount) return null;
    let totalEntered = 0;
    for (const m of activeMembers) {
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
  }, [splitType, splitValues, activeMembers, numericAmount, currency]);

  const isSplitValid = useMemo(() => {
    if (splitType === "equal") return true;
    if (!numericAmount || activeMembers.length === 0) return false;
    if (splitType === "shares") {
      return Object.values(splitValues).some((v) => parseFloat(v) > 0);
    }
    if (!splitSummary) return false;
    return Math.abs(splitSummary.entered - splitSummary.expected) < 0.01;
  }, [splitType, splitValues, activeMembers, numericAmount, splitSummary]);

  const buildSplits = (): Record<string, SplitEntry> => {
    if (splitType === "equal") return {};

    const splits: Record<string, SplitEntry> = {};
    for (const m of activeMembers) {
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

  const addMutation = useMutation({
    mutationFn: () =>
      expense.addExpense({
        groupId,
        description,
        amount: numericAmount,
        currency,
        paidBy: paidByUid || activeMembers[0]?.uid || "",
        splitType,
        splits: buildSplits(),
        memberUids: activeMembers.map((m) => m.uid),
        category,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFreq : undefined,
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

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Expense</h1>

      <div className="space-y-5">
        <div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">
              {currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency === "JPY" ? "¥" : currency}
            </span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="0.00"
              className="w-full rounded-2xl border border-slate-200 px-4 py-4 pl-12 text-3xl font-bold text-slate-900 focus:border-trevio-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Dinner at restaurant"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition ${
                  category === cat ? "bg-trevio-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {activeMembers.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Paid by</label>
            <div className="flex flex-wrap gap-2">
              {activeMembers.map((m) => (
                <button
                  key={m.uid}
                  onClick={() => setPaidByUid(m.uid)}
                  className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                    paidByUid === m.uid ? "bg-trevio-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {m.displayName.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Split method</label>
          <div className="flex flex-wrap gap-2">
            {splitTypes.map((st) => (
              <button
                key={st}
                onClick={() => setSplitType(st)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  splitType === st ? "bg-trevio-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {splitLabel(st)}
              </button>
            ))}
          </div>
        </div>

        {splitType !== "equal" && activeMembers.length > 0 && numericAmount > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                {splitType === "exact" && "Enter exact amount for each member"}
                {splitType === "percent" && "Enter percentage for each member"}
                {splitType === "shares" && "Enter shares for each member"}
              </span>
              {splitSummary && splitType !== "shares" && (
                <span className={`text-xs font-semibold ${
                  isSplitValid ? "text-green-600" : "text-amber-600"
                }`}>
                  {splitSummary.entered.toFixed(2)} / {splitSummary.expected.toFixed(2)} {splitSummary.label}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {activeMembers.map((m) => {
                const val = splitValues[m.uid] || "";
                let displayAmount = "";
                if (splitType === "percent" && val && numericAmount) {
                  displayAmount = `= ${(currency === "INR" ? "₹" : "")}${((parseFloat(val) / 100) * numericAmount).toFixed(2)}`;
                } else if (splitType === "shares" && val) {
                  const totalShares = Object.values(splitValues).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                  if (totalShares > 0 && numericAmount) {
                    displayAmount = `= ${(currency === "INR" ? "₹" : "")}${((parseFloat(val) / totalShares) * numericAmount).toFixed(2)}`;
                  }
                }
                return (
                  <div key={m.uid} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{m.displayName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {displayAmount && (
                        <span className="text-xs text-slate-400">{displayAmount}</span>
                      )}
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => setSplitValues({ ...splitValues, [m.uid]: e.target.value.replace(/[^0-9.]/g, "") })}
                        placeholder={splitPlaceholder(splitType)}
                        className="w-20 sm:w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm text-right focus:border-trevio-500 focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {splitType === "shares" && (
              <p className="text-xs text-slate-400">Amounts are split proportionally based on share values.</p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4">
          <Repeat className="h-5 w-5 text-trevio-600" />
          <span className="flex-1 text-sm font-medium text-slate-700">Recurring expense</span>
          <button
            onClick={() => setIsRecurring(!isRecurring)}
            className={`relative h-6 w-11 rounded-full transition ${isRecurring ? "bg-trevio-600" : "bg-slate-300"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${isRecurring ? "left-5" : "left-0.5"}`} />
          </button>
        </div>

        {isRecurring && (
          <div className="flex gap-2">
            {["daily", "weekly", "monthly"].map((freq) => (
              <button
                key={freq}
                onClick={() => setRecurringFreq(freq)}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition ${
                  recurringFreq === freq ? "bg-trevio-600 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {freq}
              </button>
            ))}
          </div>
        )}

        {addMutation.isError && (
          <p className="text-sm text-red-500">{addMutation.error instanceof Error ? addMutation.error.message : "Failed to add expense"}</p>
        )}

        <button
          onClick={() => addMutation.mutate()}
          disabled={!description.trim() || !amount || !isSplitValid || addMutation.isPending}
          className="w-full rounded-xl bg-trevio-600 py-4 text-base font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addMutation.isPending ? "Saving..." : "Save Expense"}
        </button>
      </div>
    </div>
  );
}
