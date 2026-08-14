"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";
import { Bell, Plus, X, Save, Clock, Globe } from "lucide-react";
import { CardSkeleton } from "@/components/skeleton";
import { cn } from "@/lib/utils";

interface FeaturedMessage {
  title?: string;
  body: string;
  startAt: number;
  endAt: number;
}

interface ReminderConfig {
  enabled: boolean;
  featuredMessage: FeaturedMessage | null;
  defaultLocalTime: string;
  timezoneOverrides: Record<string, string>;
  updatedAt: number;
}

export function RemindersTab() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<ReminderConfig>({
    enabled: true,
    featuredMessage: null,
    defaultLocalTime: "20:00",
    timezoneOverrides: {},
    updatedAt: 0,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Featured message form state
  const [featuredTitle, setFeaturedTitle] = useState("");
  const [featuredBody, setFeaturedBody] = useState("");

  // Add override dialog state
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [newTimezone, setNewTimezone] = useState("");
  const [newTime, setNewTime] = useState("20:00");

  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const docRef = doc(db, "config", "dailyReminder");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const featured = data.featuredMessage
          ? {
              title: data.featuredMessage.title || "",
              body: data.featuredMessage.body || "",
              startAt: data.featuredMessage.startAt || 0,
              endAt: data.featuredMessage.endAt || 0,
            }
          : null;
        setConfig({
          enabled: data.enabled ?? true,
          featuredMessage: featured,
          defaultLocalTime: data.defaultLocalTime || "20:00",
          timezoneOverrides: data.timezoneOverrides || {},
          updatedAt: data.updatedAt || 0,
        });
        if (featured) {
          setFeaturedTitle(featured.title || "");
          setFeaturedBody(featured.body || "");
        }
      }
    } catch (error) {
      console.error("Failed to load reminder config:", error);
      setMessage("Failed to load configuration");
      setIsSuccess(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const saveConfig = useCallback(
    async (updates?: Partial<ReminderConfig>) => {
      setIsSaving(true);
      setMessage(null);
      setIsSuccess(false);
      try {
        const configToSave = { ...config, ...updates };
        const data: Record<string, unknown> = {
          enabled: configToSave.enabled,
          defaultLocalTime: configToSave.defaultLocalTime,
          timezoneOverrides: configToSave.timezoneOverrides,
          updatedAt: Date.now(),
        };
        if (configToSave.featuredMessage) {
          data.featuredMessage = {
            title: configToSave.featuredMessage.title || "",
            body: configToSave.featuredMessage.body,
            startAt: configToSave.featuredMessage.startAt,
            endAt: configToSave.featuredMessage.endAt,
          };
        } else {
          // Explicitly delete the featuredMessage field when cleared.
          data.featuredMessage = deleteField();
        }
        await setDoc(doc(db, "config", "dailyReminder"), data, { merge: true });
        setConfig(configToSave);
        setMessage("Saved successfully");
        setIsSuccess(true);
      } catch (error) {
        console.error("Failed to save reminder config:", error);
        setMessage("Failed to save configuration");
        setIsSuccess(false);
      } finally {
        setIsSaving(false);
      }
    },
    [config]
  );

  const handleToggleEnabled = (enabled: boolean) => {
    setConfig((prev) => ({ ...prev, enabled }));
    saveConfig({ enabled });
  };

  const handleAddOverride = () => {
    if (newTimezone.trim() && newTime.trim()) {
      const overrides = { ...config.timezoneOverrides, [newTimezone.trim()]: newTime.trim() };
      setConfig((prev) => ({ ...prev, timezoneOverrides: overrides }));
      setNewTimezone("");
      setNewTime("20:00");
      setShowAddOverride(false);
    }
  };

  const handleRemoveOverride = (timezone: string) => {
    const overrides = { ...config.timezoneOverrides };
    delete overrides[timezone];
    setConfig((prev) => ({ ...prev, timezoneOverrides: overrides }));
  };

  const handleSetFeatured = () => {
    if (featuredBody.trim()) {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const featured: FeaturedMessage = {
        title: featuredTitle.trim() || undefined,
        body: featuredBody.trim(),
        startAt: now,
        endAt: now + dayMs,
      };
      setConfig((prev) => ({ ...prev, featuredMessage: featured }));
    }
  };

  const handleClearFeatured = () => {
    setConfig((prev) => ({ ...prev, featuredMessage: null }));
    setFeaturedTitle("");
    setFeaturedBody("");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={cn(
            "rounded-lg p-3 text-sm",
            isSuccess
              ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
          )}
        >
          {message}
        </div>
      )}

      {/* Kill Switch */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-trevio-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Daily Reminders
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enable or disable daily reminders for all users
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleEnabled(!config.enabled)}
            disabled={isSaving}
            className={cn(
              "relative inline-flex h-6 w-11 items-center rounded-full transition",
              config.enabled ? "bg-trevio-600" : "bg-slate-300 dark:bg-slate-600"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-white transition",
                config.enabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>

      {/* Default Time */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-trevio-600" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Default Evening Time
          </h3>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Used when no timezone-specific override exists (HH:mm format)
        </p>
        <input
          type="text"
          value={config.defaultLocalTime}
          onChange={(e) =>
            setConfig((prev) => ({ ...prev, defaultLocalTime: e.target.value }))
          }
          placeholder="20:00"
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
        />
      </div>

      {/* Timezone Overrides */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-trevio-600" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Timezone Overrides
            </h3>
          </div>
          <button
            onClick={() => setShowAddOverride(true)}
            className="flex items-center gap-1 rounded-lg bg-trevio-50 px-3 py-1.5 text-xs font-medium text-trevio-700 hover:bg-trevio-100 dark:bg-trevio-900/20 dark:text-trevio-400"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Set different evening times for specific timezones
        </p>
        <div className="mt-3 space-y-2">
          {Object.keys(config.timezoneOverrides).length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
              No overrides set. All users use the default time.
            </p>
          ) : (
            Object.entries(config.timezoneOverrides).map(([timezone, time]) => (
              <div
                key={timezone}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-700/50"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {timezone}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{time}</p>
                </div>
                <button
                  onClick={() => handleRemoveOverride(timezone)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Featured Message */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Featured Message (Optional)
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Overrides all client-side messages for a specific period
        </p>
        <div className="mt-3 space-y-3">
          <input
            type="text"
            value={featuredTitle}
            onChange={(e) => setFeaturedTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <textarea
            value={featuredBody}
            onChange={(e) => setFeaturedBody(e.target.value)}
            placeholder="Message body..."
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSetFeatured}
              className="flex-1 rounded-lg border border-trevio-300 px-3 py-2 text-xs font-medium text-trevio-700 hover:bg-trevio-50 dark:border-trevio-700 dark:text-trevio-400"
            >
              Set 24h from now
            </button>
            <button
              onClick={handleClearFeatured}
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={() => saveConfig()}
        disabled={isSaving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-trevio-600 px-4 py-3 text-sm font-semibold text-white hover:bg-trevio-700 disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {isSaving ? "Saving..." : "Save Configuration"}
      </button>

      {/* Add Override Dialog */}
      {showAddOverride && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 dark:bg-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Add Timezone Override
            </h3>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={newTimezone}
                onChange={(e) => setNewTimezone(e.target.value)}
                placeholder="Timezone (e.g. America/New_York)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="Time (HH:mm)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowAddOverride(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleAddOverride}
                className="rounded-lg bg-trevio-600 px-4 py-2 text-sm font-semibold text-white hover:bg-trevio-700"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
