"use client";

import { useState, useEffect } from "react";
import { Phone, Check, ChevronDown } from "lucide-react";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { COUNTRY_CODES, getCountryByCode, validatePhoneNumber } from "@/lib/utils";

interface PhoneSetupDialogProps {
  open: boolean;
  onComplete: () => void;
}

export function PhoneSetupDialog({ open, onComplete }: PhoneSetupDialogProps) {
  const { user: userService } = useServices();
  const { user, refreshUser } = useAuth();
  const [countryCode, setCountryCode] = useState("IN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open && user) {
      setCountryCode(user.countryCode || "IN");
      setPhoneNumber(user.phoneNumber || "");
      setError(null);
      setTouched(false);
    }
  }, [open, user]);

  if (!open) return null;

  const country = getCountryByCode(countryCode);
  const validation = validatePhoneNumber(phoneNumber, countryCode);

  const handleSave = async () => {
    setTouched(true);
    if (!validation.valid) {
      setError(validation.error || "Invalid phone number");
      return;
    }

    if (!user) {
      setError("User session expired. Please sign in again.");
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
      });
      await refreshUser();
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save phone number");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-trevio-50">
            <Phone className="h-5 w-5 text-trevio-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Mobile Number</h2>
            <p className="text-sm text-slate-500">Required for UPI payments</p>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600">
            Your mobile number is used so friends can pay you via UPI directly from their payment app. It&apos;s also used as a fallback when you don&apos;t have a UPI ID set.
          </p>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Mobile Number</label>
            <div className="flex gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex h-[46px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <span className="text-lg">{country.flag}</span>
                  <span>{country.dialCode}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                </button>
                {showCountryDropdown && (
                  <div className="absolute top-full left-0 z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white shadow-lg max-h-60 overflow-y-auto">
                    {COUNTRY_CODES.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setCountryCode(c.code);
                          setShowCountryDropdown(false);
                          setTouched(false);
                        }}
                        className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 ${
                          c.code === countryCode ? "bg-trevio-50 text-trevio-700" : "text-slate-700"
                        }`}
                      >
                        <span className="text-lg">{c.flag}</span>
                        <span className="flex-1">{c.name}</span>
                        <span className="text-slate-400">{c.dialCode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, country.phoneLength));
                  setTouched(false);
                }}
                onBlur={() => setTouched(true)}
                placeholder={`${country.phoneLength}-digit number`}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none"
                autoFocus
              />
            </div>
            {touched && !validation.valid && (
              <p className="text-sm text-red-500">{validation.error}</p>
            )}
            {validation.valid && (
              <p className="flex items-center gap-1.5 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Valid {country.phoneLength}-digit number
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="border-t border-slate-200 px-6 py-4">
          <button
            onClick={handleSave}
            disabled={!validation.valid || saving}
            className="w-full rounded-xl bg-trevio-600 py-3.5 text-sm font-semibold text-white transition hover:bg-trevio-700 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
