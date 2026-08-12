"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, Check, Search } from "lucide-react";
import { COUNTRY_CODES, getCountryByCode, type CountryInfo } from "@/lib/constants/countries";

interface CountryPhoneInputProps {
  countryCode: string;
  onCountryChange: (code: string) => void;
  phoneNumber: string;
  onPhoneChange: (phone: string) => void;
  onPhoneBlur?: () => void;
  touched?: boolean;
  showValidation?: boolean;
  validation?: { valid: boolean; error?: string };
  label?: string;
  required?: boolean;
  hint?: string;
  autoFocus?: boolean;
}

/**
 * Shared country code + phone number input with searchable dropdown.
 * Replaces the duplicated country dropdowns in profile and phone-setup-dialog.
 */
export function CountryPhoneInput({
  countryCode,
  onCountryChange,
  phoneNumber,
  onPhoneChange,
  onPhoneBlur,
  touched,
  showValidation = true,
  validation,
  label,
  required,
  hint,
  autoFocus,
}: CountryPhoneInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [search, setSearch] = useState("");
  const t = useTranslations("common");

  const country = getCountryByCode(countryCode);
  const filtered = search
    ? COUNTRY_CODES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.dialCode.includes(search)
      )
    : COUNTRY_CODES;

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="flex gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex h-[46px] items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <span className="text-lg">{country.flag}</span>
            <span>{country.dialCode}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {showDropdown && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowDropdown(false)} />
              <div className="absolute top-full left-0 z-30 mt-1 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg max-h-72 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('searchCountry')}
                      className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="overflow-y-auto">
                  {filtered.map((c: CountryInfo) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        onCountryChange(c.code);
                        setShowDropdown(false);
                        setSearch("");
                      }}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        c.code === countryCode
                          ? "bg-trevio-50 dark:bg-trevio-900/30 text-trevio-700 dark:text-trevio-300"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-slate-400 dark:text-slate-500">{c.dialCode}</span>
                    </button>
                  ))}
                  {filtered.length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-slate-400">{t('noCountriesFound')}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, "").slice(0, country.phoneLength))}
          onBlur={onPhoneBlur}
          placeholder={t('phonePlaceholder', { phoneLength: country.phoneLength })}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-trevio-500 focus:outline-none"
          autoFocus={autoFocus}
        />
      </div>
      {showValidation && touched && validation && !validation.valid && (
        <p className="text-sm text-red-500 dark:text-red-400">{validation.error}</p>
      )}
      {showValidation && validation?.valid && phoneNumber && (
        <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
          <Check className="h-4 w-4" />
          {t('validNumber', { phoneLength: country.phoneLength })}
        </p>
      )}
      {hint && <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}
