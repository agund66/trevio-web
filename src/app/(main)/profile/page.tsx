"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import { Edit3, Check, Trash2, AlertTriangle, Plus, Wallet, Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemeMode } from "@/lib/hooks/use-theme";
import { Avatar } from "@/components/avatar";
import { CountryPhoneInput } from "@/components/country-phone-input";
import { getCountryByCode, getCurrencyForCountry, getTimezoneForCountry, validateUpiId, validatePhoneNumber } from "@/lib/utils";
import { getCurrencySymbol } from "@/lib/utils/currency";
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants/countries";
import { queryKeys } from "@/lib/constants/query-keys";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { user, signOut, refreshUser } = useAuth();
  const { user: userService } = useServices();
  const { mode, setThemeMode } = useTheme();
  const queryClient = useQueryClient();
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [upiTouched, setUpiTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const startEdit = () => {
    setDisplayName(user.displayName);
    setUpiId(user.upiId || "");
    setPhoneNumber(user.phoneNumber || "");
    setCountryCode(user.countryCode || DEFAULT_COUNTRY_CODE);
    setUpiTouched(false);
    setPhoneTouched(false);
    setEditing(true);
  };

  const upiValidation = upiId ? validateUpiId(upiId) : { valid: true };
  const phoneValidation = validatePhoneNumber(phoneNumber, countryCode);
  const editCountry = getCountryByCode(countryCode);
  const isIndiaSelected = editCountry.code === "IN";

  const handleCountrySelect = (code: string) => {
    setCountryCode(code);
    setPhoneTouched(false);
  };

  const handleSave = async () => {
    setUpiTouched(true);
    setPhoneTouched(true);
    if (!displayName.trim()) {
      setError(t("validation.displayNameEmpty"));
      return;
    }
    if (!phoneValidation.valid) {
      setError(phoneValidation.error || t("validation.invalidPhone"));
      return;
    }
    if (upiId && !upiValidation.valid) {
      setError(upiValidation.error || t("validation.invalidUpiId"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated: User = {
        ...user,
        displayName,
        defaultCurrency: getCurrencyForCountry(countryCode),
        upiId,
        phoneNumber: phoneNumber.replace(/\D/g, ""),
        countryCode,
        timezone: getTimezoneForCountry(countryCode),
      };
      await userService.updateUser(updated);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: queryKeys.balances });
      queryClient.invalidateQueries({ queryKey: ["publicProfile"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.groups });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("validation.failedToUpdate"));
      setSaving(false);
    }
  };

  const country = getCountryByCode(user.countryCode || DEFAULT_COUNTRY_CODE);
  const hasUpiId = !!(user.upiId && user.upiId.trim());
  const hasPhone = !!(user.phoneNumber && user.phoneNumber.trim());
  const userIsInIndia = country.code === "IN";

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t("title")}</h1>
        {!editing && (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-2 rounded-xl bg-trevio-50 dark:bg-trevio-900/30 px-3 py-2 text-sm font-semibold text-trevio-700 dark:text-trevio-300 transition hover:bg-trevio-100 dark:hover:bg-trevio-900/50"
          >
            <Edit3 className="h-4 w-4" />
            {tc("actions.edit")}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mx-auto max-w-xl space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("fields.displayName")}</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
            />
          </div>

          <div>
            <CountryPhoneInput
              countryCode={countryCode}
              onCountryChange={handleCountrySelect}
              phoneNumber={phoneNumber}
              onPhoneChange={(v) => { setPhoneNumber(v); setPhoneTouched(false); }}
              onPhoneBlur={() => setPhoneTouched(true)}
              touched={phoneTouched}
              validation={phoneValidation}
              label={t("fields.mobileNumber")}
              required
              hint={`${isIndiaSelected ? t("payment.mobileUsedForUpi") + " · " : ""}${t("fields.countryHint", { currency: getCurrencyForCountry(countryCode), timezone: getTimezoneForCountry(countryCode) })}`}
            />
          </div>

          {isIndiaSelected && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t("fields.upiIdOptional")}</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => {
                  setUpiId(e.target.value);
                  setUpiTouched(false);
                }}
                onBlur={() => setUpiTouched(true)}
                placeholder={t("upi.placeholder")}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
              />
              {upiTouched && upiId && !upiValidation.valid && (
                <p className="mt-1.5 text-sm text-red-500">{upiValidation.error}</p>
              )}
              {upiTouched && upiId && upiValidation.valid && (
                <p className="mt-1.5 flex items-center gap-1.5 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  {t("upi.validFormat")}
                </p>
              )}
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{t("payment.upiPriority")}</p>
            </div>
          )}

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-3 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {tc("actions.cancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !phoneValidation.valid || !displayName.trim()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              {saving ? tc("actions.saving") : tc("actions.save")}
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
                <span className="text-sm font-semibold text-trevio-700 dark:text-trevio-300">{t("payment.title")}</span>
              </div>
              {userIsInIndia && hasUpiId ? (
                <>
                  <p className="text-sm text-trevio-600 dark:text-trevio-400">{user.upiId}</p>
                  <p className="mt-1 text-xs text-trevio-400 dark:text-trevio-500">{t("payment.payViaUpiId")}</p>
                </>
              ) : hasPhone ? (
                <>
                  <p className="text-sm text-trevio-600 dark:text-trevio-400">{country.dialCode} {user.phoneNumber}</p>
                  <p className="mt-1 text-xs text-trevio-400 dark:text-trevio-500">{t("payment.payViaMobile")}</p>
                </>
              ) : (
                <>
                  <p className="text-sm text-trevio-600 dark:text-trevio-400">{t("payment.noPaymentInfo")}</p>
                  <button
                    onClick={startEdit}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-trevio-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-trevio-700"
                  >
                    <Plus className="h-3 w-3" />
                    {t("payment.setUpPaymentInfo")}
                  </button>
                </>
              )}
            </div>

            {/* Appearance */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{tc("theme.appearance")}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "light", label: tc("theme.light"), icon: Sun },
                  { value: "dark", label: tc("theme.dark"), icon: Moon },
                  { value: "system", label: tc("theme.system"), icon: Monitor },
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

          {/* Right column — actions */}
          <div className="space-y-4">
            {/* Profile info rows */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
              <ProfileRow label={t("fields.username")} value={`@${user.username}`} />
              <ProfileRow label={t("fields.email")} value={user.email} />
              <ProfileRow label={t("fields.defaultCurrency")} value={`${getCurrencySymbol(user.defaultCurrency)} ${user.defaultCurrency}`} />
              <ProfileRow
                label={t("fields.mobileNumber")}
                value={hasPhone ? `${country.dialCode} ${user.phoneNumber}` : tc("status.notSet")}
                isNotSet={!hasPhone}
                action={!hasPhone ? { label: tc("actions.add"), onClick: startEdit } : undefined}
              />
              {userIsInIndia && (
                <ProfileRow
                  label={t("fields.upiId")}
                  value={hasUpiId ? user.upiId! : tc("status.notSet")}
                  isNotSet={!hasUpiId}
                  action={!hasUpiId ? { label: tc("actions.add"), onClick: startEdit } : undefined}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-200 dark:border-red-800 py-3 text-sm font-semibold text-red-600 dark:text-red-400 transition hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4" />
                {t("deleteAccount.button")}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("deleteAccount.title")}</h2>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              {t("deleteAccount.confirm")}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                {tc("actions.cancel")}
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
                {deleting ? t("deleteAccount.deleting") : t("deleteAccount.button")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ label, value, isNotSet, action }: { label: string; value: string; isNotSet?: boolean; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isNotSet ? "text-slate-400 dark:text-slate-500" : "text-slate-900 dark:text-slate-100"}`}>{value}</span>
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
