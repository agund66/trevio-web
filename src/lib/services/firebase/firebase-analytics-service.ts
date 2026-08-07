import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "../../firebase";
import type { AnalyticsService } from "../interfaces/analytics-service";
import type { Expense, GroupAnalytics, UserAnalytics } from "../../types";
import { computeGroupAnalytics, computeUserAnalytics } from "../../utils/analytics";

export class FirebaseAnalyticsService implements AnalyticsService {
  async getGroupAnalytics(groupId: string): Promise<GroupAnalytics> {
    const expensesRef = collection(db, "groups", groupId, "expenses");
    const q = query(expensesRef, orderBy("date", "desc"), limit(500));
    const snapshot = await getDocs(q);
    const expenses: Expense[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        expenseId: doc.id,
        description: data.description || "",
        amount: data.amount || 0,
        currency: data.currency || "INR",
        paidBy: data.paidBy || "",
        splitType: data.splitType || "equal",
        splits: data.splits || {},
        category: data.category || "other",
        createdBy: data.createdBy || "",
        date: data.date || 0,
        note: data.note || "",
      });
    });

    const groupDoc = await getDocs(collection(db, "groups", groupId, "members"));
    const members = groupDoc.docs.map((d) => {
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

    const groupInfoDoc = await getDocs(collection(db, "groups"));
    let groupName = groupId;
    for (const doc of groupInfoDoc.docs) {
      if (doc.id === groupId) {
        groupName = doc.data().name || groupId;
        break;
      }
    }

    return computeGroupAnalytics(groupId, groupName, expenses, members, "");
  }

  async getUserAnalytics(): Promise<UserAnalytics> {
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
