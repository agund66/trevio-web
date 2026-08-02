"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { QrScannerDialog } from "@/components/qr-scanner-dialog";
import { X, Loader2, AlertCircle, LogIn, QrCode } from "lucide-react";

interface JoinGroupDialogProps {
  open: boolean;
  onClose: () => void;
}

export function JoinGroupDialog({ open, onClose }: JoinGroupDialogProps) {
  const { group } = useServices();
  const queryClient = useQueryClient();
  const [inviteCode, setInviteCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (open) {
      setInviteCode("");
      setError(null);
      setSuccess(null);
      setJoining(false);
      setShowScanner(false);
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
      setSuccess(`Joined "${result.groupName}" successfully!`);
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setTimeout(() => {
        onClose();
        setInviteCode("");
        setSuccess(null);
        setJoining(false);
      }, 1500);
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
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trevio-50">
              <LogIn className="h-4.5 w-4.5 text-trevio-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Join Group</h2>
          </div>
          <button
            onClick={() => !joining && onClose()}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">
            Enter the invite code shared by your friend to join their group.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Invite Code</label>
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
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium tracking-wider uppercase focus:border-trevio-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>{success}</span>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 space-y-2">
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
            className="w-full rounded-xl border border-slate-200 py-3.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <QrCode className="h-4 w-4" />
            Scan QR Code
          </button>
        </div>
      </div>

      <QrScannerDialog
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleScan}
      />
    </div>
  );
}
