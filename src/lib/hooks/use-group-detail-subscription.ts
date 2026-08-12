"use client";

import { collection, doc, orderBy, query, limit, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useFirestoreDocSubscription, useFirestoreSubscription, useFirestoreAsyncSubscription } from "./use-firestore-query";
import type { Member, GroupTemplate, Expense, SplitEntry, SplitType, RecurringConfig, ItemizedSplitData, TransactionType } from "@/lib/types";
import type { GroupInfo } from "@/lib/services/interfaces/group-service";
import { toMillis } from "@/lib/utils/date";

/**
 * Real-time subscription for a single group's info document.
 * Feeds into React Query cache at ["groupInfo", groupId].
 */
export function useGroupInfoSubscription(groupId: string): void {
  useFirestoreDocSubscription<GroupInfo | null>(
    ["groupInfo", groupId],
    () => doc(db, "groups", groupId),
    (docSnapshot) => {
      if (!docSnapshot.exists()) return null;
      const data = docSnapshot.data() as Record<string, unknown>;
      return {
        groupId,
        name: (data.name as string) ?? "",
        description: (data.description as string) ?? "",
        template: (data.template as GroupTemplate) ?? "casual",
        currency: (data.currency as string) ?? "INR",
        inviteCode: (data.inviteCode as string) ?? "",
        createdBy: (data.createdBy as string) ?? "",
        memberCount: (data.memberCount as number) ?? 0,
        totalExpenses: (data.totalExpenses as number) ?? 0,
        archived: (data.archived as boolean) ?? false,
        monthlyBudget: (data.monthlyBudget as number) ?? undefined,
        budgetCategories: (data.budgetCategories as Record<string, number>) ?? undefined,
      };
    }
  );
}

/**
 * Real-time subscription for a group's members (with balances).
 * Feeds into React Query cache at ["balances", groupId].
 * Uses denormalized displayName/username/photoURL from member docs
 * — no user collection fetches needed.
 */
export function useGroupBalancesSubscription(groupId: string): void {
  useFirestoreAsyncSubscription<Member[]>(
    ["balances", groupId],
    () => query(
      collection(db, "groups", groupId, "members"),
      where("status", "in", ["active", "pending"])
    ),
    async (snapshot) => {
      return snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        const isOffline = data.isOffline === true;
        return {
          uid: d.id,
          displayName: (data.displayName as string) ?? "Unknown",
          username: (data.username as string) ?? "",
          photoURL: (data.photoURL as string) ?? "",
          balance: (data.balance as number) ?? 0,
          role: (data.role as string) ?? "member",
          status: (data.status as string) ?? "active",
          isOffline,
        };
      });
    }
  );
}

/**
 * Real-time subscription for a group's expenses (latest 20, ordered by date desc).
 * Feeds into React Query cache at ["expenses", groupId] to match the key
 * used by usePaginatedQuery in the group detail page.
 */
export function useGroupExpensesSubscription(groupId: string): void {
  useFirestoreSubscription<Expense[]>(
    ["expenses", groupId],
    () => query(
      collection(db, "groups", groupId, "expenses"),
      orderBy("date", "desc"),
      limit(20)
    ),
    (snapshot) => {
      return snapshot.docs.map((d) => {
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
    }
  );
}
