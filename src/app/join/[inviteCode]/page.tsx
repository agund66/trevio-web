"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { Check, Loader2, AlertCircle } from "lucide-react";

export default function JoinGroupPage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.inviteCode as string;
  const { group } = useServices();
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<"checking" | "joining" | "joined" | "error">("checking");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (loading) return;

    if (!user) {
      sessionStorage.setItem("pendingInviteCode", inviteCode);
      router.push("/login");
      return;
    }

    if (!user.acceptedTnC) {
      sessionStorage.setItem("pendingInviteCode", inviteCode);
      router.push("/terms");
      return;
    }

    const join = async () => {
      setStatus("joining");
      try {
        await group.joinGroupViaCode(inviteCode);
        sessionStorage.removeItem("pendingInviteCode");
        setStatus("joined");
        setTimeout(() => router.push("/dashboard"), 1500);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Failed to join group");
        setStatus("error");
      }
    };
    join();
  }, [user, loading, inviteCode, group, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        {status === "checking" || status === "joining" ? (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-trevio-600 mx-auto" />
            <p className="mt-4 text-lg font-semibold text-slate-700">
              {status === "checking" ? "Checking..." : "Joining group..."}
            </p>
          </>
        ) : status === "joined" ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-700">Joined successfully!</p>
            <p className="text-sm text-slate-500">Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mx-auto">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-700">Failed to join</p>
            <p className="text-sm text-slate-500">{errorMsg}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-6 rounded-xl bg-trevio-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-trevio-700"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}
