"use client";

import { useQuery } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { convertCurrency, formatCurrencySymbol, formatDate } from "@/lib/utils/currency";
import { DEFAULT_CURRENCY } from "@/lib/constants/currency";
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

  const formatGroup = (amountInGroupCurrency: number, groupCurrency: string = userCurrency): string => {
    if (groupCurrency === userCurrency) return formatCurrencySymbol(amountInGroupCurrency, groupCurrency);
    if (!rateMap) return formatCurrencySymbol(amountInGroupCurrency, groupCurrency);
    return formatCurrencySymbol(convertCurrency(amountInGroupCurrency, groupCurrency, userCurrency, rateMap), userCurrency);
  };

  const formatOriginal = (amount: number, currency: string): string => {
    return formatCurrencySymbol(amount, currency);
  };

  const convertToUserCurrency = (amount: number, fromCurrency: string): number => {
    if (!rateMap) return amount;
    return convertCurrency(amount, fromCurrency, userCurrency, rateMap);
  };

  return {
    userCurrency,
    exchangeRate,
    rates: rateMap,
    formatGroup,
    formatOriginal,
    convertToUserCurrency,
    formatDate: (timestamp: number, includeTime: boolean = false) =>
      formatDate(timestamp, userCurrency, includeTime, userTimezone),
    isLoading: !rates,
  };
}
