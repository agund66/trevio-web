import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  const symbol = symbols[currency] || currency;
  return `${symbol}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;

export function validateUpiId(upiId: string): { valid: boolean; error?: string } {
  if (!upiId) return { valid: false, error: "UPI ID is required" };
  if (!upiId.includes("@")) return { valid: false, error: "UPI ID must contain @" };
  if (!UPI_REGEX.test(upiId)) return { valid: false, error: "Enter a valid UPI ID (e.g., name@okhdfcbank)" };
  return { valid: true };
}

export interface CountryInfo {
  code: string;
  dialCode: string;
  name: string;
  flag: string;
  phoneLength: number;
}

export const COUNTRY_CODES: CountryInfo[] = [
  { code: "IN", dialCode: "+91", name: "India", flag: "🇮🇳", phoneLength: 10 },
  { code: "US", dialCode: "+1", name: "United States", flag: "🇺🇸", phoneLength: 10 },
  { code: "GB", dialCode: "+44", name: "United Kingdom", flag: "🇬🇧", phoneLength: 10 },
  { code: "AE", dialCode: "+971", name: "UAE", flag: "🇦🇪", phoneLength: 9 },
  { code: "SG", dialCode: "+65", name: "Singapore", flag: "🇸🇬", phoneLength: 8 },
  { code: "AU", dialCode: "+61", name: "Australia", flag: "🇦🇺", phoneLength: 9 },
  { code: "CA", dialCode: "+1", name: "Canada", flag: "🇨🇦", phoneLength: 10 },
  { code: "JP", dialCode: "+81", name: "Japan", flag: "🇯🇵", phoneLength: 10 },
];

export function getCountryByCode(code: string): CountryInfo {
  return COUNTRY_CODES.find((c) => c.code === code) || COUNTRY_CODES[0];
}

export function validatePhoneNumber(phone: string, countryCode: string): { valid: boolean; error?: string } {
  if (!phone) return { valid: false, error: "Mobile number is required" };
  const country = getCountryByCode(countryCode);
  const digits = phone.replace(/\D/g, "");
  if (digits.length !== country.phoneLength) {
    return { valid: false, error: `Enter a valid ${country.phoneLength}-digit mobile number` };
  }
  return { valid: true };
}

export function buildUpiVpa(upiId: string, phoneNumber: string, countryCode: string): string | null {
  if (upiId) return upiId;
  if (phoneNumber) {
    const country = getCountryByCode(countryCode);
    if (country.code === "IN") return `${phoneNumber}@paytm`;
  }
  return null;
}
