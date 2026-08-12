import type { ExchangeRates } from "../services/interfaces/exchange-rate-service";
import {
  BASE_CURRENCY,
  CURRENCY_LOCALE_MAP,
  CURRENCY_SYMBOLS,
  SUPPORTED_CURRENCIES,
} from "../constants/currency";

// Re-export for backward compatibility — existing imports use `from "@/lib/utils/currency"`
export { BASE_CURRENCY, CURRENCY_SYMBOLS, SUPPORTED_CURRENCIES } from "../constants/currency";

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
  if (toCurrency === BASE_CURRENCY) return amountInBase;
  const rate = rates[toCurrency];
  if (!rate) return amountInBase;
  return Math.round((amountInBase * rate) * 100) / 100;
}

export function getRateToBase(
  currency: string,
  rates: Record<string, number>
): number {
  if (currency === BASE_CURRENCY) return 1;
  const rate = rates[currency];
  if (!rate) return 1;
  return 1 / rate;
}

/**
 * Converts an amount from one currency to another using the current exchange rates.
 * Rates are stored as: 1 INR = X currency (e.g., 1 INR = 0.012 USD).
 * To convert from currency A to currency B:
 *   amountInINR = amount / rateA   (A → INR)
 *   amountB = amountInINR * rateB  (INR → B)
 *   = amount * rateB / rateA
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = rates[fromCurrency];
  const toRate = rates[toCurrency];
  if (!fromRate || !toRate) {
    // Fallback: try converting through base (INR)
    const fromToBase = getRateToBase(fromCurrency, rates);
    const toToBase = getRateToBase(toCurrency, rates);
    if (fromToBase === 0 || toToBase === 0) return amount;
    return Math.round((amount * fromToBase / toToBase) * 100) / 100;
  }
  return Math.round((amount * (toRate / fromRate)) * 100) / 100;
}

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || "";
}

export function formatCurrencySymbol(amount: number, currency: string = BASE_CURRENCY): string {
  const symbol = getCurrencySymbol(currency);
  const locale = getLocaleForCurrency(currency);
  return `${symbol}${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
