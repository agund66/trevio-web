import {
  doc,
  collection,
  getDoc,
  getDocs,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { ExpenseService } from "../interfaces/expense-service";
import type { Expense, SplitEntry, SplitType } from "../../types";
import { calculateSplits, calculateBalances } from "../../utils/calculations";

type SplitMap = Record<string, SplitEntry>;

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
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!params.groupId || !params.description || !params.amount || !params.paidBy) {
      throw new Error("Missing required fields");
    }

    const groupRef = doc(db, "groups", params.groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const calculatedSplits = calculateSplits(
      params.amount,
      params.splitType,
      params.memberUids,
      params.splits as SplitMap
    );

    const now = new Date();
    const expenseRef = doc(collection(groupRef, "expenses"));

    const batch = writeBatch(db);
    batch.set(expenseRef, {
      description: params.description,
      amount: params.amount,
      currency: params.currency,
      paidBy: params.paidBy,
      splitType: params.splitType,
      splits: calculatedSplits,
      category: params.category || "other",
      date: now,
      isRecurring: params.isRecurring ?? false,
      createdBy: uid,
      createdAt: now,
    });

    if (params.isRecurring && params.recurringFrequency) {
      batch.update(expenseRef, {
        recurringConfig: {
          frequency: params.recurringFrequency,
          startDate: now,
          endDate: null,
          lastTriggered: now,
        },
      });
    }

    batch.set(doc(collection(groupRef, "activities")), {
      type: "expense_added",
      description: `Added expense: ${params.description} (${params.currency} ${params.amount})`,
      userId: uid,
      data: { expenseId: expenseRef.id, amount: params.amount, description: params.description },
      createdAt: now,
    });

    batch.update(groupRef, {
      totalExpenses: (groupDoc.data()?.totalExpenses ?? 0) + params.amount,
      updatedAt: now,
    });

    await batch.commit();
    await this.recalculateBalances(params.groupId);

    return expenseRef.id;
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
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!params.groupId || !params.expenseId) throw new Error("Group ID and Expense ID are required");

    const groupRef = doc(db, "groups", params.groupId);
    const expenseRef = doc(groupRef, "expenses", params.expenseId);
    const expenseDoc = await getDoc(expenseRef);
    if (!expenseDoc.exists()) throw new Error("Expense not found");

    const oldExpense = expenseDoc.data() as Record<string, unknown>;
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const now = new Date();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (params.description) updateData.description = params.description;
    if (params.amount) updateData.amount = params.amount;
    if (params.currency) updateData.currency = params.currency;
    if (params.paidBy) updateData.paidBy = params.paidBy;
    if (params.category) updateData.category = params.category;

    if (params.splitType && params.memberUids) {
      updateData.splitType = params.splitType;
      updateData.splits = calculateSplits(
        params.amount ?? (oldExpense.amount as number),
        params.splitType,
        params.memberUids,
        params.splits as SplitMap
      );
    }

    const oldAmount = oldExpense.amount as number;
    const newAmount = (params.amount ?? oldAmount) as number;
    const amountDiff = newAmount - oldAmount;

    const batch = writeBatch(db);
    batch.update(expenseRef, updateData);

    if (amountDiff !== 0) {
      const groupDoc = await getDoc(groupRef);
      batch.update(groupRef, {
        totalExpenses: (groupDoc.data()?.totalExpenses ?? 0) + amountDiff,
        updatedAt: now,
      });
    }

    batch.set(doc(collection(groupRef, "activities")), {
      type: "expense_updated",
      description: `Updated expense: ${params.description ?? oldExpense.description}`,
      userId: uid,
      data: { expenseId: params.expenseId, groupId: params.groupId },
      createdAt: now,
    });

    await batch.commit();
    await this.recalculateBalances(params.groupId);
  }

  async deleteExpense(groupId: string, expenseId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId || !expenseId) throw new Error("Group ID and Expense ID are required");

    const groupRef = doc(db, "groups", groupId);
    const expenseRef = doc(groupRef, "expenses", expenseId);
    const expenseDoc = await getDoc(expenseRef);
    if (!expenseDoc.exists()) throw new Error("Expense not found");

    const expenseData = expenseDoc.data() as Record<string, unknown>;
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const now = new Date();
    const batch = writeBatch(db);
    batch.delete(expenseRef);

    const groupDoc = await getDoc(groupRef);
    batch.update(groupRef, {
      totalExpenses: Math.max(0, (groupDoc.data()?.totalExpenses ?? 0) - (expenseData.amount as number)),
      updatedAt: now,
    });

    batch.set(doc(collection(groupRef, "activities")), {
      type: "expense_deleted",
      description: `Deleted expense: ${expenseData.description}`,
      userId: uid,
      data: { expenseId, groupId, amount: expenseData.amount },
      createdAt: now,
    });

    await batch.commit();
    await this.recalculateBalances(groupId);
  }

  async getGroupExpenses(groupId: string, pageSize: number, lastExpenseId?: string): Promise<{ expenses: Expense[]; hasMore: boolean; lastExpenseId: string | null }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    let q = firestoreQuery(
      collection(groupRef, "expenses"),
      orderBy("date", "desc"),
      limit(pageSize || 20)
    );

    if (lastExpenseId) {
      const lastDoc = await getDoc(doc(groupRef, "expenses", lastExpenseId));
      if (lastDoc.exists()) {
        q = firestoreQuery(
          collection(groupRef, "expenses"),
          orderBy("date", "desc"),
          startAfter(lastDoc),
          limit(pageSize || 20)
        );
      }
    }

    const snapshot = await getDocs(q);
    const expenses: Expense[] = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        expenseId: d.id,
        description: (data.description as string) ?? "",
        amount: (data.amount as number) ?? 0,
        currency: (data.currency as string) ?? "",
        paidBy: (data.paidBy as string) ?? "",
        splitType: (data.splitType as SplitType) ?? "equal",
        splits: (data.splits as Record<string, SplitEntry>) ?? {},
        category: (data.category as string) ?? "other",
        isRecurring: (data.isRecurring as boolean) ?? false,
        createdBy: (data.createdBy as string) ?? "",
      };
    });

    return {
      expenses,
      hasMore: snapshot.size === (pageSize || 20),
      lastExpenseId: snapshot.size > 0 ? snapshot.docs[snapshot.size - 1].id : null,
    };
  }

  private async recalculateBalances(groupId: string): Promise<void> {
    const groupRef = doc(db, "groups", groupId);

    const [expensesSnapshot, settlementsSnapshot, membersSnapshot] = await Promise.all([
      getDocs(collection(groupRef, "expenses")),
      getDocs(collection(groupRef, "settlements")),
      getDocs(firestoreQuery(collection(groupRef, "members"), where("status", "==", "active"))),
    ]);

    const memberUids = membersSnapshot.docs.map((d) => d.id);

    const expenses = expensesSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        paidBy: data.paidBy as string,
        splits: data.splits as SplitMap,
        amount: data.amount as number,
      };
    });

    const settlements = settlementsSnapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        fromUid: data.fromUid as string,
        toUid: data.toUid as string,
        amount: data.amount as number,
      };
    });

    const balances = calculateBalances(expenses, settlements, memberUids);

    const batch = writeBatch(db);
    balances.forEach((balance, memberUid) => {
      batch.update(doc(groupRef, "members", memberUid), {
        balance: Math.round(balance * 100) / 100,
      });
    });
    await batch.commit();
  }
}
