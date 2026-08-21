"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { Check, Loader2, AlertCircle, CloudOff } from "lucide-react";
import type { Member } from "@/lib/types";

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("common");
  const inviteCode = params.inviteCode as string;
  const queryClient = useQueryClient();
  const { group, settlement } = useServices();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"checking" | "joining" | "joined" | "error" | "claim">("checking");
  const [errorMsg, setErrorMsg] = useState("");
  const [claimableMembers, setClaimableMembers] = useState<Member[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const hasAttemptedJoin = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      try { sessionStorage.setItem("pendingInviteCode", inviteCode); } catch {}
      router.push("/login");
      return;
    }

    if (!user.acceptedTnC) {
      try { sessionStorage.setItem("pendingInviteCode", inviteCode); } catch {}
      router.push("/login");
      return;
    }

    if (hasAttemptedJoin.current) return;
    hasAttemptedJoin.current = true;

    const join = async () => {
      setStatus("joining");
      try {
        const result = await group.joinGroupViaCode(inviteCode);
        try { sessionStorage.removeItem("pendingInviteCode"); } catch {}
        queryClient.invalidateQueries({ queryKey: ["groups"] });
        setGroupId(result.groupId);
        try {
          const members = await settlement.getGroupBalances(result.groupId);
          const claimable = members.filter((m) => m.isOffline);
          if (claimable.length > 0) {
            setClaimableMembers(claimable);
            setStatus("claim");
          } else {
            setStatus("joined");
            setTimeout(() => router.push(`/groups/${result.groupId}`), 1500);
          }
        } catch {
          setStatus("joined");
          setTimeout(() => router.push(`/groups/${result.groupId}`), 1500);
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : t('failedToJoinGroup'));
        setStatus("error");
      }
    };
    join();
  }, [user, loading, inviteCode, group, settlement, router, t, queryClient]);

  const handleClaim = async (memberDocId: string) => {
    if (!groupId) return;
    setClaiming(true);
    setClaimError(null);
    try {
      await group.claimOfflineMember(groupId, memberDocId);
      setClaimed(true);
      setClaiming(false);
      setTimeout(() => router.push(`/groups/${groupId}`), 1500);
    } catch (e) {
      setClaimError(e instanceof Error ? e.message : t('failedToClaimProfile'));
      setClaiming(false);
    }
  };

  const skipClaim = () => {
    setClaimableMembers([]);
    setStatus("joined");
    setTimeout(() => router.push(`/groups/${groupId}`), 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="text-center max-w-md w-full px-6">
        {status === "checking" || status === "joining" ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-trevio-600 dark:text-trevio-400 mx-auto" />
            <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
              {status === "checking" ? t('checking') : t('joiningGroup')}
            </p>
          </>
        ) : status === "claim" ? (
          claimed ? (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">{t('profileClaimed')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('transactionsLinked')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t('redirectingDashboard')}</p>
            </>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">{t('joinedSuccessfully')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                {t('claimPrompt')}
              </p>
              <div className="mt-6 space-y-2 text-left">
                {claimableMembers.map((m) => (
                  <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-700">
                      <CloudOff className="h-5 w-5 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-slate-900 dark:text-slate-100">{m.displayName}</span>
                    <button
                      onClick={() => handleClaim(m.uid)}
                      disabled={claiming}
                      className="rounded-lg bg-trevio-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50"
                    >
                      {t('claim')}
                    </button>
                  </div>
                ))}
              </div>
              {claimError && <p className="mt-3 text-sm text-red-500 dark:text-red-400">{claimError}</p>}
              <button onClick={skipClaim} className="mt-6 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                {t('skipForNow')}
              </button>
            </>
          )
        ) : status === "joined" ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">{t('joinedSuccessfully')}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('redirectingDashboard')}</p>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 mx-auto">
              <AlertCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">{t('failedToJoin')}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{errorMsg}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 rounded-xl bg-trevio-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-trevio-700"
            >
              {t('goToDashboard')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
