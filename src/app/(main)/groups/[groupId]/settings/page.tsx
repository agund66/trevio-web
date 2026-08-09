"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { ArrowLeft, Settings, Trash2, Crown, AlertCircle, Loader2, Check, LogOut } from "lucide-react";

export default function GroupSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.groupId as string;
  const { group, settlement } = useServices();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const { data: groupInfo } = useQuery({
    queryKey: ["groupInfo", groupId],
    queryFn: () => group.getGroupInfo(groupId),
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

  const updateMutation = useMutation({
    mutationFn: () => group.updateGroup(groupId, name, description),
    onSuccess: () => {
      setError(null);
      setSuccess("Group settings updated");
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (e: Error) => { setError(e.message); setSuccess(null); },
  });

  const transferMutation = useMutation({
    mutationFn: () => group.transferAdminRole(groupId, transferTarget),
    onSuccess: () => {
      setError(null);
      setSuccess("Admin role transferred successfully");
      setTransferTarget("");
      queryClient.invalidateQueries({ queryKey: ["groupInfo", groupId] });
      queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
      queryClient.invalidateQueries({ queryKey: ["activities", groupId] });
      setTimeout(() => setSuccess(null), 3000);
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
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Group Settings</h1>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-5 mb-6">
          <div className="flex items-center gap-3">
            <Settings className="h-5 w-5 text-slate-400" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Only group admins can edit group settings. Contact an admin if you need changes.</p>
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
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-300">Leave Group</h2>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">You will no longer have access to this group&apos;s expenses and activity.</p>
          </div>
          {!showLeaveConfirm ? (
            <button
              onClick={() => setShowLeaveConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 dark:border-amber-700 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-900/30"
            >
              <LogOut className="h-4 w-4" />
              Leave Group
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Are you sure you want to leave this group?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => leaveMutation.mutate()}
                  disabled={leaveMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {leaveMutation.isPending ? "Leaving..." : "Yes, Leave Group"}
                </button>
                <button
                  onClick={() => setShowLeaveConfirm(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
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
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Group Settings</h1>

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
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Group Details</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Group Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="What is this group for?"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none resize-none"
            />
          </div>

          <button
            onClick={() => updateMutation.mutate()}
            disabled={!name.trim() || updateMutation.isPending}
            className="rounded-xl bg-trevio-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Transfer Admin Role</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Transfer admin rights to another member. You will become a regular member.</p>
          </div>

          {activeMembers.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {activeMembers.map((m) => (
                  <button
                    key={m.uid}
                    onClick={() => setTransferTarget(m.uid)}
                    className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                      transferTarget === m.uid
                        ? "bg-trevio-600 text-white"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {m.displayName.split(" ")[0]}
                  </button>
                ))}
              </div>
              {transferTarget && (
                <button
                  onClick={() => {
                    if (confirm(`Transfer admin role to ${activeMembers.find((m) => m.uid === transferTarget)?.displayName}? You will become a regular member.`)) {
                      transferMutation.mutate();
                    }
                  }}
                  disabled={transferMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-trevio-600 px-4 py-2.5 text-sm font-semibold text-trevio-600 dark:text-trevio-400 transition hover:bg-trevio-50 dark:hover:bg-trevio-900/30 disabled:opacity-50"
                >
                  <Crown className="h-4 w-4" />
                  {transferMutation.isPending ? "Transferring..." : "Transfer Admin Role"}
                </button>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">No other active members to transfer admin role to.</p>
          )}
        </div>

        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-5 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-300">Danger Zone</h2>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">Delete this group permanently. All expenses, settlements, and activity will be removed.</p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-1">Only works if you are the sole active member. Remove other members first.</p>
          </div>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-red-300 dark:border-red-700 px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-100 dark:hover:bg-red-900/30"
            >
              <Trash2 className="h-4 w-4" />
              Delete Group
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">Are you absolutely sure? This cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {deleteMutation.isPending ? "Deleting..." : "Yes, Delete Group"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {!isAdmin && (
          <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-300">Leave Group</h2>
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">You will no longer have access to this group&apos;s expenses and activity.</p>
            </div>
            {!showLeaveConfirm ? (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-amber-300 dark:border-amber-700 px-4 py-2.5 text-sm font-semibold text-amber-600 dark:text-amber-400 transition hover:bg-amber-100 dark:hover:bg-amber-900/30"
              >
                <LogOut className="h-4 w-4" />
                Leave Group
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Are you sure you want to leave this group?</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => leaveMutation.mutate()}
                    disabled={leaveMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {leaveMutation.isPending ? "Leaving..." : "Yes, Leave Group"}
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    Cancel
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
