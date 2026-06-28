"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import { useQueryClient } from "@tanstack/react-query";
import { Edit3, Check, X } from "lucide-react";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const { user: userService } = useServices();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("INR");
  const [upiId, setUpiId] = useState("");

  if (!user) return null;

  const startEdit = () => {
    setDisplayName(user.displayName);
    setDefaultCurrency(user.defaultCurrency);
    setUpiId(user.upiId || "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated: User = {
        ...user,
        displayName,
        defaultCurrency,
        upiId,
      };
      await userService.updateUser(updated);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setEditing(false);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile");
      setSaving(false);
    }
  };

  const currencies = [
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  ];

  return (
    <div className="mx-auto max-w-md p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        {!editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-50 px-3 py-2 text-sm font-semibold text-trevio-700 transition hover:bg-trevio-100"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        )}
      </div>

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

      {editing ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Default Currency</label>
            <select
              value={defaultCurrency}
              onChange={(e) => setDefaultCurrency(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">UPI ID (optional)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          <ProfileRow label="Username" value={`@${user.username}`} />
          <ProfileRow label="Email" value={user.email} />
          <ProfileRow label="Currency" value={user.defaultCurrency} />
          {user.upiId && <ProfileRow label="UPI ID" value={user.upiId} />}
        </div>
      )}
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
