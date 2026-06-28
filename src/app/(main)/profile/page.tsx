"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, signOut } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-md p-6 md:p-8">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Profile</h1>

      <div className="flex flex-col items-center mb-8">
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName} className="h-24 w-24 rounded-full" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-trevio-100 text-3xl font-bold text-trevio-700">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <h2 className="mt-4 text-xl font-bold text-slate-900">{user.displayName}</h2>
        <p className="text-sm text-slate-500">@{user.username}</p>
        <p className="text-xs text-slate-400">{user.email}</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
        <ProfileRow label="Username" value={`@${user.username}`} />
        <ProfileRow label="Email" value={user.email} />
        <ProfileRow label="Currency" value={user.defaultCurrency} />
        {user.upiId && <ProfileRow label="UPI ID" value={user.upiId} />}
      </div>

      <button
        onClick={signOut}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-3.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}
