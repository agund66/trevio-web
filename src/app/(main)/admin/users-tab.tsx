"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import type { User } from "@/lib/types";
import { Ban, CheckCircle, Crown, Search, AlertCircle, Shield, X } from "lucide-react";

const confirmMessages: Record<string, { title: string; body: string; confirm: string }> = {
  block: { title: "Block User", body: "This user will be unable to sign in or use Trevio. They can be unblocked later.", confirm: "Block" },
  unblock: { title: "Unblock User", body: "This user will regain access to Trevio.", confirm: "Unblock" },
  promote: { title: "Promote to Superadmin", body: "This user will gain full admin privileges including managing users and broadcasts.", confirm: "Promote" },
  demote: { title: "Demote to User", body: "This user will lose all admin privileges.", confirm: "Demote" },
};

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const { admin } = useServices();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ uid: string; type: string; userName: string } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allUsers = await admin.getAllUsers();
      setUsers(allUsers);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleBlock = async (uid: string) => {
    setActionLoading(uid);
    try {
      await admin.blockUser(uid);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to block user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (uid: string) => {
    setActionLoading(uid);
    try {
      await admin.unblockUser(uid);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to unblock user");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePromote = async (uid: string) => {
    setActionLoading(uid);
    try {
      await admin.promoteToSuperAdmin(uid);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to promote user");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDemote = async (uid: string) => {
    setActionLoading(uid);
    try {
      await admin.demoteToUser(uid);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to demote user");
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
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Total Users</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{totalUsers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Blocked</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{blockedUsers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="text-sm text-slate-500">Superadmins</p>
          <p className="mt-1 text-2xl font-bold text-trevio-600">{adminUsers}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or username..."
          className="w-full rounded-xl border border-slate-200 py-3 pl-11 pr-4 text-sm focus:border-trevio-500 focus:outline-none"
        />
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u) => (
            <div
              key={u.uid}
              className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.displayName} className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-trevio-100 text-sm font-semibold text-trevio-700">
                    {u.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{u.displayName}{u.uid === currentUser?.uid && <span className="ml-1 text-xs font-normal text-trevio-600">(You)</span>}</p>
                    {u.role === "superadmin" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-trevio-50 px-2 py-0.5 text-xs font-medium text-trevio-700">
                        <Crown className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                    {u.blocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600">
                        <Ban className="h-3 w-3" />
                        Blocked
                      </span>
                    )}
                  </div>
                  <p className="truncate text-sm text-slate-500">
                    {u.email} {u.username && `· @${u.username}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {u.blocked ? (
                  <button
                    onClick={() => setConfirmAction({ uid: u.uid, type: "unblock", userName: u.displayName })}
                    disabled={actionLoading === u.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction({ uid: u.uid, type: "block", userName: u.displayName })}
                    disabled={actionLoading === u.uid || u.uid === currentUser?.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </button>
                )}
                {u.role === "superadmin" ? (
                  <button
                    onClick={() => setConfirmAction({ uid: u.uid, type: "demote", userName: u.displayName })}
                    disabled={actionLoading === u.uid || u.uid === currentUser?.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <Shield className="h-4 w-4" />
                    Demote
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmAction({ uid: u.uid, type: "promote", userName: u.displayName })}
                    disabled={actionLoading === u.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-trevio-50 px-3 py-2 text-sm font-medium text-trevio-700 transition hover:bg-trevio-100 disabled:opacity-50"
                  >
                    <Crown className="h-4 w-4" />
                    Promote
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
              No users found.
            </div>
          )}
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmAction(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h3 className="text-lg font-bold text-slate-900">{confirmMessages[confirmAction.type].title}</h3>
              <button onClick={() => setConfirmAction(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{confirmAction.userName}</span> — {confirmMessages[confirmAction.type].body}
              </p>
            </div>
            <div className="flex gap-2 border-t border-slate-200 px-5 py-4">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
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
