import { collection, doc, getDoc, orderBy, getDocs, limit, where, query as firestoreQuery } from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { AnalyticsService } from "../interfaces/analytics-service";
import type { Expense, GroupAnalytics, UserAnalytics, SplitType, SplitEntry } from "../../types";
import { computeGroupAnalytics, computeUserAnalytics } from "../../utils/analytics";

export class FirebaseAnalyticsService implements AnalyticsService {
  async getGroupAnalytics(groupId: string): Promise<GroupAnalytics> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!groupId) throw new Error("Group ID is required");

    const groupRef = doc(db, "groups", groupId);
    const memberDoc = await getDoc(doc(groupRef, "members", uid));
    if (!memberDoc.exists()) throw new Error("You are not a member of this group");

    const expensesRef = collection(db, "groups", groupId, "expenses");
    const q = firestoreQuery(expensesRef, orderBy("date", "desc"), limit(500));
    const snapshot = await getDocs(q);
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as Record<string, unknown>;
      expenses.push({
        expenseId: doc.id,
        description: (data.description as string) || "",
        amount: (data.amount as number) || 0,
        currency: (data.currency as string) || "INR",
        paidBy: (data.paidBy as string) || "",
        splitType: (data.splitType as SplitType) || "equal",
        splits: (data.splits as Record<string, SplitEntry>) || {},
        category: (data.category as string) || "other",
        createdBy: (data.createdBy as string) || "",
        date: (data.date as number) || 0,
        note: (data.note as string) || "",
      });
    });

    const membersSnapshot = await getDocs(
      firestoreQuery(
        collection(db, "groups", groupId, "members"),
        where("status", "in", ["active", "pending"])
      )
    );
    const members = membersSnapshot.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName || "",
        username: data.username || "",
        photoURL: data.photoURL || "",
        balance: data.balance || 0,
        role: data.role || "member",
        status: data.status || "active",
      };
    });

    const groupInfoDoc = await getDoc(doc(db, "groups", groupId));
    const groupName = groupInfoDoc.data()?.name || groupId;

    return computeGroupAnalytics(groupId, groupName, expenses, members, "");
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
    if (!auth.currentUser?.uid) throw new Error("User not authenticated");
    return {
      totalSpent: 0,
      totalPaid: 0,
      totalOwed: 0,
      totalOwing: 0,
      netBalance: 0,
      groupCount: 0,
      expenseCount: 0,
      categoryBreakdown: [],
      monthlyTrends: [],
      topGroups: [],
    };
  }
}
