"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import { Edit3, Check, X, FileText, Phone, ChevronDown, Smartphone, Search, Trash2, AlertTriangle, Plus, Wallet, Sun, Moon, Monitor, LogOut, LifeBuoy } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/hooks/use-theme";
import { TermsDialog } from "@/components/terms-dialog";
import { Avatar } from "@/components/avatar";
import { COUNTRY_CODES, getCountryByCode, validateUpiId, validatePhoneNumber } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/currency";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { user, signOut, refreshUser } = useAuth();
  const { user: userService } = useServices();
  const { mode, setThemeMode } = useTheme();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("INR");
  const [upiId, setUpiId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("IN");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [upiTouched, setUpiTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const startEdit = () => {
    setDisplayName(user.displayName);
    setDefaultCurrency(user.defaultCurrency);
    setUpiId(user.upiId || "");
    setPhoneNumber(user.phoneNumber || "");
    setCountryCode(user.countryCode || "IN");
    setUpiTouched(false);
    setPhoneTouched(false);
    setEditing(true);
  };

  const upiValidation = upiId ? validateUpiId(upiId) : { valid: true };
  const phoneValidation = validatePhoneNumber(phoneNumber, countryCode);
  const editCountry = getCountryByCode(countryCode);

  const handleSave = async () => {
    setUpiTouched(true);
    setPhoneTouched(true);
    if (!displayName.trim()) {
      setError("Display name cannot be empty");
      return;
    }
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || "Invalid phone number");
      return;
    }
    if (upiId && !upiValidation.valid) {
      setError(upiValidation.error || "Invalid UPI ID");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated: User = {
        ...user,
        displayName,
        defaultCurrency,
        upiId,
        phoneNumber: phoneNumber.replace(/\D/g, ""),
        countryCode,
      };
      await userService.updateUser(updated);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ["balances"] });
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update profile");
      setSaving(false);
    }
  };

  const currencies = SUPPORTED_CURRENCIES;

  const country = getCountryByCode(user.countryCode || "IN");
  const hasUpiId = !!(user.upiId && user.upiId.trim());
  const hasPhone = !!(user.phoneNumber && user.phoneNumber.trim());

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile</h1>
        {!editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-50 dark:bg-trevio-900/30 px-3 py-2 text-sm font-semibold text-trevio-700 dark:text-trevio-300 transition hover:bg-trevio-100 dark:hover:bg-trevio-900/50"
          >
            <Edit3 className="h-4 w-4" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="mx-auto max-w-xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Default Currency</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none"
              >
                <span className="flex items-center gap-2">
                  <span className="text-lg font-semibold text-trevio-600 dark:text-trevio-400">
                    {currencies.find((c) => c.code === defaultCurrency)?.symbol}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{defaultCurrency}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {currencies.find((c) => c.code === defaultCurrency)?.name}
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showCurrencyDropdown ? "rotate-180" : ""}`} />
              </button>
              {showCurrencyDropdown && (
                <div className="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-64 overflow-hidden flex flex-col">
                  <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={currencySearch}
                        onChange={(e) => setCurrencySearch(e.target.value)}
                        placeholder="Search currency..."
                        className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto">
                    {currencies
                      .filter((c) =>
                        c.code.toLowerCase().includes(currencySearch.toLowerCase()) ||
                        c.name.toLowerCase().includes(currencySearch.toLowerCase())
                      )
                      .map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setDefaultCurrency(c.code);
                            setShowCurrencyDropdown(false);
                            setCurrencySearch("");
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            defaultCurrency === c.code ? "bg-trevio-50 dark:bg-trevio-900/30 text-trevio-700 dark:text-trevio-300" : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <span className="text-lg font-semibold w-6 text-center">{c.symbol}</span>
                          <span className="font-medium w-12">{c.code}</span>
                          <span className="text-slate-500 dark:text-slate-400">{c.name}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex h-[46px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span className="text-lg">{editCountry.flag}</span>
                  <span>{editCountry.dialCode}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {showCountryDropdown && (
                  <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-60 overflow-y-auto">
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setCountryCode(c.code);
                          setShowCountryDropdown(false);
                          setPhoneTouched(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                          c.code === countryCode ? "bg-trevio-50 dark:bg-trevio-900/30 text-trevio-700 dark:text-trevio-300" : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="flex-1">{c.name}</span>
                        <span className="text-slate-400 dark:text-slate-500">{c.dialCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, editCountry.phoneLength));
                  setPhoneTouched(false);
                }}
                onBlur={() => setPhoneTouched(true)}
                placeholder={`${editCountry.phoneLength}-digit number`}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
              />
            </div>
            {phoneTouched && !phoneValidation.valid && (
              <p className="mt-1.5 text-sm text-red-500">{phoneValidation.error}</p>
            )}
            {phoneValidation.valid && phoneNumber && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Valid {editCountry.phoneLength}-digit number
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">Used for UPI payments. Friends can pay you using this number.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">UPI ID (optional)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => {
                setUpiId(e.target.value);
                setUpiTouched(false);
              }}
              onBlur={() => setUpiTouched(true)}
              placeholder="yourname@okhdfcbank"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
            {upiTouched && upiId && !upiValidation.valid && (
              <p className="mt-1.5 text-sm text-red-500">{upiValidation.error}</p>
            )}
            {upiTouched && upiId && upiValidation.valid && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Valid UPI ID format
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">If set, payments will use UPI ID first. Otherwise, your mobile number is used.</p>
          </div>

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !phoneValidation.valid || !displayName.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left column — identity & settings */}
          <div className="space-y-4">
            <div className="flex flex-col items-center rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
              <Avatar photoURL={user.photoURL} displayName={user.displayName} className="h-24 w-24" textClassName="text-3xl" />
              <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">{user.displayName}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">@{user.username}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
            </div>

            {/* Payment info card */}
            <div className="rounded-2xl border border-trevio-200 dark:border-trevio-700 bg-trevio-50 dark:bg-trevio-900/20 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-trevio-600 dark:text-trevio-400" />
                <span className="text-sm font-semibold text-trevio-700 dark:text-trevio-300">Payment Info</span>
              </div>
              {hasUpiId ? (
                <>
                  <p className="text-sm text-trevio-600 dark:text-trevio-400">{user.upiId}</p>
                  <p className="mt-1 text-xs text-trevio-400 dark:text-trevio-500">Friends can pay you via UPI ID</p>
                </>
              ) : hasPhone ? (
                <>
                  <p className="text-sm text-trevio-600 dark:text-trevio-400">{country.dialCode} {user.phoneNumber}</p>
                  <p className="mt-1 text-xs text-trevio-400 dark:text-trevio-500">Friends can pay you via mobile number</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-trevio-600 dark:text-trevio-400">No payment info set</p>
                  <button
                    onClick={startEdit}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-trevio-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-trevio-700"
                  >
                    <Plus className="h-3 w-3" />
                    Set up payment info
                  </button>
                </>
              )}
            </div>

            {/* Appearance */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Appearance</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "light", label: "Light", icon: Sun },
                  { value: "dark", label: "Dark", icon: Moon },
                  { value: "system", label: "Device", icon: Monitor },
                ] as { value: ThemeMode; label: string; icon: typeof Sun }[]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setThemeMode(opt.value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-medium transition ${
                      mode === opt.value
                        ? "border-trevio-500 bg-trevio-50 dark:bg-trevio-900/30 text-trevio-700 dark:text-trevio-300"
                        : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40"
                    }`}
                  >
                    <opt.icon className="h-5 w-5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — details & actions */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
              <ProfileRow label="Username" value={`@${user.username}`} />
              <ProfileRow label="Email" value={user.email} />
              <ProfileRow label="Currency" value={`${currencies.find((c) => c.code === user.defaultCurrency)?.symbol || ""} ${user.defaultCurrency}`} />
              <ProfileRow
                label="Mobile"
                value={hasPhone ? `${country.dialCode} ${user.phoneNumber}` : "Not set"}
                action={!hasPhone ? { label: "Add", onClick: startEdit } : undefined}
              />
              <ProfileRow
                label="UPI ID"
                value={hasUpiId ? user.upiId! : "Not set"}
                action={!hasUpiId ? { label: "Add", onClick: startEdit } : undefined}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowTerms(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <FileText className="h-4 w-4" />
                Terms
              </button>

              <Link
                href="/support"
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <LifeBuoy className="h-4 w-4" />
                Help & Support
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800 py-3 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>

              <button
                onClick={signOut}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 md:hidden"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      <TermsDialog
        open={showTerms}
        onClose={() => setShowTerms(false)}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Account?</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              This will permanently delete your account, remove you from all groups, and erase your data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await userService.deleteAccount();
                    await signOut();
                  } catch (e) {
                    setError((e as Error).message);
                    setDeleting(false);
                    setShowDeleteConfirm(false);
                  }
                }}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ label, value, action }: { label: string; value: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${value === "Not set" ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>{value}</span>
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-1 rounded-lg bg-trevio-50 dark:bg-trevio-900/30 px-2 py-1 text-xs font-semibold text-trevio-700 dark:text-trevio-300 transition hover:bg-trevio-100 dark:hover:bg-trevio-900/50"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
