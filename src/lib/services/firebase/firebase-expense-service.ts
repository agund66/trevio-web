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
import type { Expense, SplitEntry, SplitType, RecurringConfig, ItemizedSplitData } from "../../types";
import { calculateSplits, calculateBalances } from "../../utils/calculations";
import { FirebaseExchangeRateService } from "./firebase-exchange-rate-service";

type SplitMap = Record<string, SplitEntry>;

export class FirebaseExpenseService implements ExpenseService {
  private exchangeRateService = new FirebaseExchangeRateService();

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
    date?: number;
    note?: string;
    recurring?: RecurringConfig;
    itemizedData?: ItemizedSplitData;
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
      params.splits as SplitMap,
      params.itemizedData
    );

    const exchangeRateToBase = await this.exchangeRateService.getRateToBase(params.currency);

    const now = params.date ?? Date.now();
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
      createdBy: uid,
      createdAt: now,
      exchangeRateToBase,
      ...(params.note ? { note: params.note } : {}),
      ...(params.recurring ? { recurring: params.recurring } : {}),
      ...(params.itemizedData ? { itemizedData: params.itemizedData } : {}),
    });

    const amountInBase = params.amount * exchangeRateToBase;

    batch.set(doc(collection(groupRef, "activities")), {
      type: "expense_added",
      description: `Added expense: ${params.description} (${params.currency} ${params.amount})`,
      userId: uid,
      data: { expenseId: expenseRef.id, amount: params.amount, description: params.description },
      createdAt: now,
    });

    batch.update(groupRef, {
      totalExpenses: (groupDoc.data()?.totalExpenses ?? 0) + amountInBase,
      updatedAt: now,
    });

    await batch.commit();
    await this.recalculateBalances(params.groupId);

    // Notify all active group members except the creator (non-blocking — don't fail expense creation if notifications fail)
    try {
      const groupName = (groupDoc.data()?.name as string) ?? "";
      const creatorDoc = await getDoc(doc(db, "users", uid));
      const creatorName = (creatorDoc.data()?.displayName as string) ?? "Someone";
      const membersSnapshot = await getDocs(
        firestoreQuery(collection(groupRef, "members"), where("status", "==", "active"))
      );
      const notifyBatch = writeBatch(db);
      let count = 0;
      for (const memberDoc of membersSnapshot.docs) {
        const memberUid = memberDoc.id;
        if (memberUid === uid) continue;
        notifyBatch.set(doc(collection(db, "users", memberUid, "notifications")), {
          type: "expense_added",
          title: "New Expense Added",
          body: `${creatorName} added "${params.description}" (${params.currency} ${params.amount}) in "${groupName}"`,
          data: {
            groupId: params.groupId,
            groupName,
            expenseId: expenseRef.id,
            type: "expense_added",
          },
          read: false,
          createdAt: now,
        });
        count++;
        if (count >= 450) {
          await notifyBatch.commit();
          break;
        }
      }
      if (count > 0 && count < 450) {
        await notifyBatch.commit();
      }
    } catch (notifError) {
      console.warn("Failed to send expense notifications:", notifError);
    }

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
    note?: string;
    itemizedData?: ItemizedSplitData;
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

    // Only creator or group admin can edit
    const isCreator = oldExpense.createdBy === uid;
    const isAdmin = memberDoc.data()?.role === "admin";
    if (!isCreator && !isAdmin) throw new Error("Only the expense creator or group admin can edit this expense");

    const now = Date.now();
    const updateData: Record<string, unknown> = { updatedAt: now };

    if (params.description) updateData.description = params.description;
    if (params.amount) updateData.amount = params.amount;
    if (params.currency) updateData.currency = params.currency;
    if (params.paidBy) updateData.paidBy = params.paidBy;
    if (params.category) updateData.category = params.category;
    if (params.note !== undefined) updateData.note = params.note;

    const oldCurrency = oldExpense.currency as string;
    const newCurrency = params.currency || oldCurrency;
    if (newCurrency !== oldCurrency) {
      updateData.exchangeRateToBase = await this.exchangeRateService.getRateToBase(newCurrency);
    }

    if (params.splitType && params.memberUids) {
      updateData.splitType = params.splitType;
      updateData.splits = calculateSplits(
        params.amount ?? (oldExpense.amount as number),
        params.splitType,
        params.memberUids,
        params.splits as SplitMap,
        params.itemizedData
      );
      if (params.itemizedData) {
        updateData.itemizedData = params.itemizedData;
      }
    }

    const oldAmount = oldExpense.amount as number;
    const newAmount = (params.amount ?? oldAmount) as number;
    const oldRate = (oldExpense.exchangeRateToBase as number) ?? 1;
    const newRate = (updateData.exchangeRateToBase as number) ?? oldRate;
    const oldAmountInBase = oldAmount * oldRate;
    const newAmountInBase = newAmount * newRate;
    const amountDiffInBase = newAmountInBase - oldAmountInBase;

    const batch = writeBatch(db);
    batch.update(expenseRef, updateData);

    if (amountDiffInBase !== 0) {
      const groupDoc = await getDoc(groupRef);
      batch.update(groupRef, {
        totalExpenses: (groupDoc.data()?.totalExpenses ?? 0) + amountDiffInBase,
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

    // Only creator or group admin can delete
    const isCreator = expenseData.createdBy === uid;
    const isAdmin = memberDoc.data()?.role === "admin";
    if (!isCreator && !isAdmin) throw new Error("Only the expense creator or group admin can delete this expense");

    const now = Date.now();
    const batch = writeBatch(db);
    batch.delete(expenseRef);

    const expenseAmount = expenseData.amount as number;
    const expenseRate = (expenseData.exchangeRateToBase as number) ?? 1;
    const amountInBase = expenseAmount * expenseRate;

    const groupDoc = await getDoc(groupRef);
    batch.update(groupRef, {
      totalExpenses: Math.max(0, (groupDoc.data()?.totalExpenses ?? 0) - amountInBase),
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
        createdBy: (data.createdBy as string) ?? "",
        exchangeRateToBase: (data.exchangeRateToBase as number) ?? 1,
        date: (data.date as number) ?? 0,
        note: (data.note as string) ?? "",
        recurring: (data.recurring as RecurringConfig) ?? undefined,
        itemizedData: (data.itemizedData as ItemizedSplitData) ?? undefined,
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
        exchangeRateToBase: (data.exchangeRateToBase as number) ?? 1,
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
