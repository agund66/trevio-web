"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { useServices } from "@/lib/services/service-provider";
import { Edit3, Check, X, FileText, Phone, ChevronDown, Smartphone } from "lucide-react";
import { TermsDialog } from "@/components/terms-dialog";
import { COUNTRY_CODES, getCountryByCode, validateUpiId, validatePhoneNumber, buildUpiVpa } from "@/lib/utils";
import type { User } from "@/lib/types";

export default function ProfilePage() {
  const { user, signOut, refreshUser } = useAuth();
  const { user: userService } = useServices();
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
  const country = getCountryByCode(countryCode);

  const handleSave = async () => {
    setUpiTouched(true);
    setPhoneTouched(true);
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
      setEditing(false);
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

  const paymentVpa = buildUpiVpa(user.upiId || "", user.phoneNumber || "", user.countryCode || "IN");

  return (
    <div className="mx-auto max-w-md p-4 md:p-6">
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
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
                          setPhoneTouched(false);
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
                  setPhoneTouched(false);
                }}
                onBlur={() => setPhoneTouched(true)}
                placeholder={`${country.phoneLength}-digit number`}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none"
              />
            </div>
            {phoneTouched && !phoneValidation.valid && (
              <p className="mt-1.5 text-sm text-red-500">{phoneValidation.error}</p>
            )}
            {phoneValidation.valid && phoneNumber && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-green-600">
                <Check className="h-4 w-4" />
                Valid {country.phoneLength}-digit number
              </p>
            )}
            <p className="mt-1.5 text-xs text-slate-400">Used for UPI payments. Friends can pay you using this number.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">UPI ID (optional)</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => {
                setUpiId(e.target.value);
                setUpiTouched(false);
              }}
              onBlur={() => setUpiTouched(true)}
              placeholder="yourname@okhdfcbank"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-trevio-500 focus:outline-none"
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
            <p className="mt-1.5 text-xs text-slate-400">If set, payments will use UPI ID first. Otherwise, your mobile number is used.</p>
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
              disabled={saving || !phoneValidation.valid}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-trevio-600 py-3 text-sm font-semibold text-white transition hover:bg-trevio-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="h-4 w-4" />
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            <ProfileRow label="Username" value={`@${user.username}`} />
            <ProfileRow label="Email" value={user.email} />
            <ProfileRow label="Currency" value={user.defaultCurrency} />
            {user.phoneNumber && (
              <ProfileRow
                label="Mobile"
                value={`${getCountryByCode(user.countryCode || "IN").dialCode} ${user.phoneNumber}`}
              />
            )}
            {user.upiId && <ProfileRow label="UPI ID" value={user.upiId} />}
          </div>

          {paymentVpa && (
            <div className="rounded-2xl border border-trevio-200 bg-trevio-50 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="h-4 w-4 text-trevio-600" />
                <span className="text-sm font-semibold text-trevio-700">Payment Address</span>
              </div>
              <p className="text-sm text-trevio-600">{paymentVpa}</p>
              <p className="mt-1 text-xs text-trevio-400">
                {user.upiId ? "Using UPI ID" : "Using mobile number (UPI ID not set)"}
              </p>
            </div>
          )}

          <button
            onClick={() => setShowTerms(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FileText className="h-4 w-4" />
            Terms & Conditions
          </button>
        </div>
      )}

      <TermsDialog
        open={showTerms}
        onClose={() => setShowTerms(false)}
      />
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
