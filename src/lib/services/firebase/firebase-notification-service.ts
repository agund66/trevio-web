import {
  doc,
  collection,
  getDoc,
  getDocs,
  updateDoc,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { NotificationService } from "../interfaces/notification-service";
import type { AppNotification } from "../../types";

export class FirebaseNotificationService implements NotificationService {
  async getNotifications(pageSize: number, lastNotificationId?: string): Promise<{ notifications: AppNotification[]; hasMore: boolean; lastNotificationId: string | null }> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    let q = firestoreQuery(
      collection(db, "users", uid, "notifications"),
      orderBy("createdAt", "desc"),
      limit(pageSize || 20)
    );

    if (lastNotificationId) {
      const lastDoc = await getDoc(doc(db, "users", uid, "notifications", lastNotificationId));
      if (lastDoc.exists()) {
        q = firestoreQuery(
          collection(db, "users", uid, "notifications"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(pageSize || 20)
        );
      }
    }

    const snapshot = await getDocs(q);
    const notifications: AppNotification[] = snapshot.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        notificationId: d.id,
        type: (data.type as string) ?? "",
        title: (data.title as string) ?? "",
        body: (data.body as string) ?? "",
        read: (data.read as boolean) ?? false,
        data: (data.data as Record<string, string>) ?? {},
      };
    });

    return {
      notifications,
      hasMore: snapshot.size === (pageSize || 20),
      lastNotificationId: snapshot.size > 0 ? snapshot.docs[snapshot.size - 1].id : null,
    };
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!notificationId) throw new Error("Notification ID is required");

    await updateDoc(doc(db, "users", uid, "notifications", notificationId), { read: true });
  }

  async markAllNotificationsRead(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    const snapshot = await getDocs(
      firestoreQuery(
        collection(db, "users", uid, "notifications"),
        where("read", "==", false)
      )
    );

    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  }
}
