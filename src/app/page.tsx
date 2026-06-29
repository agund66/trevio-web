"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { TrevioIcon } from "@/components/trevio-logo";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    } else if (!user.acceptedTnC) {
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center">
        <TrevioIcon size={72} />
        <h1 className="mt-4 text-3xl font-bold text-trevio-600">Trevio</h1>
        <p className="mt-1 text-slate-500">Split bills. Simplify life.</p>
        {loading && (
          <div className="mt-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 border-t-trevio-600 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
