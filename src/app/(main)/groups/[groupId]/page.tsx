"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { formatCurrency } from "@/lib/utils";
import { Plus, ArrowLeft, Wallet, Receipt, Check, Users, Search, UserPlus, Copy, Clock, Share2 } from "lucide-react";
import type { UserSearchResult } from "@/lib/types";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { expense, settlement, group, user: userService } = useServices();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"expenses" | "balances" | "members">("expenses");
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const { data: groupInfo } = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: () => group.getGroupInfo(groupId),
  });

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
        currency: groupInfo?.currency || "INR",
        method: "cash" as const,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (username: string) => group.sendGroupInvitation(groupId, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      setSearchQuery("");
      setSearchResults([]);
      setInviteError(null);
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await userService.searchUsers(query);
      setSearchResults(results.filter((r) => !members?.some((m) => m.uid === r.uid)));
    } catch {
      setSearchResults([]);
    }
  };

  const copyInviteCode = () => {
    if (groupInfo?.inviteCode) {
      navigator.clipboard.writeText(groupInfo.inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareInviteLink = async () => {
    if (!groupInfo?.inviteCode) return;
    const url = `${window.location.origin}/join/${groupInfo.inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join "${groupInfo.name}" on Trevio`,
          text: `You've been invited to join "${groupInfo.name}" on Trevio. Tap to join and start splitting bills!`,
          url,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  const currency = groupInfo?.currency || "INR";

  return (
    <div className="p-6 md:p-8">
      <button onClick={() => router.push("/dashboard")} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900">{groupInfo?.name || "Group"}</h1>
        <button
          onClick={() => router.push(`/groups/${groupId}/add-expense`)}
          className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
        >
          <Plus className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {groupInfo?.description && (
        <p className="text-sm text-slate-500 mb-2">{groupInfo.description}</p>
      )}

      <div className="flex items-center gap-3 mb-6">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {groupInfo?.memberCount || 0} members
        </span>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {formatCurrency(groupInfo?.totalExpenses || 0, currency)} total
        </span>
        {groupInfo?.inviteCode && (
          <>
            <button
              onClick={copyInviteCode}
              className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-50 px-2.5 py-1 text-xs font-medium text-trevio-700 transition hover:bg-trevio-100"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied!" : `Code: ${groupInfo.inviteCode}`}
            </button>
            <button
              onClick={shareInviteLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-trevio-700"
            >
              <Share2 className="h-3 w-3" />
              {shared ? "Link Copied!" : "Share Invite"}
            </button>
          </>
        )}
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200">
        {([
          { key: "expenses", label: "Expenses", icon: Receipt },
          { key: "balances", label: "Balances", icon: Wallet },
          { key: "members", label: "Members", icon: Users },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition ${
              tab === t.key ? "border-trevio-600 text-trevio-600" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
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
                  <p className="text-sm text-slate-500 capitalize">{e.category}</p>
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
                    <p className="text-lg font-bold text-trevio-600">{formatCurrency(d.amount, currency)}</p>
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
                  {m.status === "pending" ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
                      <Clock className="h-3 w-3" />
                      pending
                    </span>
                  ) : m.balance > 0.01 ? (
                    <span className="rounded-lg bg-green-50 px-3 py-1 text-sm font-semibold text-green-600">
                      gets {formatCurrency(m.balance, currency)}
                    </span>
                  ) : m.balance < -0.01 ? (
                    <span className="rounded-lg bg-red-50 px-3 py-1 text-sm font-semibold text-red-500">
                      owes {formatCurrency(Math.abs(m.balance), currency)}
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

      {tab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Members ({members?.length || 0})</h3>
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-trevio-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700"
            >
              <UserPlus className="h-4 w-4" />
              Invite
            </button>
          </div>

          {showInvite && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by username..."
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-2.5 text-sm focus:border-trevio-500 focus:outline-none"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="rounded-xl border border-slate-100 divide-y divide-slate-100">
                  {searchResults.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => inviteMutation.mutate(u.username)}
                      disabled={inviteMutation.isPending}
                      className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-slate-50 disabled:opacity-50"
                    >
                      {u.photoURL ? (
                        <img src={u.photoURL} alt={u.displayName} className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-trevio-100 text-sm font-semibold text-trevio-700">
                          {u.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{u.displayName}</p>
                        <p className="text-xs text-slate-500">@{u.username}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-trevio-500" />
                    </button>
                  ))}
                </div>
              )}

              {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}

              <button onClick={() => setShowInvite(false)} className="text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
            </div>
          )}

          {members && members.length > 0 && (
            <div className="space-y-2">
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
                  {m.status === "pending" && (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
                      <Clock className="h-3 w-3" />
                      pending
                    </span>
                  )}
                  {m.role === "admin" && (
                    <span className="rounded-lg bg-trevio-50 px-2.5 py-1 text-xs font-medium text-trevio-700">admin</span>
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
