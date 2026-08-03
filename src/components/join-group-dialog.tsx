"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { QrScannerDialog } from "@/components/qr-scanner-dialog";
import { X, Loader2, AlertCircle, LogIn, QrCode, CloudOff, Check } from "lucide-react";
import type { Member } from "@/lib/types";

interface JoinGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

export function JoinGroupDialog({ open, onClose }: JoinGroupDialogProps) {
  const { group, settlement } = useServices();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [claimableMembers, setClaimableMembers] = useState<Member[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setInviteCode("");
      setError(null);
      setSuccess(null);
      setJoining(false);
      setShowScanner(false);
      setClaimableMembers([]);
      setGroupId(null);
      setClaimError(null);
    }
  }, [open]);

  if (!open) return null;

  const extractInviteCode = (rawValue: string): string => {
    const match = rawValue.match(/\/join\/([^/?#]+)/);
    if (match) return match[1];
    return rawValue.trim();
  };

  const handleJoinWithCode = async (code: string) => {
    if (!code) {
      setError("Please enter an invite code");
      return;
    }

    setJoining(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await group.joinGroupViaCode(code);
      setGroupId(result.groupId);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      try {
        const members = await settlement.getGroupBalances(result.groupId);
        const claimable = members.filter((m) => m.isOffline);
        if (claimable.length > 0) {
          setClaimableMembers(claimable);
          setJoining(false);
        } else {
          setSuccess(`Joined "${result.groupName}" successfully!`);
          setTimeout(() => {
            onClose();
            setInviteCode("");
            setSuccess(null);
            setJoining(false);
          }, 1500);
        }
      } catch {
        setSuccess(`Joined "${result.groupName}" successfully!`);
        setTimeout(() => {
          onClose();
          setInviteCode("");
          setSuccess(null);
          setJoining(false);
        }, 1500);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join group");
      setJoining(false);
    }
  };

  const handleJoin = () => handleJoinWithCode(inviteCode.trim().toUpperCase());

  const handleScan = (rawValue: string) => {
    setShowScanner(false);
    const code = extractInviteCode(rawValue).toUpperCase();
    setInviteCode(code);
    handleJoinWithCode(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !joining && onClose()}
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trevio-50 dark:bg-trevio-900/30">
              <LogIn className="h-4.5 w-4.5 text-trevio-600 dark:text-trevio-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Join Group</h2>
          </div>
          <button
            onClick={() => !joining && onClose()}
            className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {claimableMembers.length > 0 ? (
            <>
              <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4 shrink-0" />
                <span>Joined successfully! Claim an offline profile to link your account.</span>
              </div>
              <div className="space-y-2">
                {claimableMembers.map((m) => (
                  <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                      <CloudOff className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100">{m.displayName}</span>
                    <button
                      onClick={async () => {
                        if (!groupId) return;
                        setClaiming(true);
                        setClaimError(null);
                        try {
                          await group.claimOfflineMember(groupId, m.uid);
                          queryClient.invalidateQueries({ queryKey: ["balances", groupId] });
                          setClaimableMembers([]);
                          setSuccess("Profile claimed successfully!");
                          setTimeout(() => {
                            onClose();
                            setSuccess(null);
                            setClaiming(false);
                          }, 1500);
                        } catch (e) {
                          setClaimError(e instanceof Error ? e.message : "Failed to claim");
                          setClaiming(false);
                        }
                      }}
                      disabled={claiming}
                      className="rounded-lg bg-trevio-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50"
                    >
                      {claiming ? "Claiming..." : "Claim"}
                    </button>
                  </div>
                ))}
              </div>
              {claimError && <p className="text-sm text-red-500 dark:text-red-400">{claimError}</p>}
              <button
                onClick={() => { setClaimableMembers([]); onClose(); }}
                className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                Skip for now
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Enter the invite code shared by your friend to join their group.
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && !joining && handleJoin()}
                  placeholder="e.g. ABCD12"
                  maxLength={10}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm font-medium tracking-wider uppercase text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 rounded-xl bg-green-50 dark:bg-green-900/20 px-4 py-3 text-sm text-green-600 dark:text-green-400">
                  <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{success}</span>
                </div>
              )}
            </>
          )}
        </div>

        {claimableMembers.length === 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4 space-y-2">
            <button
              onClick={handleJoin}
              disabled={joining || !inviteCode.trim()}
              className="w-full rounded-xl bg-trevio-600 py-3.5 text-sm font-semibold text-white transition hover:bg-trevio-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {joining ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Joining...
                </span>
              ) : (
                "Join Group"
              )}
            </button>
            <button
              onClick={() => setShowScanner(true)}
              disabled={joining}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 py-3.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <QrCode className="h-4 w-4" />
              Scan QR Code
            </button>
          </div>
        )}
      </div>

      <QrScannerDialog
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </div>
  );
}
