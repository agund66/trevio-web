"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { Shield, Megaphone } from "lucide-react";
import { UsersTab } from "./users-tab";
import { BroadcastsTab } from "./broadcasts-tab";
import { cn } from "@/lib/utils";

type AdminTab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const adminTabs: AdminTab[] = [
  { id: "users", label: "Users", icon: Shield },
  { id: "broadcasts", label: "Broadcasts", icon: Megaphone },
];

export default function AdminDashboardPage() {
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

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
          <Shield className="mx-auto h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-700">Access Denied</p>
          <p className="mt-1 text-sm text-slate-500">You need superadmin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Manage users, roles, and access control</p>
      </div>

      {/* Tab bar */}
      {adminTabs.length > 1 && (
        <div className="mb-6 flex gap-1 border-b border-slate-200">
          {adminTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition",
                activeTab === tab.id
                  ? "border-trevio-600 text-trevio-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
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
    </div>
  );
}
