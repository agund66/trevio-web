"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { useCurrencyDisplay } from "@/lib/hooks/use-currency-display";
import { getCurrencySymbol } from "@/lib/utils/currency";
import { Plane, Dumbbell, Coffee, Home, Search, UserPlus, X, User, Plus, Wallet } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { SuccessCheckmark } from "@/components/success-checkmark";
import { useTranslations } from "next-intl";
import type { GroupTemplate, UserSearchResult } from "@/lib/types";

export default function CreateGroupPage() {
  const t = useTranslations("groups");
  const tc = useTranslations("common");
  const { group, user } = useServices();
  const { user: currentUser } = useAuth();
  const { userCurrency } = useCurrencyDisplay();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState<GroupTemplate>("casual");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserSearchResult[]>([]);
  const [offlineMembers, setOfflineMembers] = useState<string[]>([]);
  const [offlineName, setOfflineName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (debouncedQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const results = await user.searchUsers(debouncedQuery);
        if (!cancelled) {
          setSearchResults(results.filter((r) => !selectedMembers.some((m) => m.uid === r.uid)));
        }
      } catch {
        if (!cancelled) setSearchResults([]);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery, selectedMembers, user]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 1) {
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
      const budgetNum = monthlyBudget.trim() ? parseFloat(monthlyBudget) : undefined;
      // The creator's default currency becomes the group's permanent currency.
      const groupBudget = budgetNum && budgetNum > 0 ? budgetNum : undefined;
      const result = await group.createGroup(name, description, template, selectedMembers.map((m) => m.uid), groupBudget);
      for (const offlineName of offlineMembers) {
        await group.addOfflineMember(result.groupId, offlineName);
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setCreatedGroupId(result.groupId);
      setShowSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("create.failedToCreate"));
      setCreating(false);
    }
  };

  const templates = [
    { id: "trip" as GroupTemplate, label: t("templates.trip"), icon: Plane, desc: t("templates.tripDesc") },
    { id: "turf" as GroupTemplate, label: t("templates.turf"), icon: Dumbbell, desc: t("templates.turfDesc") },
    { id: "casual" as GroupTemplate, label: t("templates.casual"), icon: Coffee, desc: t("templates.casualDesc") },
    { id: "household" as GroupTemplate, label: t("templates.household"), icon: Home, desc: t("templates.householdDesc") },
  ];

  // Navigate after success animation
  useEffect(() => {
    if (showSuccess && createdGroupId) {
      const timer = setTimeout(() => router.push(`/groups/${createdGroupId}`), 800);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, createdGroupId, router]);

  if (showSuccess) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <SuccessCheckmark visible={showSuccess} size={80} />
        <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{t("create.groupCreated")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">{t("create.title")}</h1>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{t("create.chooseTemplate")}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {templates.map((t) => {
              const isHousehold = t.id === "household";
              const activeColor = isHousehold
                ? "border-teal-500 dark:border-teal-500 bg-teal-50 dark:bg-teal-900/30"
                : "border-trevio-500 dark:border-trevio-500 bg-trevio-50 dark:bg-trevio-900/30";
              const activeIcon = isHousehold ? "text-teal-600 dark:text-teal-400" : "text-trevio-600 dark:text-trevio-400";
              const activeText = isHousehold ? "text-teal-700 dark:text-teal-300" : "text-trevio-700 dark:text-trevio-300";
              return (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 transition ${
                    template === t.id ? activeColor : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <t.icon className={`h-7 w-7 ${template === t.id ? activeIcon : "text-slate-400 dark:text-slate-500"}`} />
                  <span className={`text-sm font-medium ${template === t.id ? activeText : "text-slate-600 dark:text-slate-400"}`}>{t.label}</span>
                  <span className={`text-xs text-center ${template === t.id ? (isHousehold ? "text-teal-600/70 dark:text-teal-400/70" : "text-trevio-600/70 dark:text-trevio-400/70") : "text-slate-400 dark:text-slate-500"}`}>{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("create.groupName")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("create.groupNamePlaceholder")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("create.description")}</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("create.descriptionPlaceholder")}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none focus:ring-1 focus:ring-trevio-500"
          />
        </div>

        {template === "household" && (
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              <Wallet className="h-4 w-4 text-teal-500" />
              {t("create.monthlyBudget")}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
                {getCurrencySymbol(userCurrency)}
              </span>
              <input
                type="number"
                min="0"
                step="1"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={t("create.monthlyBudgetPlaceholder")}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 pl-8 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t("create.monthlyBudgetHint", { currency: userCurrency })}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("create.addMembers")}</label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{t("create.addMembersHint")}</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t("create.searchUsers")}
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
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.displayName}{u.uid === currentUser?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">{t("create.youLabel")}</span>}</p>
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
                {t("create.addAsOffline", { name: searchQuery })}
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
                placeholder={t("create.offlineMemberName")}
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
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t("create.membersAdded", { count: selectedMembers.length + offlineMembers.length })}</p>
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((u) => (
                  <div key={u.uid} className="flex items-center gap-2 rounded-full bg-trevio-50 dark:bg-trevio-900/30 border border-trevio-200 dark:border-trevio-700 pl-1.5 pr-1 py-1">
                    <Avatar photoURL={u.photoURL} displayName={u.displayName} className="h-6 w-6" textClassName="text-xs" />
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{u.displayName}{u.uid === currentUser?.uid && <span className="ml-1 text-xs text-trevio-600 dark:text-trevio-400">{t("create.youLabel")}</span>}</span>
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
          {creating ? t("create.creating") : t("create.createButton")}
        </button>
      </div>
    </div>
  );
}
