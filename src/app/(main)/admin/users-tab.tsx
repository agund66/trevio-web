"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import type { User } from "@/lib/types";
import { Ban, CheckCircle, Crown, Search, AlertCircle, Shield } from "lucide-react";

export function UsersTab() {
  const { user: currentUser } = useAuth();
  const { admin } = useServices();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
                    <p className="truncate font-medium text-slate-900">{u.displayName}</p>
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
                    onClick={() => handleUnblock(u.uid)}
                    disabled={actionLoading === u.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Unblock
                  </button>
                ) : (
                  <button
                    onClick={() => handleBlock(u.uid)}
                    disabled={actionLoading === u.uid || u.uid === currentUser?.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" />
                    Block
                  </button>
                )}
                {u.role === "superadmin" ? (
                  <button
                    onClick={() => handleDemote(u.uid)}
                    disabled={actionLoading === u.uid || u.uid === currentUser?.uid}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <Shield className="h-4 w-4" />
                    Demote
                  </button>
                ) : (
                  <button
                    onClick={() => handlePromote(u.uid)}
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
    </>
  );
}
