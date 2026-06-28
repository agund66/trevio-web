"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { ArrowLeft, Repeat } from "lucide-react";
import type { SplitType } from "@/lib/types";

export default function AddExpensePage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { expense, settlement } = useServices();
  const queryClient = useQueryClient();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFreq, setRecurringFreq] = useState("daily");
  const [paidByUid, setPaidByUid] = useState("");

  const { data: members } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => settlement.getGroupBalances(groupId),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      expense.addExpense({
        groupId,
        description,
        amount: parseFloat(amount),
        currency: "INR",
        paidBy: paidByUid || members?.[0]?.uid || "",
        splitType,
        splits: {},
        memberUids: members?.map((m) => m.uid) || [],
        category,
        isRecurring,
        recurringFrequency: isRecurring ? recurringFreq : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      router.push(`/groups/${groupId}`);
    },
  });

  const categories = ["food", "transport", "shopping", "turf", "accommodation", "other"];
  const splitTypes: SplitType[] = ["equal", "exact", "percent", "shares"];

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-8">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add Expense</h1>

      <div className="space-y-5">
        <div>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            className="w-full rounded-2xl border border-slate-200 px-4 py-4 text-3xl font-bold text-slate-900 focus:border-trevio-500 focus:outline-none"
          />
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

        {members && members.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Paid by</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
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
                className={`rounded-xl px-3 py-1.5 text-sm font-medium capitalize transition ${
                  splitType === st ? "bg-trevio-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

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
          disabled={!description.trim() || !amount || addMutation.isPending}
          className="w-full rounded-xl bg-trevio-600 py-4 text-base font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addMutation.isPending ? "Saving..." : "Save Expense"}
        </button>
      </div>
    </div>
  );
}
