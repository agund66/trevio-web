"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { getCurrencySymbol } from "@/lib/utils/currency";
import { GROUP_INFO_STALE_TIME } from "@/lib/constants/app";
import { ArrowLeft, Settings, Trash2, Crown, AlertCircle, Loader2, Check, LogOut, Wallet } from "lucide-react";

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { group, settlement } = useServices();
  const { user: currentUser } = useAuth();
  const { userCurrency, rates, formatGroup } = useCurrencyDisplay();
  const queryClient = useQueryClient();
  const t = useTranslations("groups");
  const tcommon = useTranslations("common");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [budget, setBudget] = useState("");
  const [budgetLoaded, setBudgetLoaded] = useState(false);
  const successTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const { data: groupInfo } = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: () => group.getGroupInfo(groupId),
    staleTime: GROUP_INFO_STALE_TIME,
  });

  const { data: members } = useQuery({
    queryKey: ["balances", groupId],
    queryFn: () => settlement.getGroupBalances(groupId),
  });

  const isAdmin = currentUser?.uid === groupInfo?.createdBy ||
    members?.find((m) => m.uid === currentUser?.uid)?.role === "admin";

  if (groupInfo && !loaded) {
    setName(groupInfo.name);
    setDescription(groupInfo.description);
    setLoaded(true);
  }

  if (groupInfo && !budgetLoaded) {
    // Budget is stored in the group's permanent currency.
    const displayBudget = groupInfo.monthlyBudget != null ? String(groupInfo.monthlyBudget) : "";
    setBudget(displayBudget);
    setBudgetLoaded(true);
  }

  const isHousehold = groupInfo?.template === "household";

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Step 1: update group name + description
      await group.updateGroup(groupId, name, description);
      // Step 2: update budget for household groups
      if (isHousehold) {
        const budgetNum = budget.trim() ? parseFloat(budget) : null;
        if (budgetNum !== null && (isNaN(budgetNum) || budgetNum <= 0)) {
          throw new Error(t('settings.budgetPositive'));
        }
        await group.updateGroupBudget(groupId, budgetNum, null);
      }
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      // Auto-navigate back on success
      router.back();
    },
    onError: (e: Error) => { setError(e.message); setSuccess(null); },
  });

  const roleMutation = useMutation({
    mutationFn: ({ memberUid, role }: { memberUid: string; role: "admin" | "member" }) =>
      group.updateMemberRole(groupId, memberUid, role),
    onSuccess: () => {
      setError(null);
      setSuccess(t('settings.roleUpdated'));
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setSuccess(null), 3000);
    },
    onError: (e: Error) => { setError(e.message); setSuccess(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => group.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/dashboard");
    },
    onError: (e: Error) => { setError(e.message); },
  });

  const leaveMutation = useMutation({
    mutationFn: () => group.leaveGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/dashboard");
    },
    onError: (e: Error) => { setError(e.message); },
  });

  const activeMembers = members?.filter((m) => m.status === "active" && m.uid !== currentUser?.uid) ?? [];
  const onlineActiveMembers = activeMembers.filter((m) => !m.isOffline);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-trevio-600" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-4 md:p-6">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> {tcommon('actions.back')}
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t('settings.title')}</h1>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 mb-6">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.adminOnlyDesc')}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-300">{t('settings.leaveGroup')}</h2>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{t('settings.leaveDesc')}</p>
          </div>
          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 dark:border-amber-700 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <LogOut className="h-4 w-4" />
              {t('settings.leaveGroup')}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{t('settings.leaveConfirm')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {leaveMutation.isPending ? t('settings.leaving') : t('settings.yesLeaveGroup')}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {tcommon('actions.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> {tcommon('actions.back')}
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t('settings.title')}</h1>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-600 dark:text-green-400">
          <Check className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* ── Group Details + Budget (single unified form) ── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('settings.groupDetails')}</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.groupName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('create.description')}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t('details.descriptionPlaceholder')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none resize-none"
            />
          </div>

          {/* Budget field for household groups — inside the same card */}
          {isHousehold && (
            <>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t('settings.monthlyBudget')}</h3>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('settings.budgetDesc')}</p>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('settings.monthlyBudgetAmount', { currency: groupInfo?.currency || userCurrency })}</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                    {getCurrencySymbol(groupInfo?.currency || userCurrency)}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder={t('create.monthlyBudgetPlaceholder')}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 pl-8 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                {groupInfo?.monthlyBudget != null && groupInfo.monthlyBudget > 0 && (
                  <p className="mt-1.5 text-xs text-teal-600 dark:text-teal-400">
                    Current budget: {formatGroup(groupInfo.monthlyBudget, groupInfo.currency)}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Single Save button for all fields */}
          <button
            onClick={() => updateMutation.mutate()}
            disabled={!name.trim() || updateMutation.isPending}
            className="rounded-xl bg-trevio-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? t('settings.saving') : t('settings.saveChanges')}
          </button>
        </div>

        {/* Manage Admins Section — allows admin to promote/demote members */}
        {isAdmin && onlineActiveMembers.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('settings.manageAdmins')}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('settings.manageAdminsDesc')}</p>
          </div>
          <div className="space-y-2">
            {onlineActiveMembers.map((m) => {
              const isMemberAdmin = m.role === "admin";
              return (
                <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 truncate">{m.displayName.split(" ")[0]}</p>
                    {isMemberAdmin && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                        <Crown className="h-2.5 w-2.5" />
                        {t('settings.adminBadge')}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const newRole = isMemberAdmin ? "member" : "admin";
                      const confirmMsg = isMemberAdmin
                        ? t('settings.removeAdminConfirm', { name: m.displayName })
                        : t('settings.makeAdminConfirm', { name: m.displayName });
                      if (confirm(confirmMsg)) {
                        roleMutation.mutate({ memberUid: m.uid, role: newRole });
                      }
                    }}
                    disabled={roleMutation.isPending}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition disabled:opacity-50 ${
                      isMemberAdmin
                        ? "border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        : "border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Crown className="h-3.5 w-3.5" />
                      {isMemberAdmin ? t('settings.removeAdmin') : t('settings.makeAdmin')}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {/* Danger Zone — available for all admin groups (including household) */}
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">{t('settings.dangerZone')}</h2>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">{t('settings.deleteDesc')}</p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{t('settings.deleteHint')}</p>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-red-300 dark:border-red-700 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <Trash2 className="h-4 w-4" />
              {t('settings.deleteGroup')}
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">{t('settings.deleteConfirm')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteMutation.isPending ? tcommon('actions.deleting') : t('settings.yesDeleteGroup')}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  {tcommon('actions.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>

        {!isAdmin && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-300">{t('settings.leaveGroup')}</h2>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">{t('settings.leaveDesc')}</p>
            </div>
            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 dark:border-amber-700 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                <LogOut className="h-4 w-4" />
                {t('settings.leaveGroup')}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">{t('settings.leaveConfirm')}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {leaveMutation.isPending ? t('settings.leaving') : t('settings.yesLeaveGroup')}
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    {tcommon('actions.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
