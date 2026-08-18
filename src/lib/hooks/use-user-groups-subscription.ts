"use client";

import { collectionGroup, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { queryKeys } from "@/lib/constants/query-keys";
import { useFirestoreAsyncSubscription } from "./use-firestore-query";
import type { Group, GroupTemplate } from "@/lib/types";

/**
 * Real-time subscription for the current user's groups.
 *
 * Listens on collectionGroup("members") filtered to the current user's
 * UID + active status, then batch-fetches the corresponding group docs
 * on each emission.  Feeds the result into the React Query cache at
 * `queryKeys.groups` so all `useQuery({ queryKey: queryKeys.groups })`
 * consumers see live updates.
 *
 * With IndexedDB persistent cache enabled, the first emission arrives
 * instantly from cache, eliminating the full-screen loader on repeat
 * visits to the groups list or dashboard.
 *
 * Should be mounted once in a layout-level component (e.g. the main
 * layout) so the subscription stays active across navigation between
 * dashboard and groups list.
 */
export function useUserGroupsSubscription(uid: string | null): void {
  useFirestoreAsyncSubscription<Group[]>(
    queryKeys.groups,
    () => {
      if (!uid) throw new Error("User not authenticated");
      return query(
        collectionGroup(db, "members"),
        where("uid", "==", uid),
        where("status", "==", "active")
      );
    },
    async (snapshot) => {
      if (snapshot.empty) return [];

      // Batch-fetch all group docs in parallel
      const groupDocs = await Promise.all(
        snapshot.docs.map((memberDoc) => {
          const pathSegments = memberDoc.ref.path.split("/");
          const groupId = pathSegments[1];
          return getDoc(doc(db, "groups", groupId));
        })
      );

      const groups: Group[] = [];
      groupDocs.forEach((groupDoc, index) => {
        if (groupDoc.exists()) {
          const data = groupDoc.data() as Record<string, unknown>;
          const memberData = snapshot.docs[index].data() as Record<string, unknown>;
          groups.push({
            groupId: groupDoc.id,
            name: (data.name as string) ?? "",
            description: (data.description as string) ?? "",
            template: (data.template as GroupTemplate) ?? "casual",
            currency: (data.currency as string) ?? "INR",
            createdBy: (data.createdBy as string) ?? "",
            inviteCode: (data.inviteCode as string) ?? "",
            memberCount: (data.memberCount as number) ?? 0,
            totalExpenses: (data.totalExpenses as number) ?? 0,
            yourBalance: (memberData.balance as number) ?? 0,
            yourRole: (memberData.role as string) ?? "member",
            archived: (data.archived as boolean) ?? false,
            monthlyBudget: (data.monthlyBudget as number) ?? undefined,
            budgetCategories: (data.budgetCategories as Record<string, number>) ?? undefined,
          });
        }
      });
      return groups;
    },
    !!uid
  );
}
