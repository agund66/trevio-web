import type { WrappedSummary, MonthlyRecap } from "../../types";

export interface WrappedService {
  getWrappedSummary(year: number): Promise<WrappedSummary>;
  generateWrappedSummary(year: number): Promise<WrappedSummary>;
  getMonthlyRecap(year: number, month: number): Promise<MonthlyRecap>;
  generateMonthlyRecap(year: number, month: number): Promise<MonthlyRecap>;
}
