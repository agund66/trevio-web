"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import { usePaginatedQuery } from "@/lib/hooks/use-paginated-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants/app";
import { LoadMoreButton } from "@/components/load-more-button";
import type { User } from "@/lib/types";
import { Ban, CheckCircle, Crown, Search, AlertCircle, Shield, X } from "lucide-react";
import { Avatar } from "@/components/avatar";

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const { admin } = useServices();
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ uid: string; type: string; userName: string } | null>(null);

  const confirmMessages: Record<string, { title: string; body: string; confirm: string }> = {
    block: { title: t('users.blockTitle'), body: t('users.blockBody'), confirm: t('users.block') },
    unblock: { title: t('users.unblockTitle'), body: t('users.unblockBody'), confirm: t('users.unblock') },
    promote: { title: t('users.promoteTitle'), body: t('users.promoteBody'), confirm: t('users.promoteConfirm') },
    demote: { title: t('users.demoteTitle'), body: t('users.demoteBody'), confirm: t('users.demoteConfirm') },
  };

  const usersPagination = usePaginatedQuery({
    queryKey: ["adminUsers"],
    queryFn: (pageSize, lastId) => admin.getAllUsers(pageSize, lastId),
    pageSize: DEFAULT_PAGE_SIZE,
    extractItems: (r) => r.users,
    extractHasMore: (r) => r.hasMore,
    extractLastId: (r) => r.lastUserUid,
  });
  const users = usersPagination.items;
  const loading = usersPagination.isLoading;
  const error = usersPagination.error instanceof Error ? usersPagination.error.message : null;

  const handleBlock = async (uid: string) => {
    setActionError(null);
    setActionLoading(uid);
    try {
      await admin.blockUser(uid);
      usersPagination.refresh();
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : t('users.actionFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (uid: string) => {
    setActionError(null);
    setActionLoading(uid);
    try {
      await admin.unblockUser(uid);
      usersPagination.refresh();
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : t('users.actionFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (uid: string) => {
    setActionError(null);
    setActionLoading(uid);
    try {
      await admin.promoteToSuperAdmin(uid);
      usersPagination.refresh();
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : t('users.actionFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async (uid: string) => {
    setActionError(null);
    setActionLoading(uid);
    try {
      await admin.demoteToUser(uid);
      usersPagination.refresh();
    } catch (e) {
      console.error(e);
      setActionError(e instanceof Error ? e.message : t('users.actionFailed'));
    } finally {
      setActionLoading(null);
    }
  };

  const executeConfirmedAction = () => {
    if (!confirmAction) return;
    const { uid, type } = confirmAction;
    setConfirmAction(null);
    switch (type) {
      case "block": handleBlock(uid); break;
      case "unblock": handleUnblock(uid); break;
      case "promote": handlePromote(uid); break;
      case "demote": handleDemote(uid); break;
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q)
    );
  });

  const totalUsers = users.length;
  const blockedUsers = users.filter((u) => u.blocked).length;
  const adminUsers = users.filter((u) => u.role === "superadmin").length;

  return (
    <>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('users.totalUsers')}</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalUsers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('users.blocked')}</p>
          <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{blockedUsers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('users.superadmins')}</p>
          <p className="mt-1 text-2xl font-bold text-trevio-600 dark:text-trevio-400">{adminUsers}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-3 pl-11 pr-4 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {actionError && (
        <div className="mb-4 flex items-center justify-between gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            {actionError}
          </div>
          <button
            onClick={() => setActionError(null)}
            className="rounded-lg p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-trevio-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u) => (
            <div
              key={u.uid}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <Avatar photoURL={u.photoURL} displayName={u.displayName} className="h-10 w-10" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{u.displayName}{u.uid === currentUser?.uid && <span className="ml-1 text-xs font-normal text-trevio-600 dark:text-trevio-400">{tCommon('youLabel')}</span>}</p>
                    {u.role === "superadmin" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-trevio-50 dark:bg-trevio-900/30 px-2 py-0.5 text-xs font-medium text-trevio-700 dark:text-trevio-300">
                        <Crown className="h-3 w-3" />
                        {t('users.adminBadge')}
                      </span>
                    )}
                    {u.blocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 dark:bg-red-900/20 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
                        <Ban className="h-3 w-3" />
                        {t('users.blocked')}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {u.email} {u.username && `· @${u.username}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {u.blocked ? (
                  <button
                    onClick={() => setConfirmAction({ uid: u.uid, type: "unblock", userName: u.displayName })}
                    disabled={actionLoading === u.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 transition hover:bg-green-100 dark:hover:bg-green-900/30 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {t('users.unblock')}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction({ uid: u.uid, type: "block", userName: u.displayName })}
                    disabled={actionLoading === u.uid || u.uid === currentUser?.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" />
                    {t('users.block')}
                  </button>
                )}
                {u.role === "superadmin" ? (
                  <button
                    onClick={() => setConfirmAction({ uid: u.uid, type: "demote", userName: u.displayName })}
                    disabled={actionLoading === u.uid || u.uid === currentUser?.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    <Shield className="h-4 w-4" />
                    {t('users.demoteConfirm')}
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction({ uid: u.uid, type: "promote", userName: u.displayName })}
                    disabled={actionLoading === u.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-50 dark:bg-trevio-900/20 px-3 py-2 text-sm font-medium text-trevio-700 dark:text-trevio-300 transition hover:bg-trevio-100 dark:hover:bg-trevio-900/30 disabled:opacity-50"
                  >
                    <Crown className="h-4 w-4" />
                    {t('users.promoteConfirm')}
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('users.noUsersFound')}
            </div>
          )}
          <LoadMoreButton
            onClick={usersPagination.loadMore}
            loading={usersPagination.loadingMore}
            hasMore={usersPagination.hasMore}
          />
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmAction(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{confirmMessages[confirmAction.type].title}</h3>
              <button onClick={() => setConfirmAction(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{confirmAction.userName}</span> — {confirmMessages[confirmAction.type].body}
              </p>
            </div>
            <div className="flex gap-2 border-t border-slate-200 dark:border-slate-700 px-5 py-4">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {tCommon('actions.cancel')}
              </button>
              <button
                onClick={executeConfirmedAction}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition ${
                  confirmAction.type === "block" ? "bg-red-600 hover:bg-red-700" :
                  confirmAction.type === "promote" ? "bg-trevio-600 hover:bg-trevio-700" :
                  confirmAction.type === "demote" ? "bg-slate-600 hover:bg-slate-700" :
                  "bg-green-600 hover:bg-green-700"
                }`}
              >
                {confirmMessages[confirmAction.type].confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
