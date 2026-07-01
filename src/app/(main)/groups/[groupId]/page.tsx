"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { buildUpiVpa } from "@/lib/utils";
import { Plus, ArrowLeft, Wallet, Receipt, Check, Users, Search, UserPlus, Copy, Clock, Share2, Activity as ActivityIcon, Smartphone, Archive, ArchiveRestore } from "lucide-react";
import type { UserSearchResult, Activity } from "@/lib/types";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { expense, settlement, group, user: userService } = useServices();
  const { user: currentUser } = useAuth();
  const { formatBase, formatOriginal } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"expenses" | "balances" | "members" | "activity">("expenses");
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
    mutationFn: (debt: { fromUid: string; toUid: string; amount: number; method: "upi" | "cash" }) =>
      settlement.addSettlement({
        groupId,
        fromUid: debt.fromUid,
        toUid: debt.toUid,
        amount: debt.amount,
        currency: "INR",
        method: debt.method,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      queryClient.invalidateQueries({ queryKey: ["expenses", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["activities", groupId],
    queryFn: () => group.getGroupActivities(groupId, 50),
    enabled: tab === "activity",
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

  const archiveMutation = useMutation({
    mutationFn: (shouldArchive: boolean) =>
      shouldArchive ? group.archiveGroup(groupId) : group.unarchiveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
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

  const buildUpiLink = (upiId: string, phoneNumber: string, countryCode: string, amount: number, note: string) => {
    const vpa = buildUpiVpa(upiId, phoneNumber, countryCode);
    if (!vpa) return null;
    const params = new URLSearchParams({
      pa: vpa,
      am: amount.toFixed(2),
      tn: note,
    });
    return `upi://pay?${params.toString()}`;
  };

  const handleUpiPay = (upiId: string, phoneNumber: string, countryCode: string, amount: number, note: string) => {
    const link = buildUpiLink(upiId, phoneNumber, countryCode, amount, note);
    if (link) window.location.href = link;
  };

  const formatActivityTime = (createdAt: Activity["createdAt"]) => {
    const date = typeof createdAt === "string" ? new Date(createdAt) : new Date(createdAt._seconds * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "expense_added": return Receipt;
      case "expense_updated": return Receipt;
      case "expense_deleted": return Receipt;
      case "settlement_added": return Wallet;
      case "member_joined": return UserPlus;
      case "member_left": return Users;
      case "group_created": return ActivityIcon;
      default: return ActivityIcon;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <button onClick={() => router.push("/dashboard")} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">{groupInfo?.name || "Group"}</h1>
          {groupInfo?.archived && (
            <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">Archived</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => archiveMutation.mutate(!groupInfo?.archived)}
            disabled={archiveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {groupInfo?.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {groupInfo?.archived ? "Unarchive" : "Archive"}
          </button>
          <button
            onClick={() => router.push(`/groups/${groupId}/add-expense`)}
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {groupInfo?.description && (
        <p className="text-sm text-slate-500 mb-2">{groupInfo.description}</p>
      )}

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {groupInfo?.memberCount || 0} members
        </span>
        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
          {formatBase(groupInfo?.totalExpenses || 0)} total
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

      <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {([
          { key: "expenses", label: "Expenses", icon: Receipt },
          { key: "balances", label: "Balances", icon: Wallet },
          { key: "members", label: "Members", icon: Users },
          { key: "activity", label: "Activity", icon: ActivityIcon },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
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
            expensesData.expenses.map((e) => {
              const payer = members?.find((m) => m.uid === e.paidBy);
              const payerName = payer?.displayName?.split(" ")[0] || "Someone";
              const myShare = currentUser ? e.splits?.[currentUser.uid]?.amount : undefined;
              return (
                <div key={e.expenseId} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 md:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{e.description}</p>
                    <p className="text-xs md:text-sm text-slate-500 capitalize">
                      {payerName} paid · {e.category}
                      {myShare !== undefined && Math.abs(myShare) > 0.01 && (
                        <span className="text-slate-400"> · your share: {formatOriginal(myShare, e.currency)}</span>
                      )}
                    </p>
                  </div>
                  <p className="text-base md:text-lg font-bold text-trevio-600 shrink-0">{formatOriginal(e.amount, e.currency)}</p>
                </div>
              );
            })
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
          {(() => {
            const myBalance = members?.find((m) => m.uid === currentUser?.uid)?.balance ?? 0;
            const myDebts = debts?.filter((d) => d.fromUid === currentUser?.uid) ?? [];
            const myCredits = debts?.filter((d) => d.toUid === currentUser?.uid) ?? [];
            return (
              <div className={`rounded-2xl p-4 md:p-5 ${myBalance > 0.01 ? "bg-green-50 border border-green-200" : myBalance < -0.01 ? "bg-red-50 border border-red-200" : "bg-slate-50 border border-slate-200"}`}>
                <p className="text-sm font-medium text-slate-600">Your balance</p>
                <p className={`mt-1 text-2xl md:text-3xl font-bold ${myBalance > 0.01 ? "text-green-600" : myBalance < -0.01 ? "text-red-600" : "text-slate-500"}`}>
                  {myBalance > 0.01 ? "+" : ""}{formatBase(myBalance)}
                </p>
                <div className="mt-3 space-y-1.5">
                  {myDebts.length > 0 && (
                    <p className="text-sm text-red-600">
                      You owe {myDebts.length} {myDebts.length === 1 ? "person" : "people"} {formatBase(myDebts.reduce((s, d) => s + d.amount, 0))}
                    </p>
                  )}
                  {myCredits.length > 0 && (
                    <p className="text-sm text-green-600">
                      {myCredits.length} {myCredits.length === 1 ? "person owes" : "people owe"} you {formatBase(myCredits.reduce((s, d) => s + d.amount, 0))}
                    </p>
                  )}
                  {myDebts.length === 0 && myCredits.length === 0 && (
                    <p className="text-sm text-slate-500">All settled up in this group</p>
                  )}
                </div>
              </div>
            );
          })()}
          {debts && debts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Suggested Settlements</h3>
              {debts.map((d, i) => {
                const isCurrentUserDebtor = currentUser?.uid === d.fromUid;
                const isCurrentUserCreditor = currentUser?.uid === d.toUid;
                const paymentVpa = buildUpiVpa(d.toUpiId, d.toPhoneNumber, d.toCountryCode);
                const canPayUpi = isCurrentUserDebtor && paymentVpa;
                const fromFirstName = d.fromName.split(" ")[0] || d.fromName;
                const toFirstName = d.toName.split(" ")[0] || d.toName;
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-2xl border p-4 flex-wrap sm:flex-nowrap ${isCurrentUserDebtor ? "border-red-200 bg-red-50" : isCurrentUserCreditor ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">
                        {isCurrentUserDebtor ? (
                          <><span className="font-semibold text-red-600">You owe</span> <span className="font-medium">{toFirstName}</span></>
                        ) : isCurrentUserCreditor ? (
                          <><span className="font-medium">{fromFirstName}</span> <span className="font-semibold text-green-600">owes you</span></>
                        ) : (
                          <><span className="font-medium">{fromFirstName}</span> owes <span className="font-medium">{toFirstName}</span></>
                        )}
                      </p>
                      <p className={`text-lg font-bold ${isCurrentUserDebtor ? "text-red-600" : isCurrentUserCreditor ? "text-green-600" : "text-trevio-600"}`}>{formatBase(d.amount)}</p>
                      {paymentVpa && isCurrentUserDebtor && (
                        <p className="text-xs text-slate-400 mt-0.5">Pay to: {paymentVpa}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {canPayUpi && (
                        <button
                          onClick={() => handleUpiPay(d.toUpiId, d.toPhoneNumber, d.toCountryCode, d.amount, `Trevio: ${groupInfo?.name || "Settlement"}`)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-trevio-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trevio-700"
                        >
                          <Smartphone className="h-4 w-4" />
                          Pay via UPI
                        </button>
                      )}
                      <button
                        onClick={() => settleMutation.mutate({ ...d, method: "cash" })}
                        disabled={settleMutation.isPending}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                      >
                        Mark Settled
                      </button>
                    </div>
                  </div>
                );
              })}
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
              {members.map((m) => {
                const isMe = currentUser?.uid === m.uid;
                return (
                <Link key={m.uid} href={`/users/${m.uid}`} className={`flex items-center gap-3 rounded-2xl border p-3 md:p-4 md:gap-4 transition hover:shadow-sm ${isMe ? "border-trevio-300 bg-trevio-50" : "border-slate-200 bg-white hover:border-trevio-300"}`}>
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.displayName} className="h-8 w-8 md:h-10 md:w-10 rounded-full shrink-0" />
                  ) : (
                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-trevio-100 text-xs md:text-sm font-semibold text-trevio-700 shrink-0">
                      {m.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">
                      {m.displayName}
                      {isMe && <span className="ml-2 text-xs font-normal text-trevio-600">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-500">@{m.username}</p>
                  </div>
                  {m.status === "pending" ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600">
                      <Clock className="h-3 w-3" />
                      pending
                    </span>
                  ) : m.balance > 0.01 ? (
                    <span className="rounded-lg bg-green-50 px-3 py-1 text-sm font-semibold text-green-600">
                      {isMe ? "you'll get" : "gets"} {formatBase(m.balance)}
                    </span>
                  ) : m.balance < -0.01 ? (
                    <span className="rounded-lg bg-red-50 px-3 py-1 text-sm font-semibold text-red-500">
                      {isMe ? "you'll pay" : "owes"} {formatBase(Math.abs(m.balance))}
                    </span>
                  ) : (
                    <span className="rounded-lg bg-slate-50 px-3 py-1 text-sm font-medium text-slate-400">settled</span>
                  )}
                </Link>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "activity" && (
        <div className="space-y-3">
          {activitiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : activities && activities.length > 0 ? (
            activities.map((a) => {
              const Icon = activityIcon(a.type);
              return (
                <div key={a.activityId} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trevio-50">
                    <Icon className="h-4 w-4 text-trevio-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{a.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {a.userPhotoURL ? (
                        <img src={a.userPhotoURL} alt={a.userName} className="h-4 w-4 rounded-full" />
                      ) : null}
                      <span className="text-xs text-slate-400">{a.userName}</span>
                      <span className="text-xs text-slate-300">&middot;</span>
                      <span className="text-xs text-slate-400">{formatActivityTime(a.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <ActivityIcon className="h-12 w-12 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No activity yet.</p>
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
                <Link key={m.uid} href={`/users/${m.uid}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 md:gap-4 transition hover:border-trevio-300 hover:shadow-sm">
                  {m.photoURL ? (
                    <img src={m.photoURL} alt={m.displayName} className="h-8 w-8 md:h-10 md:w-10 rounded-full shrink-0" />
                  ) : (
                    <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-trevio-100 text-xs md:text-sm font-semibold text-trevio-700 shrink-0">
                      {m.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{m.displayName}</p>
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
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
