import type { Expense, SplitEntry, SplitType, RecurringConfig, ItemizedSplitData } from "../../types";

export interface ExpenseService {
  addExpense(params: {
    groupId: string;
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    splitType: SplitType;
    splits: Record<string, SplitEntry>;
    memberUids: string[];
    category: string;
    date?: number;
    note?: string;
    recurring?: RecurringConfig;
    itemizedData?: ItemizedSplitData;
  }): Promise<string>;

  updateExpense(params: {
    groupId: string;
    expenseId: string;
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    splitType: SplitType;
    splits: Record<string, SplitEntry>;
    memberUids: string[];
    category: string;
    note?: string;
    itemizedData?: ItemizedSplitData;
  }): Promise<void>;

  deleteExpense(groupId: string, expenseId: string): Promise<void>;
  getGroupExpenses(groupId: string, pageSize: number, lastExpenseId?: string): Promise<{ expenses: Expense[]; hasMore: boolean; lastExpenseId: string | null }>;
}
