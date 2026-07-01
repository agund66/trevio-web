import type { ExchangeRates } from "../services/interfaces/exchange-rate-service";

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

export function convertToBase(
  amount: number,
  fromCurrency: string,
  rates: Record<string, number>
): number {
  if (fromCurrency === "INR") return amount;
  const rate = rates[fromCurrency];
  if (!rate) return amount;
  return Math.round((amount / rate) * 100) / 100;
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

export function formatConvertedAmount(
  amount: number,
  currency: string,
  rates: Record<string, number> | undefined,
  userCurrency: string
): string {
  if (!rates || currency === userCurrency) {
    return formatCurrencySymbol(amount, userCurrency);
  }
  const baseAmount = convertToBase(amount, currency, rates);
  const converted = convertFromBase(baseAmount, userCurrency, rates);
  return formatCurrencySymbol(converted, userCurrency);
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
