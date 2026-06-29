"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { Plane, Dumbbell, Coffee, Search, UserPlus, X } from "lucide-react";
import type { GroupTemplate, UserSearchResult } from "@/lib/types";

export default function CreateGroupPage() {
  const { group, user } = useServices();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<GroupTemplate>("casual");
  const [currency, setCurrency] = useState("INR");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await user.searchUsers(query);
      setSearchResults(results.filter((r) => !selectedMembers.some((m) => m.uid === r.uid)));
    } catch {
      setSearchResults([]);
    }
  };

  const addMember = (u: UserSearchResult) => {
    setSelectedMembers([...selectedMembers, u]);
    setSearchResults(searchResults.filter((r) => r.uid !== u.uid));
  };

  const removeMember = (u: UserSearchResult) => {
    setSelectedMembers(selectedMembers.filter((m) => m.uid !== u.uid));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await group.createGroup(name, description, template, currency, selectedMembers.map((m) => m.uid));
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group");
      setCreating(false);
    }
  };

  const templates = [
    { id: "trip" as GroupTemplate, label: "Trip", icon: Plane, desc: "Travel & vacations" },
    { id: "turf" as GroupTemplate, label: "Turf", icon: Dumbbell, desc: "Recurring sports" },
    { id: "casual" as GroupTemplate, label: "Casual", icon: Coffee, desc: "Everyday splits" },
  ];

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create Group</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Choose a template</label>
          <div className="grid grid-cols-3 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
                  template === t.id ? "border-trevio-500 bg-trevio-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <t.icon className={`h-7 w-7 ${template === t.id ? "text-trevio-600" : "text-slate-400"}`} />
                <span className={`text-sm font-medium ${template === t.id ? "text-trevio-700" : "text-slate-600"}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Group name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Goa Trip 2025"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
          >
            <option value="INR">₹ INR - Indian Rupee</option>
            <option value="USD">$ USD - US Dollar</option>
            <option value="EUR">€ EUR - Euro</option>
            <option value="GBP">£ GBP - British Pound</option>
            <option value="AED">د.إ AED - UAE Dirham</option>
            <option value="SGD">S$ SGD - Singapore Dollar</option>
            <option value="AUD">A$ AUD - Australian Dollar</option>
            <option value="CAD">C$ CAD - Canadian Dollar</option>
            <option value="JPY">¥ JPY - Japanese Yen</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Add members</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username..."
              className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              {searchResults.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => addMember(u)}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"
                >
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="h-9 w-9 rounded-full" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trevio-100 text-sm font-semibold text-trevio-700">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{u.displayName}</p>
                    <p className="text-xs text-slate-500">@{u.username}</p>
                  </div>
                  <UserPlus className="h-5 w-5 text-trevio-500" />
                </button>
              ))}
            </div>
          )}

          {selectedMembers.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-slate-500">Selected ({selectedMembers.length})</p>
              {selectedMembers.map((u) => (
                <div key={u.uid} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.displayName} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-trevio-100 text-sm font-semibold text-trevio-700">
                      {u.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium text-slate-900">{u.displayName}</span>
                  <button onClick={() => removeMember(u)} className="text-slate-400 hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || creating}
          className="w-full rounded-xl bg-trevio-600 py-4 text-base font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? "Creating..." : "Create Group"}
        </button>
      </div>
    </div>
  );
}
