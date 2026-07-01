"use client";

import { useQuery } from "@tanstack/react-query";
import { useServices } from "@/lib/services/service-provider";
import { useAuth } from "@/lib/hooks/use-auth";
import { convertFromBase, formatCurrencySymbol } from "@/lib/utils/currency";

export function useCurrencyDisplay() {
  const { exchangeRate, user: userService } = useServices();
  const { user: currentUser } = useAuth();

  const { data: rates } = useQuery({
    queryKey: ["exchangeRates"],
    queryFn: () => exchangeRate.getRates(),
    staleTime: 1000 * 60 * 60,
  });

  const userCurrency = currentUser?.defaultCurrency || "INR";
  const rateMap = rates?.rates;

  const formatBase = (amountInBase: number): string => {
    if (!rateMap) return formatCurrencySymbol(amountInBase, "INR");
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

  return {
    userCurrency,
    rates: rateMap,
    formatBase,
    formatOriginal,
    convertBase,
    isLoading: !rates,
  };
}
