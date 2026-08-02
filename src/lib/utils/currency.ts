import type { ExchangeRates } from "../services/interfaces/exchange-rate-service";

const CURRENCY_LOCALE_MAP: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  JPY: "ja-JP",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
  AED: "ar-AE",
  SAR: "ar-SA",
  PKR: "ur-PK",
  BDT: "bn-BD",
  LKR: "en-LK",
  NPR: "ne-NP",
  ZAR: "en-ZA",
  NGN: "en-NG",
  KES: "sw-KE",
};

export function getLocaleForCurrency(currency: string): string {
  return CURRENCY_LOCALE_MAP[currency] || "en-US";
}

export function formatDate(
  timestamp: number,
  currency: string,
  includeTime: boolean = false
): string {
  if (!timestamp) return "";
  const locale = getLocaleForCurrency(currency);
  const date = new Date(timestamp);
  if (includeTime) {
    return date.toLocaleString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function convertFromBase(
  amountInBase: number,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (toCurrency === "INR") return amountInBase;
  const rate = rates[toCurrency];
  if (!rate) return amountInBase;
  return Math.round((amountInBase * rate) * 100) / 100;
}

export function getRateToBase(
  currency: string,
  rates: Record<string, number>
): number {
  if (currency === "INR") return 1;
  const rate = rates[currency];
  if (!rate) return 1;
  return 1 / rate;
}

export function formatCurrencySymbol(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    JPY: "¥",
    AUD: "A$",
    CAD: "C$",
    SGD: "S$",
    AED: "د.إ",
    SAR: "﷼",
    PKR: "₨",
    BDT: "৳",
    LKR: "₨",
    NPR: "₨",
    ZAR: "R",
    NGN: "₦",
    KES: "KSh",
  };
  const symbol = symbols[currency] || "";
  return `${symbol}${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
