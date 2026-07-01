export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
  updatedAt: Date;
}

export interface ExchangeRateService {
  getRates(): Promise<ExchangeRates>;
  getRateToBase(currency: string): Promise<number>;
}
