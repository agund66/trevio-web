"use client";

import { useQuery } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { convertCurrency, convertFromBase, formatCurrencySymbol, formatDate } from "@/lib/utils/currency";
import { DEFAULT_CURRENCY, BASE_CURRENCY } from "@/lib/constants/currency";
import { DEFAULT_TIMEZONE } from "@/lib/constants/countries";
import { EXCHANGE_RATE_STALE_TIME } from "@/lib/constants/app";
import { queryKeys } from "@/lib/constants/query-keys";

export function useCurrencyDisplay() {
  const { exchangeRate, user: userService } = useServices();
  const { user: currentUser } = useAuth();

  const { data: rates } = useQuery({
    queryKey: queryKeys.exchangeRates,
    queryFn: () => exchangeRate.getRates(),
    staleTime: EXCHANGE_RATE_STALE_TIME,
  });

  const userCurrency = currentUser?.defaultCurrency || DEFAULT_CURRENCY;
  const userTimezone = currentUser?.timezone || DEFAULT_TIMEZONE;
  const rateMap = rates?.rates;

  const formatBase = (amountInBase: number): string => {
    // When rates aren't loaded yet, the amount is still in base currency (INR),
    // so showing the base currency symbol is the correct representation.
    if (!rateMap) return formatCurrencySymbol(amountInBase, BASE_CURRENCY);
    const converted = convertFromBase(amountInBase, userCurrency, rateMap);
    return formatCurrencySymbol(converted, userCurrency);
  };

  const formatOriginal = (amount: number, currency: string): string => {
    return formatCurrencySymbol(amount, currency);
  };

  const convertBase = (amountInBase: number): number => {
    if (!rateMap) return amountInBase;
    return convertFromBase(amountInBase, userCurrency, rateMap);
  };

  const convertToUserCurrency = (amount: number, fromCurrency: string): number => {
    if (!rateMap) return amount;
    return convertCurrency(amount, fromCurrency, userCurrency, rateMap);
  };

  return {
    userCurrency,
    rates: rateMap,
    formatBase,
    formatOriginal,
    convertBase,
    convertToUserCurrency,
    formatDate: (timestamp: number, includeTime: boolean = false) =>
      formatDate(timestamp, userCurrency, includeTime, userTimezone),
    isLoading: !rates,
  };
}
