"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { Plane, Dumbbell, Coffee, Search, UserPlus, X, User, Plus } from "lucide-react";
import { Avatar } from "@/components/avatar";
import type { GroupTemplate, UserSearchResult } from "@/lib/types";

export default function CreateGroupPage() {
  const { group, user } = useServices();
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<GroupTemplate>("casual");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
  const [offlineMembers, setOfflineMembers] = useState<string[]>([]);
  const [offlineName, setOfflineName] = useState("");
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

  const addOfflineMember = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setOfflineMembers([...offlineMembers, trimmed]);
    setOfflineName("");
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeOfflineMember = (name: string) => {
    setOfflineMembers(offlineMembers.filter((n) => n !== name));
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const result = await group.createGroup(name, description, template, selectedMembers.map((m) => m.uid));
      for (const offlineName of offlineMembers) {
        await group.addOfflineMember(result.groupId, offlineName);
      }
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Create Group</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Choose a template</label>
          <div className="grid grid-cols-3 gap-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id)}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
                  template === t.id ? "border-trevio-500 dark:border-trevio-500 bg-trevio-50 dark:bg-trevio-900/30" : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <t.icon className={`h-7 w-7 ${template === t.id ? "text-trevio-600 dark:text-trevio-400" : "text-slate-400 dark:text-slate-500"}`} />
                <span className={`text-sm font-medium ${template === t.id ? "text-trevio-700 dark:text-trevio-300" : "text-slate-600 dark:text-slate-400"}`}>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Group name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Goa Trip 2025"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Add members</label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Search by username or add someone not on the app</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by username..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
            />
          </div>

          {searchResults.length > 0 && (
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-700">
              {searchResults.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => addMember(u)}
                  className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Avatar photoURL={u.photoURL} displayName={u.displayName} className="h-9 w-9" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.displayName}{u.uid === currentUser?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">(You)</span>}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">@{u.username}</p>
                  </div>
                  <UserPlus className="h-5 w-5 text-trevio-500" />
                </button>
              ))}
            </div>
          )}

          {searchQuery.trim() && searchResults.length === 0 && (
            <button
              onClick={() => addOfflineMember(searchQuery)}
              className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-trevio-300 dark:border-trevio-700 bg-trevio-50/50 dark:bg-trevio-900/20 p-3 text-left hover:bg-trevio-50 dark:hover:bg-trevio-900/30 transition"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-trevio-100 dark:bg-trevio-800">
                <UserPlus className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
              </div>
              <p className="text-sm font-medium text-trevio-600 dark:text-trevio-400">
                Add "{searchQuery}" as offline member
              </p>
            </button>
          )}

          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={offlineName}
                onChange={(e) => setOfflineName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && offlineName.trim() && addOfflineMember(offlineName)}
                placeholder="Add by name (not on app)..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
              />
            </div>
            <button
              onClick={() => addOfflineMember(offlineName)}
              disabled={!offlineName.trim()}
              className="rounded-xl bg-trevio-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {(selectedMembers.length > 0 || offlineMembers.length > 0) && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{selectedMembers.length + offlineMembers.length} added</p>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((u) => (
                  <div key={u.uid} className="flex items-center gap-2 rounded-full bg-trevio-50 dark:bg-trevio-900/30 border border-trevio-200 dark:border-trevio-700 pl-1.5 pr-1 py-1">
                    <Avatar photoURL={u.photoURL} displayName={u.displayName} className="h-6 w-6" textClassName="text-xs" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.displayName}{u.uid === currentUser?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">(You)</span>}</span>
                    <button onClick={() => removeMember(u)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {offlineMembers.map((name) => (
                  <div key={name} className="flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 pl-1.5 pr-1 py-1">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                      <User className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{name}</span>
                    <button onClick={() => removeOfflineMember(name)} className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

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
