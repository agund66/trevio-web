"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { buildUpiVpa } from "@/lib/utils";
import { Plus, ArrowLeft, Wallet, Receipt, Check, Users, Search, UserPlus, Copy, Clock, Share2, Activity as ActivityIcon, Smartphone, Archive, ArchiveRestore, AlertCircle, QrCode, Settings, Download, Pencil, Trash2, StickyNote, Repeat, Utensils, Car, ShoppingBag, Trophy, BedDouble, Calendar, SplitSquareHorizontal, User, UserX, CloudOff, BarChart3, Plane, Home, CalendarDays, TrendingUp } from "lucide-react";
import type { UserSearchResult, Activity, Settlement, SplitType, Expense, TransactionType } from "@/lib/types";
import { GroupQrCodeDialog } from "@/components/group-qr-code-dialog";
import { AnalyticsDashboard } from "@/components/analytics-dashboard";
import { TripView } from "@/components/trip-view";
import { Avatar } from "@/components/avatar";
import { LoadMoreButton } from "@/components/load-more-button";
import { usePaginatedQuery } from "@/lib/hooks/use-paginated-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/app";
import { computeGamification } from "@/lib/utils/household-analytics";
import { formatRelativeTime, formatShortDate } from "@/lib/utils/date";
import { DailyTab, MonthlyReportTab, EditEntrySheet, EntryDetailSheet } from "@/components/household";
import { BASE_CURRENCY } from "@/lib/constants/currency";
import { convertCurrency } from "@/lib/utils/currency";

