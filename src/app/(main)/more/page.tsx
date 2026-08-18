"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/use-auth";
import { TermsDialog } from "@/components/terms-dialog";
import { Avatar } from "@/components/avatar";
import { Shield, FileText, LifeBuoy, LogOut, ChevronRight, Sparkles } from "lucide-react";
import { useState, type ComponentType } from "react";

type MenuItem = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
};

export default function MorePage() {
  const { user, signOut } = useAuth();
  const t = useTranslations("more");
  const tp = useTranslations("profile");
  const tw = useTranslations("wrapped");
  const [showTerms, setShowTerms] = useState(false);

  if (!user) return null;

  const menuItems: MenuItem[] = [
    ...(user.role === "superadmin"
      ? [{ icon: Shield as ComponentType<{ className?: string }>, label: t("adminDashboard"), href: "/admin" }]
      : []),
    {
      icon: Sparkles,
      label: tw("title"),
      href: "/wrapped",
    },
    {
      icon: FileText,
      label: tp("actions.terms"),
      onClick: () => setShowTerms(true),
    },
    {
      icon: LifeBuoy,
      label: tp("actions.helpSupport"),
      href: "/support",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t("title")}</h1>

      {/* User card */}
      <Link
        href="/profile"
        className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-6 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
      >
        <Avatar photoURL={user.photoURL} displayName={user.displayName} className="h-12 w-12" />
        <div className="flex-1 min-w-0">
          <p className="truncate font-semibold text-slate-900 dark:text-slate-100">{user.displayName}</p>
          <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </Link>

      {/* Menu items */}
      <div className="space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return item.href ? (
            <Link
              key={index}
              href={item.href}
              className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trevio-50 dark:bg-trevio-900/30">
                <Icon className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
              </div>
              <span className="flex-1 font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
          ) : (
            <button
              key={index}
              onClick={item.onClick}
              className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-trevio-50 dark:bg-trevio-900/30">
                <Icon className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
              </div>
              <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </button>
          );
        })}
      </div>

      {/* Sign out */}
      <button
        onClick={signOut}
        className="mt-6 flex w-full items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/30">
          <LogOut className="h-5 w-5 text-red-600 dark:text-red-400" />
        </div>
        <span className="flex-1 text-left font-medium text-red-600 dark:text-red-400">{t("signOut")}</span>
      </button>

      <TermsDialog open={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
