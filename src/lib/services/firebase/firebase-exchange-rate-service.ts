import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";
import type { ExchangeRateService, ExchangeRates } from "../interfaces/exchange-rate-service";

const BASE_CURRENCY = "INR";
const CACHE_DOC_PATH = "config/exchangeRates";

export class FirebaseExchangeRateService implements ExchangeRateService {
  async getRates(): Promise<ExchangeRates> {
    const todayStr = new Date().toISOString().split("T")[0];

    const cachedDoc = await getDoc(doc(db, CACHE_DOC_PATH));
    if (cachedDoc.exists()) {
      const data = cachedDoc.data() as Record<string, unknown>;
      if (data.date === todayStr && data.rates) {
        return {
          base: (data.base as string) || BASE_CURRENCY,
          date: data.date as string,
          rates: data.rates as Record<string, number>,
          updatedAt: data.updatedAt as Date,
        };
      }
    }

    return this.fetchAndCacheRates(todayStr);
  }

  async getRateToBase(currency: string): Promise<number> {
    const { rates } = await this.getRates();
    if (currency === BASE_CURRENCY) return 1;
    const rate = rates[currency];
    if (!rate) return 1;
    return 1 / rate;
  }

  private async fetchAndCacheRates(dateStr: string): Promise<ExchangeRates> {
    const response = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
    if (!response.ok) throw new Error("Failed to fetch exchange rates");
    const data = await response.json();

    const rates = data.rates as Record<string, number>;
    const now = new Date();

    await setDoc(doc(db, CACHE_DOC_PATH), {
      base: BASE_CURRENCY,
      date: dateStr,
      rates,
      updatedAt: now,
    });

    return {
      base: BASE_CURRENCY,
      date: dateStr,
      rates,
      updatedAt: now,
    };
  }
}