const categoryConfig: Record<string, { icon: typeof Receipt; color: string; bg: string }> = {
  food: { icon: Utensils, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20" },
  transport: { icon: Car, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20" },
  shopping: { icon: ShoppingBag, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20" },
  turf: { icon: Trophy, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
  accommodation: { icon: BedDouble, color: "text-trevio-600 dark:text-trevio-400", bg: "bg-trevio-50 dark:bg-trevio-900/20" },
  other: { icon: Receipt, color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-100 dark:bg-slate-700/40" },
};

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { expense, settlement, group, user: userService } = useServices();
  const { user: currentUser } = useAuth();
  const { formatBase, formatOriginal, formatDate: formatDateFn, userCurrency, rates, convertToUserCurrency, convertBase, isLoading: ratesLoading } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const t = useTranslations("groups");
  const tc = useTranslations("categories");
  const tcommon = useTranslations("common");
  const splitTypeLabels: Record<SplitType, string> = {
    equal: t('details.equal'),
    exact: t('details.exact'),
    percent: t('details.percent'),
    shares: t('details.shares'),
    itemized: t('details.items'),
  };
  const [tab, setTab] = useState<"expenses" | "balances" | "analytics" | "trip" | "members" | "activity" | "today" | "monthly">("expenses");
  const [activityFilter, setActivityFilter] = useState<"all" | "settlements">("all");
  const [showInvite, setShowInvite] = useState(false);
  const [showAddOffline, setShowAddOffline] = useState(false);
  const [offlineName, setOfflineName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<string>("all");
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<number>(Date.now());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [householdQuickSaving, setHouseholdQuickSaving] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Expense | null>(null);
  const [viewingEntry, setViewingEntry] = useState<Expense | null>(null);
  const [removingMember, setRemovingMember] = useState<{ uid: string; name: string } | null>(null);

  const { data: groupInfo, isLoading: groupInfoLoading, error: groupInfoError } = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: () => group.getGroupInfo(groupId),
  });

  const isHousehold = groupInfo?.template === "household";

  // Switch to "today" tab when a household group loads
  const initialTabSwitchDone = useRef(false);
  useEffect(() => {
    // Reset ref when groupId changes (navigating to a different group)
    initialTabSwitchDone.current = false;
  }, [groupId]);
  useEffect(() => {
    if (isHousehold && !initialTabSwitchDone.current && tab === "expenses") {
      setTab("today");
      initialTabSwitchDone.current = true;
    }
  }, [isHousehold, tab]);

  const expensesPagination = usePaginatedQuery({
    queryKey: ["expenses", groupId],
    queryFn: (pageSize, lastId) => expense.getGroupExpenses(groupId, pageSize, lastId),
    pageSize: DEFAULT_PAGE_SIZE,
    extractItems: (r) => r.expenses,
    extractHasMore: (r) => r.hasMore,
    extractLastId: (r) => r.lastExpenseId,
  });
  const expensesData = { expenses: expensesPagination.items };
  const expensesLoading = expensesPagination.isLoading;

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
        currency: BASE_CURRENCY,
        method: debt.method,
      }),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      expensesPagination.refresh();
      activitiesPagination.refresh();
      settlementsPagination.refresh();
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const activitiesPagination = usePaginatedQuery({
    queryKey: ["activities", groupId],
    queryFn: (pageSize, lastId) => group.getGroupActivities(groupId, pageSize, lastId),
    pageSize: DEFAULT_PAGE_SIZE,
    enabled: tab === "activity",
    extractItems: (r) => r.activities,
    extractHasMore: (r) => r.hasMore,
    extractLastId: (r) => r.lastActivityId,
  });
  const activities = activitiesPagination.items;
  const activitiesLoading = activitiesPagination.isLoading;

  const settlementsPagination = usePaginatedQuery({
    queryKey: ["settlementHistory", groupId],
    queryFn: (pageSize, lastId) => settlement.getSettlementHistory(groupId, pageSize, lastId),
    pageSize: DEFAULT_PAGE_SIZE,
    enabled: tab === "activity" && activityFilter === "settlements",
    extractItems: (r) => r.settlements,
    extractHasMore: (r) => r.hasMore,
    extractLastId: (r) => r.lastSettlementId,
  });
  const settlementHistory = settlementsPagination.items;
  const historyLoading = settlementsPagination.isLoading;

  const inviteMutation = useMutation({
    mutationFn: (username: string) => group.sendGroupInvitation(groupId, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      activitiesPagination.refresh();
      setSearchQuery("");
      setSearchResults([]);
      setInviteError(null);
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const addOfflineMutation = useMutation({
    mutationFn: (name: string) => group.addOfflineMember(groupId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      activitiesPagination.refresh();
      setShowAddOffline(false);
      setOfflineName("");
      setInviteError(null);
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (shouldArchive: boolean) =>
      shouldArchive ? group.archiveGroup(groupId) : group.unarchiveGroup(groupId),
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: string) => expense.deleteExpense(groupId, expenseId),
    onSuccess: () => {
      setActionError(null);
      setDeleteExpenseId(null);
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["debts", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      expensesPagination.refresh();
      activitiesPagination.refresh();
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const removeMemberMutation = useMutation({
    mutationFn: (memberUid: string) => group.removeMember(groupId, memberUid),
    onSuccess: () => {
      setRemovingMember(null);
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      activitiesPagination.softRefresh();
    },
    onError: (e: Error) => setActionError(e.message),
  });

  const allExpenses = useMemo(() => expensesData?.expenses ?? [], [expensesData?.expenses]);
  const householdMembers = useMemo(() => members ?? [], [members]);

  // Convert all household expenses to the viewer's currency for display & calculation.
  // Preserve the original amount and currency so edits can save back in the
  // original currency instead of overwriting with the display currency.
  // When rates aren't loaded yet, fall back to base currency (INR) — the amounts
  // are still in base currency, so showing the base symbol is correct.
  const displayCurrency = rates ? userCurrency : BASE_CURRENCY;
  const convertedExpenses = useMemo(
    () => rates
      ? allExpenses.map((e) => ({
          ...e,
          amount: convertToUserCurrency(e.amount, e.currency || BASE_CURRENCY),
          originalAmount: e.amount,
          originalCurrency: e.currency || BASE_CURRENCY,
        }))
      : allExpenses,
    [allExpenses, convertToUserCurrency, rates]
  );

  // Budget is stored in INR (base) on the group; convert to user's currency for display.
  // When rates aren't loaded, keep as raw INR.
  const budgetInUserCurrency = groupInfo?.monthlyBudget != null
    ? (rates ? convertBase(groupInfo.monthlyBudget) : groupInfo.monthlyBudget)
    : undefined;

  const monthlySpent = useMemo(() => {
    if (!convertedExpenses || convertedExpenses.length === 0) return 0;
    return convertedExpenses
      .filter((e) => {
        if (!e.date) return false;
        const d = new Date(e.date);
        return (
          d.getFullYear() === selectedYear &&
          d.getMonth() === selectedMonth &&
          (e.transactionType ?? "expense") === "expense"
        );
      })
      .reduce((sum, e) => sum + e.amount, 0);
  }, [convertedExpenses, selectedYear, selectedMonth]);

  const gamification = useMemo(
    () => computeGamification(convertedExpenses, householdMembers, budgetInUserCurrency, monthlySpent, displayCurrency),
    [convertedExpenses, householdMembers, budgetInUserCurrency, monthlySpent, displayCurrency]
  );

  const isAdmin = currentUser?.uid === groupInfo?.createdBy ||
    members?.find((m) => m.uid === currentUser?.uid)?.role === "admin";

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
      navigator.clipboard?.writeText(groupInfo.inviteCode).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  const shareInviteLink = async () => {
    if (!groupInfo?.inviteCode) return;
    const url = `${window.location.origin}/join/${groupInfo.inviteCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('details.shareTitle', { name: groupInfo.name }),
          text: t('details.shareText', { name: groupInfo.name }),
          url,
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(url).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }).catch(() => {});
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

  const formatActivityTime = (createdAt: number) => formatRelativeTime(createdAt, displayCurrency);

  const filteredExpenses = useMemo(() => {
    if (allExpenses.length === 0) return [];
    return allExpenses.filter((e) => {
      const matchesSearch = !expenseSearch || e.description.toLowerCase().includes(expenseSearch.toLowerCase());
      const matchesCategory = expenseCategoryFilter === "all" || e.category === expenseCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [allExpenses, expenseSearch, expenseCategoryFilter]);

  const exportCsv = () => {
    if (!expensesData?.expenses) return;
    const header = "Date,Description,Amount,Currency,Category,Paid By,Split Type,Note\n";
    const rows = expensesData.expenses.map((e) => {
      const payer = members?.find((m) => m.uid === e.paidBy)?.displayName || t('details.unknown');
      const date = e.date ? formatShortDate(e.date) : "";
      const desc = `"${e.description.replace(/"/g, '\\"')}"`;
      const note = e.note ? `"${e.note.replace(/"/g, '\\"')}"` : "";
      return `${date},${desc},${e.amount},${e.currency},${e.category},${payer},${e.splitType},${note}`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${groupInfo?.name || "group"}-expenses.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activityIcon = (type: string) => {
    switch (type) {
      case "expense_added": return Receipt;
      case "expense_updated": return Receipt;
      case "expense_deleted": return Receipt;
      case "income_added": return TrendingUp;
      case "income_updated": return TrendingUp;
      case "income_deleted": return TrendingUp;
      case "settlement_added": return Wallet;
      case "member_joined": return UserPlus;
      case "member_left": return Users;
      case "member_removed": return UserX;
      case "group_created": return ActivityIcon;
      default: return ActivityIcon;
    }
  };

  return (
    <div className="p-4 md:p-6">
      <button onClick={() => router.push("/dashboard")} className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" />
        {tcommon('actions.back')}
      </button>

      {groupInfoLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 dark:border-slate-700 border-t-trevio-600" />
        </div>
      ) : groupInfoError ? (
        <div className="flex min-h-[50vh] items-center justify-center text-center">
          <div className="max-w-md">
            <AlertCircle className="mx-auto h-10 w-10 text-red-400" />
            <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{t('details.failedToLoadGroup')}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{groupInfoError.message}</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] })}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
            >
              {tcommon('actions.retry')}
            </button>
          </div>
        </div>
      ) : (
        <>
        {actionError && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300">
              <AlertCircle className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">{groupInfo?.name || t('details.defaultGroupName')}</h1>
          {groupInfo?.archived && (
            <span className="rounded-lg bg-slate-200 dark:bg-slate-700 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">{t('details.archived')}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => router.push(`/groups/${groupId}/settings`)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t('details.settings')}</span>
              </button>
              <button
                onClick={() => archiveMutation.mutate(!groupInfo?.archived)}
                disabled={archiveMutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {groupInfo?.archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {groupInfo?.archived ? t('details.unarchive') : t('details.archive')}
              </button>
            </>
          )}
          <button
            onClick={() => router.push(`/groups/${groupId}/add-expense`)}
            disabled={groupInfo?.archived}
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={groupInfo?.archived ? t('details.unarchiveToAddExpenses') : ""}
          >
            <Plus className="h-4 w-4" />
            {isHousehold ? t('details.addEntry') : t('details.addExpense')}
          </button>
        </div>
      </div>

      {groupInfo?.description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{groupInfo.description}</p>
      )}

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('details.membersCount', { count: groupInfo?.memberCount || 0 })}
        </span>
        <span className="rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          {formatBase(groupInfo?.totalExpenses || 0)} {t('details.total')}
        </span>
        {groupInfo?.inviteCode && (
          <>
            <button
              onClick={() => setShowQrDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <QrCode className="h-3 w-3" />
              {t('details.qrCode')}
            </button>
            <button
              onClick={copyInviteCode}
              className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-50 dark:bg-trevio-900/30 px-2.5 py-1 text-xs font-medium text-trevio-700 dark:text-trevio-300 transition hover:bg-trevio-100 dark:hover:bg-trevio-900/50"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? t('details.copied') : t('details.inviteCodeLabel', { code: groupInfo.inviteCode })}
            </button>
            <button
              onClick={shareInviteLink}
              className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-trevio-700"
            >
              <Share2 className="h-3 w-3" />
              {shared ? t('details.linkCopied') : t('details.shareInvite')}
            </button>
          </>
        )}
      </div>

      <div className="flex gap-2 mb-6 border-b border-slate-200 dark:border-slate-700 overflow-x-auto scrollbar-hide">
        {(isHousehold
          ? [
              { key: "today" as const, label: t('details.tabToday'), icon: Home },
              { key: "monthly" as const, label: t('details.tabMonthly'), icon: CalendarDays },
              { key: "analytics" as const, label: t('details.tabInsights'), icon: BarChart3 },
              { key: "members" as const, label: t('details.members'), icon: Users },
              { key: "activity" as const, label: t('details.tabActivity'), icon: ActivityIcon },
            ]
          : [
              { key: "expenses" as const, label: t('details.expenses'), icon: Receipt },
              { key: "balances" as const, label: t('details.balances'), icon: Wallet },
              { key: "analytics" as const, label: t('details.tabInsights'), icon: BarChart3 },
              ...(groupInfo?.template === "trip" ? [{ key: "trip" as const, label: t('details.tabTrip'), icon: Plane }] : []),
              { key: "members" as const, label: t('details.members'), icon: Users },
              { key: "activity" as const, label: t('details.tabActivity'), icon: ActivityIcon },
            ]
        ).map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === tabItem.key ? "border-trevio-600 text-trevio-600 dark:text-trevio-400" : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            <tabItem.icon className="h-4 w-4" />
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === "today" && isHousehold && (
        <DailyTab
          expenses={convertedExpenses}
          members={householdMembers}
          selectedDate={selectedDate}
          monthlyBudget={budgetInUserCurrency}
          userCurrency={displayCurrency}
          onPreviousDay={() => {
            const prev = new Date(selectedDate);
            prev.setDate(prev.getDate() - 1);
            setSelectedDate(prev.getTime());
            setViewingEntry(null);
            setEditingEntry(null);
          }}
          onNextDay={() => {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() + 1);
            setSelectedDate(next.getTime());
            setViewingEntry(null);
            setEditingEntry(null);
          }}
          onGoToToday={() => {
            setSelectedDate(Date.now());
            setViewingEntry(null);
            setEditingEntry(null);
          }}
          onViewEntry={(entry) => setViewingEntry(entry)}
          onEditEntry={(entry) => setEditingEntry(entry)}
          onDeleteEntry={(expenseId) => deleteExpenseMutation.mutate(expenseId)}
          isSaving={householdQuickSaving}
        />
      )}

      {tab === "monthly" && isHousehold && (
        <MonthlyReportTab
          expenses={convertedExpenses}
          members={householdMembers}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          monthlyBudget={budgetInUserCurrency}
          userCurrency={displayCurrency}
          gamificationInsight={gamification?.insightMessage}
          onPreviousMonth={() => {
            const prev = new Date(selectedYear, selectedMonth, 1);
            prev.setMonth(prev.getMonth() - 1);
            setSelectedYear(prev.getFullYear());
            setSelectedMonth(prev.getMonth());
          }}
          onNextMonth={() => {
            const next = new Date(selectedYear, selectedMonth, 1);
            next.setMonth(next.getMonth() + 1);
            setSelectedYear(next.getFullYear());
            setSelectedMonth(next.getMonth());
          }}
        />
      )}

      {editingEntry && (
        <EditEntrySheet
          entry={editingEntry}
          members={householdMembers}
          isSaving={householdQuickSaving}
          userCurrency={displayCurrency}
          onUpdate={(expenseId: string, amount: number, description: string, category: string, paidBy: string, date: number, note: string, transactionType: TransactionType) => {
            setHouseholdQuickSaving(true);
            // Use the original expense's currency, not the display currency.
            // Convert the edited display amount back to the original currency
            // so we don't overwrite the stored currency or corrupt the base amount.
            const origCurrency = editingEntry.originalCurrency || editingEntry.currency || BASE_CURRENCY;
            const amountToSave = rates && displayCurrency !== origCurrency
              ? convertCurrency(amount, displayCurrency, origCurrency, rates)
              : amount;
            expense.updateExpense({
              groupId, expenseId, description, amount: amountToSave,
              currency: origCurrency,
              paidBy, splitType: "equal", splits: {},
              memberUids: members?.filter((m) => m.status === "active").map((m) => m.uid) ?? [],
              category, note, transactionType,
            }).then(() => {
              setHouseholdQuickSaving(false);
              setEditingEntry(null);
              expensesPagination.softRefresh();
              queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
              queryClient.invalidateQueries({ queryKey: ["groups"] });
            }).catch((e) => {
              setHouseholdQuickSaving(false);
              setActionError(e.message);
            });
          }}
          onDelete={(expenseId: string) => {
            setHouseholdQuickSaving(true);
            expense.deleteExpense(groupId, expenseId).then(() => {
              setHouseholdQuickSaving(false);
              setEditingEntry(null);
              expensesPagination.softRefresh();
              queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
              queryClient.invalidateQueries({ queryKey: ["groups"] });
            }).catch((e) => {
              setHouseholdQuickSaving(false);
              setActionError(e.message);
            });
          }}
          onClose={() => setEditingEntry(null)}
        />
      )}

      {viewingEntry && (
        <EntryDetailSheet
          entry={viewingEntry}
          members={householdMembers}
          userCurrency={displayCurrency}
          onEdit={() => {
            const entry = viewingEntry;
            setViewingEntry(null);
            setEditingEntry(entry);
          }}
          onDelete={() => {
            const expenseId = viewingEntry.expenseId;
            setViewingEntry(null);
            deleteExpenseMutation.mutate(expenseId);
          }}
          onClose={() => setViewingEntry(null)}
        />
      )}

      {tab === "expenses" && (
        <div className="space-y-3">
          {expensesData?.expenses && expensesData.expenses.length > 0 && (
            <>
              <div className="flex items-center justify-between rounded-xl bg-slate-100 dark:bg-slate-800/60 px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {t('details.expenseCount', { count: filteredExpenses.length })}
                  </span>
                </div>
                <span className="text-sm font-bold text-trevio-600 dark:text-trevio-400">
                  {formatBase(filteredExpenses.reduce((sum, e) => sum + (e.exchangeRateToBase ? e.amount * e.exchangeRateToBase : e.amount), 0))}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={expenseSearch}
                    onChange={(e) => setExpenseSearch(e.target.value)}
                    placeholder={t('details.searchExpensesPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
                  />
                </div>
                <select
                  value={expenseCategoryFilter}
                  onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
                >
                  <option value="all">{t('details.allCategories')}</option>
                  <option value="food">{tc('food')}</option>
                  <option value="transport">{tc('transport')}</option>
                  <option value="shopping">{tc('shopping')}</option>
                  <option value="turf">{tc('turf')}</option>
                  <option value="accommodation">{tc('accommodation')}</option>
                  <option value="other">{tc('other')}</option>
                </select>
                <button
                  onClick={exportCsv}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  title={t('details.exportCsv')}
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('details.export')}</span>
                </button>
              </div>
            </>
          )}
          {expensesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
            </div>
          ) : filteredExpenses.length > 0 ? (
            filteredExpenses.map((e) => {
              const payer = members?.find((m) => m.uid === e.paidBy);
              const payerName = payer?.displayName?.split(" ")[0] || t('details.someone');
              const isPayerMe = currentUser?.uid === e.paidBy;
              const myShare = currentUser ? e.splits?.[currentUser.uid]?.amount : undefined;
              const canEdit = e.createdBy === currentUser?.uid || members?.find((m) => m.uid === currentUser?.uid)?.role === "admin";
              const cat = categoryConfig[e.category] || categoryConfig.other;
              const CatIcon = cat.icon;
              const hasMyShare = myShare !== undefined && Math.abs(myShare) > 0.01;
              const youLent = isPayerMe && hasMyShare && Math.abs(myShare) < e.amount;
              const youOwe = !isPayerMe && hasMyShare;
              return (
                <div key={e.expenseId} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 md:p-4 md:gap-4 group">
                  <div className={`flex h-10 w-10 md:h-11 md:w-11 shrink-0 items-center justify-center rounded-xl ${cat.bg}`}>
                    <CatIcon className={`h-5 w-5 ${cat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 truncate">{e.description}</p>
                      {e.recurring && (
                        <Repeat className="h-3 w-3 text-trevio-500 shrink-0" />
                      )}
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 capitalize">
                        <SplitSquareHorizontal className="h-2.5 w-2.5" />
                        {splitTypeLabels[e.splitType] || e.splitType}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Avatar photoURL={payer?.photoURL} displayName={payerName} className="h-4 w-4" textClassName="text-[8px]" />
                      <span className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                        {isPayerMe ? t('details.you') : payerName} {t('details.paid')}
                      </span>
                      {e.date ? (
                        <>
                          <span className="text-xs text-slate-300 dark:text-slate-600">&middot;</span>
                          <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-0.5">
                            <Calendar className="h-3 w-3" />
                            {formatDateFn(e.date)}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {hasMyShare && (
                      <div className={`mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold ${
                        youOwe
                          ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400"
                          : youLent
                            ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                            : "bg-slate-100 dark:bg-slate-700/40 text-slate-500 dark:text-slate-400"
                      }`}>
                        {youOwe
                          ? t('details.youOweAmount', { amount: formatOriginal(myShare!, e.currency) })
                          : youLent
                            ? t('details.youLentAmount', { amount: formatOriginal(e.amount - Math.abs(myShare!), e.currency) })
                            : t('details.yourShare', { amount: formatOriginal(myShare!, e.currency) })}
                      </div>
                    )}
                    {e.note && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-1">
                        <StickyNote className="h-3 w-3" />
                        {e.note}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <p className="text-base md:text-lg font-bold text-trevio-600 dark:text-trevio-400">{formatOriginal(e.amount, e.currency)}</p>
                    {canEdit && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => router.push(`/groups/${groupId}/edit-expense/${e.expenseId}`)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-trevio-600 hover:bg-trevio-50 dark:hover:bg-trevio-900/30 transition"
                          title={t('details.editExpense')}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteExpenseId(e.expenseId)}
                          className="rounded-lg p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                          title={t('details.deleteExpense')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : expensesData ? (
            expenseSearch || expenseCategoryFilter !== "all" ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Search className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('details.noExpensesMatchFilters')}</p>
                <button
                  onClick={() => { setExpenseSearch(""); setExpenseCategoryFilter("all"); }}
                  className="mt-3 text-sm text-trevio-600 dark:text-trevio-400 hover:underline"
                >
                  {t('details.clearFilters')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('details.noExpensesYet')}</p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('details.failedToLoadExpenses')}</p>
              <button
                onClick={() => expensesPagination.refresh()}
                className="mt-4 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
              >
                {tcommon('actions.retry')}
              </button>
            </div>
          )}
          {expensesPagination.hasMore && !expenseSearch && expenseCategoryFilter === "all" && (
            <LoadMoreButton
              onClick={expensesPagination.loadMore}
              loading={expensesPagination.loadingMore}
              hasMore={expensesPagination.hasMore}
            />
          )}
          {deleteExpenseId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('details.deleteExpenseConfirm')}</h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('details.deleteCannotUndo')}</p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => deleteExpenseMutation.mutate(deleteExpenseId)}
                    disabled={deleteExpenseMutation.isPending}
                    className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleteExpenseMutation.isPending ? tcommon('actions.deleting') : tcommon('actions.delete')}
                  </button>
                  <button
                    onClick={() => setDeleteExpenseId(null)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {tcommon('actions.cancel')}
                  </button>
                </div>
              </div>
            </div>
          )}
          {removingMember && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={() => setRemovingMember(null)}>
              <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-800 p-6" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('details.removeMemberTitle')}</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  {t('details.removeMemberConfirm', { name: removingMember.name })}
                </p>
                {removeMemberMutation.isError && (
                  <p className="mt-2 text-sm text-red-500 dark:text-red-400">{removeMemberMutation.error instanceof Error ? removeMemberMutation.error.message : t('details.failedToRemoveMember')}</p>
                )}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => setRemovingMember(null)}
                    className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {tcommon('actions.cancel')}
                  </button>
                  <button
                    onClick={() => removeMemberMutation.mutate(removingMember.uid)}
                    disabled={removeMemberMutation.isPending}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    {removeMemberMutation.isPending ? t('details.removing') : t('details.remove')}
                  </button>
                </div>
              </div>
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
              <div className={`rounded-2xl p-4 md:p-5 ${myBalance > 0.01 ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" : myBalance < -0.01 ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" : "bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"}`}>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('details.yourBalance')}</p>
                <p className={`mt-1 text-2xl md:text-3xl font-bold ${myBalance > 0.01 ? "text-green-600 dark:text-green-400" : myBalance < -0.01 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"}`}>
                  {myBalance > 0.01 ? "+" : ""}{formatBase(myBalance)}
                </p>
                <div className="mt-3 space-y-1.5">
                  {myDebts.length > 0 && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {t('details.youOwe')} {t('details.personCount', { count: myDebts.length })} {formatBase(myDebts.reduce((s, d) => s + d.amount, 0))}
                    </p>
                  )}
                  {myCredits.length > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400">
                      {t('details.personOwesCount', { count: myCredits.length })} {t('details.you')} {formatBase(myCredits.reduce((s, d) => s + d.amount, 0))}
                    </p>
                  )}
                  {myDebts.length === 0 && myCredits.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('details.allSettledUp')}</p>
                  )}
                </div>
              </div>
            );
          })()}
          {debts && debts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('details.suggestedSettlements')}</h3>
              {debts.map((d, i) => {
                const isCurrentUserDebtor = currentUser?.uid === d.fromUid;
                const isCurrentUserCreditor = currentUser?.uid === d.toUid;
                const paymentVpa = buildUpiVpa(d.toUpiId, d.toPhoneNumber, d.toCountryCode);
                const canPayUpi = isCurrentUserDebtor && paymentVpa;
                const fromFirstName = d.fromName.split(" ")[0] || d.fromName;
                const toFirstName = d.toName.split(" ")[0] || d.toName;
                return (
                  <div key={`${d.fromUid}-${d.toUid}`} className={`flex items-center gap-3 rounded-2xl border p-4 flex-wrap sm:flex-nowrap ${isCurrentUserDebtor ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20" : isCurrentUserCreditor ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 dark:text-slate-100">
                        {isCurrentUserDebtor ? (
                          <><span className="font-semibold text-red-600 dark:text-red-400">{t('details.youOwe')}</span> <span className="font-medium">{toFirstName}</span></>
                        ) : isCurrentUserCreditor ? (
                          <><span className="font-medium">{fromFirstName}</span> <span className="font-semibold text-green-600 dark:text-green-400">{t('details.owesYou')}</span></>
                        ) : (
                          <><span className="font-medium">{fromFirstName}</span> {t('details.owesYou')} <span className="font-medium">{toFirstName}</span></>
                        )}
                      </p>
                      <p className={`text-lg font-bold ${isCurrentUserDebtor ? "text-red-600 dark:text-red-400" : isCurrentUserCreditor ? "text-green-600 dark:text-green-400" : "text-trevio-600 dark:text-trevio-400"}`}>{formatBase(d.amount)}</p>
                      {paymentVpa && isCurrentUserDebtor && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{t('details.payTo', { vpa: paymentVpa })}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {canPayUpi && (
                        <button
                          onClick={() => handleUpiPay(d.toUpiId, d.toPhoneNumber, d.toCountryCode, d.amount, t('details.upiPaymentNote', { name: groupInfo?.name || t('details.settlement') }))}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-trevio-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trevio-700"
                        >
                          <Smartphone className="h-4 w-4" />
                          Pay via UPI
                        </button>
                      )}
                      <button
                        onClick={() => settleMutation.mutate({ ...d, method: "cash" })}
                        disabled={settleMutation.isPending}
                        className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        {t('details.markSettled')}
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
              <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">{t('details.allSettledUpShort')}</p>
            </div>
          )}

          {members && members.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('details.memberBalances')}</h3>
              {members.map((m) => {
                const isMe = currentUser?.uid === m.uid;
                return (
                <Link key={m.uid} href={`/users/${m.uid}`} className={`flex items-center gap-3 rounded-2xl border p-3 md:p-4 md:gap-4 transition hover:shadow-sm ${isMe ? "border-trevio-300 dark:border-trevio-700 bg-trevio-50 dark:bg-trevio-900/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-trevio-300 dark:hover:border-trevio-700"}`}>
                  <Avatar photoURL={m.photoURL} displayName={m.displayName} className="h-8 w-8 md:h-10 md:w-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                      {m.displayName}
                      {isMe && <span className="ml-2 text-xs font-normal text-trevio-600 dark:text-trevio-400">{tcommon('youLabel')}</span>}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">@{m.username}</p>
                  </div>
                  {m.status === "pending" ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                      <Clock className="h-3 w-3" />
                      {t('details.statusPending')}
                    </span>
                  ) : !isHousehold && (
                    m.balance > 0.01 ? (
                      <span className="rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-1 text-sm font-semibold text-green-600 dark:text-green-400">
                        {isMe ? "you'll get" : "gets"} {formatBase(m.balance)}
                      </span>
                    ) : m.balance < -0.01 ? (
                      <span className="rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-1 text-sm font-semibold text-red-500 dark:text-red-400">
                        {isMe ? "you'll pay" : "owes"} {formatBase(Math.abs(m.balance))}
                      </span>
                    ) : (
                      <span className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-1 text-sm font-medium text-slate-400 dark:text-slate-500">{t('details.statusSettled')}</span>
                    )
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
          {/* Filter toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setActivityFilter("all")}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                activityFilter === "all"
                  ? "bg-trevio-600 text-white"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {t('details.filterAll')}
            </button>
            {!isHousehold && (
              <button
                onClick={() => setActivityFilter("settlements")}
                className={`rounded-xl px-3 py-1.5 text-sm font-medium transition ${
                  activityFilter === "settlements"
                    ? "bg-trevio-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t('details.settlements')}
              </button>
            )}
          </div>

          {activityFilter === "settlements" ? (
            <>
            {historyLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : settlementHistory && settlementHistory.length > 0 ? (
              settlementHistory.map((s) => {
                const isFromMe = currentUser?.uid === s.fromUid;
                const isToMe = currentUser?.uid === s.toUid;
                const fromFirstName = s.fromName.split(" ")[0] || s.fromName;
                const toFirstName = s.toName.split(" ")[0] || s.toName;
                return (
                  <div key={s.settlementId} className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-50 dark:bg-green-900/30">
                      <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {isFromMe ? t('details.youPaidName', { name: toFirstName }) : isToMe ? t('details.namePaidYou', { name: fromFirstName }) : t('details.namePaidName', { name1: fromFirstName, name2: toFirstName })}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {s.date ? formatDateFn(s.date) : ""} · {s.method}
                        {s.upiRefId && ` · Ref: ${s.upiRefId}`}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 shrink-0">{formatBase(s.amount)}</p>
                  </div>
                );
              })
            ) : settlementHistory ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Wallet className="h-12 w-12 text-slate-300 dark:text-slate-600" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('details.noSettlementsYet')}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center py-16 text-center">
                <AlertCircle className="h-10 w-10 text-red-400" />
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('details.failedToLoadSettlements')}</p>
              </div>
            )}
            <LoadMoreButton
              onClick={settlementsPagination.loadMore}
              loading={settlementsPagination.loadingMore}
              hasMore={settlementsPagination.hasMore}
            />
            </>
          ) : (
            <>
            {activitiesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : activities && activities.length > 0 ? (
            activities.map((a) => {
              const Icon = activityIcon(a.type);
              return (
                <div key={a.activityId} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-trevio-50 dark:bg-trevio-900/30">
                    <Icon className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900 dark:text-slate-100">{a.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {a.userPhotoURL && (
                        <img src={a.userPhotoURL} alt={a.userName} className="h-4 w-4 rounded-full" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      )}
                      <span className="text-xs text-slate-400 dark:text-slate-500">{a.userName}{a.userId === currentUser?.uid && ` ${tcommon('youLabel')}`}</span>
                      <span className="text-xs text-slate-300 dark:text-slate-600">&middot;</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{formatActivityTime(a.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : activities ? (
            <div className="flex flex-col items-center py-16 text-center">
              <ActivityIcon className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('details.noActivityYet')}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('details.failedToLoadActivity')}</p>
              <button
                onClick={() => activitiesPagination.refresh()}
                className="mt-4 rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700"
              >
                {tcommon('actions.retry')}
              </button>
            </div>
          )}
          <LoadMoreButton
            onClick={activitiesPagination.loadMore}
            loading={activitiesPagination.loadingMore}
            hasMore={activitiesPagination.hasMore}
          />
          </>
          )}
        </div>
      )}

      {tab === "analytics" && (
        <div>
          {convertedExpenses && convertedExpenses.length > 0 && members && members.length > 0 ? (
            <AnalyticsDashboard
              groupId={groupId}
              groupName={groupInfo?.name || t('details.defaultGroupName')}
              expenses={convertedExpenses}
              members={members}
            />
          ) : (
            <div className="flex flex-col items-center py-16 text-center">
              <BarChart3 className="h-12 w-12 text-slate-300 dark:text-slate-600" />
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {expensesLoading ? t('details.analyticsLoading') : t('details.analyticsNoData')}
              </p>
            </div>
          )}
        </div>
      )}

      {tab === "trip" && groupInfo?.template === "trip" && (
        <TripView groupId={groupId} members={members || []} />
      )}

      {tab === "members" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t('details.membersCount', { count: members?.length || 0 })}</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowAddOffline(!showAddOffline); setShowInvite(false); }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <User className="h-4 w-4" />
                Add
              </button>
              <button
                onClick={() => { setShowInvite(!showInvite); setShowAddOffline(false); }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-trevio-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700"
              >
                <UserPlus className="h-4 w-4" />
                Invite
              </button>
            </div>
          </div>

          {showAddOffline && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-400">{t('details.addOfflineDesc')}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={offlineName}
                    onChange={(e) => setOfflineName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && offlineName.trim() && addOfflineMutation.mutate(offlineName.trim())}
                    placeholder={t('details.enterNamePlaceholder')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => offlineName.trim() && addOfflineMutation.mutate(offlineName.trim())}
                  disabled={!offlineName.trim() || addOfflineMutation.isPending}
                  className="rounded-xl bg-trevio-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addOfflineMutation.isPending ? t('details.adding') : t('details.add')}
                </button>
              </div>
              {inviteError && <p className="text-sm text-red-500 dark:text-red-400">{inviteError}</p>}
              <button onClick={() => { setShowAddOffline(false); setInviteError(null); }} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                {tcommon('actions.cancel')}
              </button>
            </div>
          )}

          {showInvite && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t('details.searchByUsernamePlaceholder')}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
                />
              </div>

              {searchResults.length > 0 && (
                <div className="rounded-xl border border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                  {searchResults.map((u) => (
                    <button
                      key={u.uid}
                      onClick={() => inviteMutation.mutate(u.username)}
                      disabled={inviteMutation.isPending}
                      className="flex w-full items-center gap-3 p-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 disabled:opacity-50"
                    >
                      <Avatar photoURL={u.photoURL} displayName={u.displayName} className="h-8 w-8" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.displayName}{u.uid === currentUser?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">{tcommon('youLabel')}</span>}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-trevio-500" />
                    </button>
                  ))}
                </div>
              )}

              {inviteError && <p className="text-sm text-red-500 dark:text-red-400">{inviteError}</p>}

              <button onClick={() => setShowInvite(false)} className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                {tcommon('actions.cancel')}
              </button>
            </div>
          )}

          {members && members.length > 0 && (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.uid} className={m.isOffline ? "flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 md:p-4 md:gap-4" : undefined}>
                  {m.isOffline ? (
                    <>
                      <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700 text-xs md:text-sm font-semibold text-slate-500 dark:text-slate-400 shrink-0">
                        {m.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{m.displayName}{currentUser?.uid === m.uid && <span className="ml-2 text-xs font-normal text-trevio-600 dark:text-trevio-400">{tcommon('youLabel')}</span>}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('details.offlineMember')}</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-700/50 px-3 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        <CloudOff className="h-3 w-3" />
                        {t('details.offline')}
                      </span>
                      {isHousehold ? (
                        <span className="rounded-lg bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t('details.member')}</span>
                      ) : (
                        m.role === "admin" && (
                          <span className="rounded-lg bg-trevio-50 dark:bg-trevio-900/30 px-2.5 py-1 text-xs font-medium text-trevio-700 dark:text-trevio-300">{t('details.admin')}</span>
                        )
                      )}
                    </>
                  ) : (
                    <Link href={`/users/${m.uid}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 md:p-4 md:gap-4 transition hover:border-trevio-300 dark:hover:border-trevio-700 hover:shadow-sm">
                      <Avatar photoURL={m.photoURL} displayName={m.displayName} className="h-8 w-8 md:h-10 md:w-10" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{m.displayName}{currentUser?.uid === m.uid && <span className="ml-2 text-xs font-normal text-trevio-600 dark:text-trevio-400">{tcommon('youLabel')}</span>}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">@{m.username}</p>
                      </div>
                      {isHousehold ? (
                        <span className="rounded-lg bg-slate-100 dark:bg-slate-700/50 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400">{t('details.member')}</span>
                      ) : (
                        <>
                          {m.status === "pending" && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                              <Clock className="h-3 w-3" />
                              {t('details.statusPending')}
                            </span>
                          )}
                          {m.role === "admin" && (
                            <span className="rounded-lg bg-trevio-50 dark:bg-trevio-900/30 px-2.5 py-1 text-xs font-medium text-trevio-700 dark:text-trevio-300">{t('details.admin')}</span>
                          )}
                        </>
                      )}
                      {isAdmin && m.uid !== currentUser?.uid && m.role !== "admin" && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setRemovingMember({ uid: m.uid, name: m.displayName });
                          }}
                          className="ml-2 flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 dark:hover:text-red-400"
                          title={t('details.removeMember')}
                        >
                          <UserX className="h-4 w-4" />
                        </button>
                      )}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}

      {groupInfo?.inviteCode && (
        <GroupQrCodeDialog
          open={showQrDialog}
          onClose={() => setShowQrDialog(false)}
          groupName={groupInfo.name}
          inviteCode={groupInfo.inviteCode}
        />
      )}
    </div>
  );
}
