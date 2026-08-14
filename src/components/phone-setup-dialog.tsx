"use client";

import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { getCurrencyForCountry, getTimezoneForCountry, validatePhoneNumber } from "@/lib/utils";
import { DEFAULT_COUNTRY_CODE } from "@/lib/constants/countries";
import { CountryPhoneInput } from "@/components/country-phone-input";

interface PhoneSetupDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function PhoneSetupDialog({ open, onComplete }: PhoneSetupDialogProps) {
  const { user: userService } = useServices();
  const { user, refreshUser } = useAuth();
  const t = useTranslations("auth.phoneSetup");
  const tc = useTranslations("common");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open && user) {
      setCountryCode(user.countryCode || DEFAULT_COUNTRY_CODE);
      setPhoneNumber(user.phoneNumber || "");
      setError(null);
      setTouched(false);
    }
  }, [open, user]);

  if (!open) return null;

  const validation = validatePhoneNumber(phoneNumber, countryCode);
  const isIndiaSelected = countryCode === "IN";

  const handleSave = async () => {
    setTouched(true);
    if (!validation.valid) {
      setError(validation.error || tc("errors.somethingWentWrong"));
      return;
    }

    if (!user) {
      setError(t("userSessionExpired"));
      setSaving(false);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await userService.updateUser({
        ...user,
        phoneNumber: phoneNumber.replace(/\D/g, ""),
        countryCode,
        defaultCurrency: getCurrencyForCountry(countryCode),
        timezone: getTimezoneForCountry(countryCode),
      });
      await refreshUser();
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("failedToSave"));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-trevio-50 dark:bg-trevio-900/30">
            <Phone className="h-5 w-5 text-trevio-600 dark:text-trevio-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("title")}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {isIndiaSelected ? t("subtitle") : t("subtitleGeneric")}
            </p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {isIndiaSelected ? t("description") : t("descriptionGeneric")}
          </p>

          <CountryPhoneInput
            countryCode={countryCode}
            onCountryChange={(code) => { setCountryCode(code); setTouched(false); }}
            phoneNumber={phoneNumber}
            onPhoneChange={setPhoneNumber}
            onPhoneBlur={() => setTouched(true)}
            touched={touched}
            validation={validation}
            label={t("mobileNumber")}
            autoFocus
          />

          {error && <p className="text-sm text-red-500 dark:text-red-400">{error}</p>}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 px-6 py-4">
          <button
            onClick={handleSave}
            disabled={!validation.valid || saving}
            className="w-full rounded-xl bg-trevio-600 py-3.5 text-sm font-semibold text-white transition hover:bg-trevio-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? tc("actions.saving") : tc("actions.continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
