import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { getCountryByCode } from "./constants/countries";

// Re-export country constants and helpers for backward compatibility
// — existing imports use `from "@/lib/utils"`
export { COUNTRY_CODES, getCountryByCode, getCurrencyForCountry, getTimezoneForCountry } from "./constants/countries";
export type { CountryInfo } from "./constants/countries";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const UPI_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9]{2,64}$/;

export function validateUpiId(upiId: string): { valid: boolean; error?: string } {
  if (!upiId) return { valid: false, error: "UPI ID is required" };
  if (!upiId.includes("@")) return { valid: false, error: "UPI ID must contain @" };
  if (!UPI_REGEX.test(upiId)) return { valid: false, error: "Enter a valid UPI ID (e.g., name@okhdfcbank)" };
  return { valid: true };
}

/**
 * Validates a phone number against the selected country's format.
 * Uses libphonenumber-js for robust international validation.
 * Falls back to digit-length check if parsing fails.
 */
export function validatePhoneNumber(phone: string, countryCode: string): { valid: boolean; error?: string } {
  if (!phone) return { valid: false, error: "Mobile number is required" };
  const country = getCountryByCode(countryCode);
  const digits = phone.replace(/\D/g, "");

  // Try libphonenumber-js for proper validation
  try {
    const parsed = parsePhoneNumberFromString(digits, country.code as any);
    if (parsed) {
      if (parsed.isValid()) return { valid: true };
      // If not valid per libphonenumber, fall through to length check
    }
  } catch {
    // Fall through to length check
  }

  // Fallback: check digit length matches expected for country
  if (digits.length !== country.phoneLength) {
    return { valid: false, error: `Enter a valid ${country.phoneLength}-digit mobile number` };
  }
  return { valid: true };
}

export function buildUpiVpa(upiId: string, phoneNumber: string, countryCode: string): string | null {
  // UPI is India-specific — don't build VPA for other countries
  // even if the user has a UPI ID set (e.g. they changed country after setting one).
  const country = getCountryByCode(countryCode);
  if (country.code !== "IN") return null;
  if (upiId) return upiId;
  if (phoneNumber) {
    return `${phoneNumber}@paytm`;
  }
  return null;
}
