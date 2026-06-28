import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import type { ExpenseService } from "../interfaces/expense-service";
import type { Expense, SplitEntry, SplitType } from "../../types";

export class FirebaseExpenseService implements ExpenseService {
  async addExpense(params: {
    groupId: string;
    description: string;
    amount: number;
    currency: string;
    paidBy: string;
    splitType: SplitType;
    splits: Record<string, SplitEntry>;
    memberUids: string[];
    category: string;
    isRecurring: boolean;
    recurringFrequency?: string;
  }): Promise<string> {
    const fn = httpsCallable(functions, "addExpense");
    const result = await fn(params);
    const data = result.data as { expenseId: string };
    return data.expenseId;
  }

  async updateExpense(params: {
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
  }): Promise<void> {
    const fn = httpsCallable(functions, "updateExpense");
    await fn(params);
  }

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    const fn = httpsCallable(functions, "deleteExpense");
    await fn({ groupId, expenseId });
  }

  async getGroupExpenses(groupId: string, pageSize: number, lastExpenseId?: string): Promise<{ expenses: Expense[]; hasMore: boolean; lastExpenseId: string | null }> {
    const fn = httpsCallable(functions, "getGroupExpenses");
    const result = await fn({ groupId, pageSize, lastExpenseId });
    return result.data as { expenses: Expense[]; hasMore: boolean; lastExpenseId: string | null };
  }
}
