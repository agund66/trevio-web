"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/hooks/use-auth";
import { Shield, Megaphone, LifeBuoy } from "lucide-react";
import { UsersTab } from "./users-tab";
import { BroadcastsTab } from "./broadcasts-tab";
import { SupportTab } from "./support-tab";
import { cn } from "@/lib/utils";

type AdminTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();
  const t = useTranslations("admin");
  const [activeTab, setActiveTab] = useState("users");

  const adminTabs: AdminTab[] = [
    { id: "users", label: t('usersTab'), icon: Shield },
    { id: "broadcasts", label: t('tabs.broadcasts'), icon: Megaphone },
    { id: "support", label: t('supportTab'), icon: LifeBuoy },
  ];

  if (!currentUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-trevio-600" />
      </div>
    );
  }

  if (currentUser.role !== "superadmin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <p className="mt-4 text-lg font-semibold text-slate-700 dark:text-slate-200">{t('accessDenied')}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('superadminRequired')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('dashboardTitle')}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('manageUsersDesc')}</p>
      </div>

      {/* Tab bar */}
      {adminTabs.length > 1 && (
        <div className="mb-6 flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition",
                activeTab === tab.id
                  ? "border-trevio-600 text-trevio-700 dark:text-trevio-400"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Tab content */}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "broadcasts" && <BroadcastsTab />}
      {activeTab === "support" && <SupportTab />}
    </div>
  );
}
