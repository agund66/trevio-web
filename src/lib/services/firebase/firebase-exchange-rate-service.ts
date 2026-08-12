import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { ExchangeRateService, ExchangeRates } from "../interfaces/exchange-rate-service";
import { BASE_CURRENCY } from "../../constants/currency";
import { CONFIG_DOCS } from "../../constants/firestore";
import { EXCHANGE_RATE_API_URL } from "../../constants/api";
import { formatDateToISO } from "../../utils/date";

export class FirebaseExchangeRateService implements ExchangeRateService {
  async getRates(): Promise<ExchangeRates> {
    const todayStr = formatDateToISO(Date.now());

    const cachedDoc = await getDoc(doc(db, CONFIG_DOCS.EXCHANGE_RATES));
    if (cachedDoc.exists()) {
      const data = cachedDoc.data() as Record<string, unknown>;
      if (data.date === todayStr && data.rates) {
        return {
          base: (data.base as string) || BASE_CURRENCY,
          date: data.date as string,
          rates: data.rates as Record<string, number>,
          updatedAt: (data.updatedAt as number) || 0,
        };
      }
    }

    return this.fetchAndCacheRates(todayStr);
  }

  async getRateToBase(currency: string): Promise<number> {
    const { rates } = await this.getRates();
    if (currency === BASE_CURRENCY) return 1;
    const rate = rates[currency];
    if (!rate) throw new Error(`Exchange rate not available for currency: ${currency}`);
    return 1 / rate;
  }

  private async fetchAndCacheRates(dateStr: string): Promise<ExchangeRates> {
    let response: Response;
    try {
      response = await fetch(`${EXCHANGE_RATE_API_URL}/${BASE_CURRENCY}`);
    } catch (err) {
      // Network failure — fall back to stale cached data if available.
      const stale = await this.readCachedRates();
      if (stale) return stale;
      throw err;
    }
    if (!response.ok) {
      // API error — fall back to stale cached data if available.
      const stale = await this.readCachedRates();
      if (stale) return stale;
      throw new Error("Failed to fetch exchange rates");
    }
    const data = await response.json();

    const rates = data.rates as Record<string, number>;
    const now = Date.now();

    // Best-effort cache write: the Firestore rules restrict writes to
    // superadmins, so normal users will get a permission-denied error.
    // The rates are still valid in-memory for this session.
    try {
      await setDoc(doc(db, CONFIG_DOCS.EXCHANGE_RATES), {
        base: BASE_CURRENCY,
        date: dateStr,
        rates,
        updatedAt: now,
      });
    } catch {
      // Ignore cache write failure — rates are still used in-memory.
    }

    return {
      base: BASE_CURRENCY,
      date: dateStr,
      rates,
      updatedAt: now,
    };
  }

  // Returns cached rates regardless of staleness, or null if no cache exists.
  // Used as a fallback when the live API is unreachable.
  private async readCachedRates(): Promise<ExchangeRates | null> {
    try {
      const cachedDoc = await getDoc(doc(db, CONFIG_DOCS.EXCHANGE_RATES));
      if (cachedDoc.exists() && cachedDoc.data()?.rates) {
        const data = cachedDoc.data() as Record<string, unknown>;
        return {
          base: (data.base as string) || BASE_CURRENCY,
          date: data.date as string,
          rates: data.rates as Record<string, number>,
          updatedAt: (data.updatedAt as number) || 0,
        };
      }
    } catch {
      // Ignore cache read errors.
    }
    return null;
  }
}
