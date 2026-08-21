"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/use-auth";
import { TrevioIcon } from "@/components/trevio-logo";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const t = useTranslations("common");

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
    } else if (!user.acceptedTnC || !user.phoneNumber) {
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center">
        <TrevioIcon size={72} />
        <h1 className="mt-4 text-3xl font-bold text-trevio-600 dark:text-trevio-400">Trevio</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">{t('tagline')}</p>
        {loading && (
          <div className="mt-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-trevio-200 dark:border-trevio-800 border-t-trevio-600 dark:border-t-trevio-400 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}
