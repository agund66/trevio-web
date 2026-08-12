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
  deleteField,
  increment,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { ExpenseService } from "../interfaces/expense-service";
import type { Expense, SplitEntry, SplitType, RecurringConfig, ItemizedSplitData, TransactionType, GroupTemplate } from "../../types";
import { calculateSplits, calculateBalances, simplifyDebts } from "../../utils/calculations";
import { FirebaseExchangeRateService } from "./firebase-exchange-rate-service";
import { toMillis } from "../../utils/date";
import { FIRESTORE_BATCH_LIMIT } from "../../constants/firestore";

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
    transactionType?: TransactionType;
  }): Promise<string> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!params.groupId || !params.description || !params.amount || !params.paidBy) {
      throw new Error("Missing required fields");
    }
    if (params.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const groupRef = doc(db, "groups", params.groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    // Reject expense creation in archived groups
    if (groupDoc.data()?.archived === true) {
      throw new Error("Cannot add expenses to an archived group");
    }

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

    // Separate the expense date (user-selected) from the creation timestamp.
    // Using the user-selected date as createdAt would backdate activity
    // ordering and notification timestamps incorrectly.
    const now = Date.now();
    const expenseDate = params.date ?? now;
    const expenseRef = doc(collection(groupRef, "expenses"));
    const transactionType: TransactionType = params.transactionType ?? "expense";

    // Fetch current user's profile for the activity log,
    // and payer's profile for denormalized paidByName on the expense doc.
    // In the common case paidBy == uid, so only one fetch is needed.
    let displayName = "";
    let photoURL = "";
    let paidByName = "";
    if (params.paidBy === uid) {
      const userDoc = await getDoc(doc(db, "users", uid));
      displayName = userDoc.data()?.displayName || "";
      photoURL = userDoc.data()?.photoURL || "";
      paidByName = displayName;
    } else {
      const [currentUserDoc, payerDoc] = await Promise.all([
        getDoc(doc(db, "users", uid)),
        getDoc(doc(db, "users", params.paidBy)),
      ]);
      displayName = currentUserDoc.data()?.displayName || "";
      photoURL = currentUserDoc.data()?.photoURL || "";
      paidByName = payerDoc.data()?.displayName || "Unknown";
    }

    const batch = writeBatch(db);
    batch.set(expenseRef, {
      description: params.description,
      amount: params.amount,
      currency: params.currency,
      paidBy: params.paidBy,
      paidByName,
      splitType: params.splitType,
      splits: calculatedSplits,
      category: params.category || "other",
      date: expenseDate,
      createdBy: uid,
      createdAt: now,
      exchangeRateToBase,
      transactionType,
      ...(params.note ? { note: params.note } : {}),
      ...(params.recurring ? { recurring: params.recurring } : {}),
      ...(params.itemizedData ? { itemizedData: params.itemizedData } : {}),
    });

    const amountInBase = params.amount * exchangeRateToBase;

    const activityType = transactionType === "income" ? "income_added" : "expense_added";
    const activityDesc = transactionType === "income"
      ? `Added income: ${params.description} (${params.currency} ${params.amount})`
      : `Added expense: ${params.description} (${params.currency} ${params.amount})`;

    batch.set(doc(collection(groupRef, "activities")), {
      type: activityType,
      description: activityDesc,
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
      data: { expenseId: expenseRef.id, amount: params.amount, description: params.description },
      createdAt: now,
    });

    // Only update totalExpenses for EXPENSE type (not INCOME)
    if (transactionType === "expense") {
      batch.update(groupRef, {
        totalExpenses: increment(amountInBase),
        updatedAt: now,
      });
    } else {
      batch.update(groupRef, { updatedAt: now });
    }

    await batch.commit();

    // Skip recalculateBalances for household groups (they don't track balances)
    const groupTemplate = (groupDoc.data()?.template as GroupTemplate) ?? "casual";
    if (groupTemplate !== "household") {
      await this.recalculateBalances(params.groupId);
    }

    // Notify all active group members except the creator.
    // Fire-and-forget: launched as a floating promise so the caller sees
    // success immediately after the expense + balance recalculation
    // completes, without waiting for notification batch commits.
    const expenseId = expenseRef.id;
    const groupName = (groupDoc.data()?.name as string) ?? "";
    void (async () => {
      try {
        const creatorDoc = await getDoc(doc(db, "users", uid));
        const creatorName = (creatorDoc.data()?.displayName as string) ?? "Someone";
        const membersSnapshot = await getDocs(
          firestoreQuery(collection(groupRef, "members"), where("status", "==", "active"))
        );
        let notifyBatch = writeBatch(db);
        let count = 0;
        for (const memberDoc of membersSnapshot.docs) {
          const memberUid = memberDoc.id;
          if (memberUid === uid) continue;
          const notifType = transactionType === "income" ? "income_added" : "expense_added";
          const notifTitle = transactionType === "income" ? "New Income Added" : "New Expense Added";
          const notifBody = transactionType === "income"
            ? `${creatorName} added income "${params.description}" (${params.currency} ${params.amount}) in "${groupName}"`
            : `${creatorName} added "${params.description}" (${params.currency} ${params.amount}) in "${groupName}"`;

          notifyBatch.set(doc(collection(db, "users", memberUid, "notifications")), {
            type: notifType,
            title: notifTitle,
            body: notifBody,
            data: {
              groupId: params.groupId,
              groupName,
              expenseId,
              type: notifType,
            },
            read: false,
            createdAt: now,
          });
          count++;
          if (count % FIRESTORE_BATCH_LIMIT === 0) {
            await notifyBatch.commit();
            notifyBatch = writeBatch(db);
          }
        }
        if (count % FIRESTORE_BATCH_LIMIT !== 0) {
          await notifyBatch.commit();
        }
      } catch (notifError) {
        console.warn("Failed to send expense notifications:", notifError);
      }
    })();

    return expenseId;
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
    transactionType?: TransactionType;
  }): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!params.groupId || !params.expenseId) throw new Error("Group ID and Expense ID are required");
    if (params.amount !== undefined && params.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    const groupRef = doc(db, "groups", params.groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error("Group not found");

    // Reject expense edits in archived groups
    if (groupDoc.data()?.archived === true) {
      throw new Error("Cannot edit expenses in an archived group");
    }

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
    if (params.paidBy) {
      updateData.paidBy = params.paidBy;
      // Denormalize the new payer's display name onto the expense doc.
      const paidByUserDoc = await getDoc(doc(db, "users", params.paidBy));
      updateData.paidByName = paidByUserDoc.data()?.displayName || "";
    }
    if (params.category) updateData.category = params.category;
    if (params.note !== undefined) updateData.note = params.note;
    if (params.transactionType !== undefined) updateData.transactionType = params.transactionType;

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
      } else if (params.splitType && params.splitType !== "itemized") {
        updateData.itemizedData = deleteField();
      }
    }

    const oldAmount = oldExpense.amount as number;
    const newAmount = (params.amount ?? oldAmount) as number;
    const oldRate = (oldExpense.exchangeRateToBase as number) ?? 1;
    const newRate = (updateData.exchangeRateToBase as number) ?? oldRate;
    const oldAmountInBase = oldAmount * oldRate;
    const newAmountInBase = newAmount * newRate;
    const amountDiffInBase = newAmountInBase - oldAmountInBase;

    // Determine old and new transaction types (default to "expense")
    const oldTransactionType = (oldExpense.transactionType as TransactionType) ?? "expense";
    const newTransactionType = params.transactionType ?? oldTransactionType;

    const batch = writeBatch(db);
    batch.update(expenseRef, updateData);

    // Update totalExpenses based on transaction type and amount changes.
    // Type changes must be handled independently of amount changes so that
    // switching type without changing amount still updates totalExpenses.
    if (oldTransactionType === "expense" && newTransactionType === "expense") {
      // Same type expense — adjust by diff if amount changed, otherwise just touch updatedAt
      if (amountDiffInBase !== 0) {
        batch.update(groupRef, {
          totalExpenses: increment(amountDiffInBase),
          updatedAt: now,
        });
      } else {
        batch.update(groupRef, { updatedAt: now });
      }
    } else if (oldTransactionType === "expense" && newTransactionType === "income") {
      // Was expense, now income — remove old amount from totalExpenses
      batch.update(groupRef, {
        totalExpenses: increment(-oldAmountInBase),
        updatedAt: now,
      });
    } else if (oldTransactionType === "income" && newTransactionType === "expense") {
      // Was income, now expense — add full new amount to totalExpenses
      batch.update(groupRef, {
        totalExpenses: increment(newAmountInBase),
        updatedAt: now,
      });
    } else {
      // Same type income (or no type change) — no totalExpenses change, just touch updatedAt
      batch.update(groupRef, { updatedAt: now });
    }

    const updateActivityType = newTransactionType === "income" ? "income_updated" : "expense_updated";
    const updateActivityDesc = newTransactionType === "income"
      ? `Updated income: ${params.description ?? oldExpense.description}`
      : `Updated expense: ${params.description ?? oldExpense.description}`;

    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const photoURL = userDoc.data()?.photoURL || "";

    batch.set(doc(collection(groupRef, "activities")), {
      type: updateActivityType,
      description: updateActivityDesc,
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
      data: { expenseId: params.expenseId, groupId: params.groupId },
      createdAt: now,
    });

    await batch.commit();

    // Skip recalculateBalances for household groups (they don't track balances)
    const groupData = (await getDoc(groupRef)).data() as Record<string, unknown> | undefined;
    const groupTemplate = (groupData?.template as GroupTemplate) ?? "casual";
    if (groupTemplate !== "household") {
      await this.recalculateBalances(params.groupId);
    }
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

    const userDoc = await getDoc(doc(db, "users", uid));
    const displayName = userDoc.data()?.displayName || "";
    const photoURL = userDoc.data()?.photoURL || "";

    const batch = writeBatch(db);
    batch.delete(expenseRef);

    const expenseAmount = expenseData.amount as number;
    const expenseRate = (expenseData.exchangeRateToBase as number) ?? 1;
    const amountInBase = expenseAmount * expenseRate;
    const expenseTransactionType = (expenseData.transactionType as TransactionType) ?? "expense";

    // Only decrement totalExpenses for EXPENSE type (not INCOME)
    if (expenseTransactionType === "expense") {
      batch.update(groupRef, {
        totalExpenses: increment(-amountInBase),
        updatedAt: now,
      });
    } else {
      batch.update(groupRef, { updatedAt: now });
    }

    const deleteActivityType = expenseTransactionType === "income" ? "income_deleted" : "expense_deleted";
    const deleteActivityDesc = expenseTransactionType === "income"
      ? `Deleted income: ${expenseData.description}`
      : `Deleted expense: ${expenseData.description}`;

    batch.set(doc(collection(groupRef, "activities")), {
      type: deleteActivityType,
      description: deleteActivityDesc,
      userId: uid,
      userName: displayName,
      userPhotoURL: photoURL,
      data: { expenseId, groupId, amount: expenseData.amount },
      createdAt: now,
    });

    await batch.commit();

    // Skip recalculateBalances for household groups (they don't track balances)
    const groupData = (await getDoc(groupRef)).data() as Record<string, unknown> | undefined;
    const groupTemplate = (groupData?.template as GroupTemplate) ?? "casual";
    if (groupTemplate !== "household") {
      await this.recalculateBalances(groupId);
    }
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
        date: toMillis(data.date),
        note: (data.note as string) ?? "",
        recurring: (data.recurring as RecurringConfig) ?? undefined,
        itemizedData: (data.itemizedData as ItemizedSplitData) ?? undefined,
        transactionType: (data.transactionType as TransactionType) ?? "expense",
        paidByName: (data.paidByName as string) ?? "",
      };
    });

    return {
      expenses,
      hasMore: snapshot.size === (pageSize || 20),
      lastExpenseId: snapshot.size > 0 ? snapshot.docs[snapshot.size - 1].id : null,
    };
  }

  async getExpenseById(groupId: string, expenseId: string): Promise<Expense | null> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId || !expenseId) throw new Error("Group ID and Expense ID are required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const expenseDoc = await getDoc(doc(groupRef, "expenses", expenseId));
    if (!expenseDoc.exists()) return null;

    const data = expenseDoc.data() as Record<string, unknown>;
    return {
      expenseId: expenseDoc.id,
      description: (data.description as string) ?? "",
      amount: (data.amount as number) ?? 0,
      currency: (data.currency as string) ?? "",
      paidBy: (data.paidBy as string) ?? "",
      splitType: (data.splitType as SplitType) ?? "equal",
      splits: (data.splits as Record<string, SplitEntry>) ?? {},
      category: (data.category as string) ?? "other",
      createdBy: (data.createdBy as string) ?? "",
      exchangeRateToBase: (data.exchangeRateToBase as number) ?? 1,
      date: toMillis(data.date),
      note: (data.note as string) ?? "",
      recurring: (data.recurring as RecurringConfig) ?? undefined,
      itemizedData: (data.itemizedData as ItemizedSplitData) ?? undefined,
      transactionType: (data.transactionType as TransactionType) ?? "expense",
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
    const simplifiedDebts = simplifyDebts(balances);

    const balanceEntries = Array.from(balances.entries());
    const BATCH_SIZE = FIRESTORE_BATCH_LIMIT;

    // If there are no balance entries, still store simplifiedDebts on the group doc
    if (balanceEntries.length === 0) {
      const batch = writeBatch(db);
      batch.update(groupRef, { simplifiedDebts });
      await batch.commit();
      return;
    }

    for (let i = 0; i < balanceEntries.length; i += BATCH_SIZE) {
      const chunk = balanceEntries.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      // Store simplifiedDebts on the group doc in the first batch
      if (i === 0) {
        batch.update(groupRef, { simplifiedDebts });
      }
      for (const [memberUid, balance] of chunk) {
        batch.update(doc(groupRef, "members", memberUid), {
          balance: Math.round(balance * 100) / 100,
        });
      }
      await batch.commit();
    }
  }
}
