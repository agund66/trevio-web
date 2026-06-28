"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { formatCurrency } from "@/lib/utils";
import { Plus, ArrowLeft, Wallet, Receipt, Check } from "lucide-react";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { expense, settlement } = useServices();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"expenses" | "balances">("expenses");

  const { data: expensesData, isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses", groupId],
    queryFn: () => expense.getGroupExpenses(groupId, 50),
  });

  const { data: members } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => settlement.getGroupBalances(groupId),
  });

  const { data: debts } = useQuery({
    queryKey: ["debts", groupId],
    queryFn: () => settlement.getSimplifiedDebts(groupId),
  });

  const settleMutation = useMutation({
    mutationFn: (debt: { fromUid: string; toUid: string; amount: number }) =>
      settlement.addSettlement({
        groupId,
        fromUid: debt.fromUid,
        toUid: debt.toUid,
        amount: debt.amount,
        currency: "INR",
        method: "cash" as const,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
    },
  });

  return (
    <div className="p-6 md:p-8">
      <button onClick={() => router.push("/dashboard")} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Group Details</h1>
        <button
          onClick={() => router.push(`/groups/${groupId}/add-expense`)}
          className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        <button
          onClick={() => setTab("expenses")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === "expenses" ? "border-trevio-600 text-trevio-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Receipt className="h-4 w-4" />
          Expenses
        </button>
        <button
          onClick={() => setTab("balances")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === "balances" ? "border-trevio-600 text-trevio-600" : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Wallet className="h-4 w-4" />
          Balances
        </button>
      </div>

      {tab === "expenses" && (
        <div className="space-y-3">
          {expensesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : expensesData && expensesData.expenses.length > 0 ? (
            expensesData.expenses.map((e) => (
              <div key={e.expenseId} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{e.description}</p>
                  <p className="text-sm text-slate-500">{e.category}</p>
                </div>
                <p className="text-lg font-bold text-trevio-600">{formatCurrency(e.amount, e.currency)}</p>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <Receipt className="h-12 w-12 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No expenses yet. Tap &quot;Add Expense&quot; to get started.</p>
            </div>
          )}
        </div>
      )}

      {tab === "balances" && (
        <div className="space-y-4">
          {debts && debts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Suggested Settlements</h3>
              {debts.map((d, i) => (
                <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex-1">
                    <p className="text-sm text-slate-900">
                      <span className="font-medium">{d.fromName}</span> owes <span className="font-medium">{d.toName}</span>
                    </p>
                    <p className="text-lg font-bold text-trevio-600">{formatCurrency(d.amount)}</p>
                  </div>
                  <button
                    onClick={() => settleMutation.mutate(d)}
                    disabled={settleMutation.isPending}
                    className="rounded-xl bg-trevio-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trevio-700 disabled:opacity-50"
                  >
                    Settle
                  </button>
                </div>
              ))}
            </div>
          )}

          {debts && debts.length === 0 && (
            <div className="flex flex-col items-center py-12 text-center">
              <Check className="h-12 w-12 text-green-500" />
              <p className="mt-3 text-sm font-medium text-slate-700">All settled up!</p>
            </div>
          )}

          {members && members.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Member Balances</h3>
              {members.map((m) => (
                <div key={m.uid} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.displayName} className="h-10 w-10 rounded-full" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-trevio-100 text-sm font-semibold text-trevio-700">
                      {m.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{m.displayName}</p>
                    <p className="text-xs text-slate-500">@{m.username}</p>
                  </div>
                  {m.balance > 0.01 ? (
                    <span className="rounded-lg bg-green-50 px-3 py-1 text-sm font-semibold text-green-600">
                      gets {formatCurrency(m.balance)}
                    </span>
                  ) : m.balance < -0.01 ? (
                    <span className="rounded-lg bg-red-50 px-3 py-1 text-sm font-semibold text-red-500">
                      owes {formatCurrency(Math.abs(m.balance))}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-50 px-3 py-1 text-sm font-medium text-slate-400">settled</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
