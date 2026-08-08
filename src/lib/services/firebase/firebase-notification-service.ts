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
  Timestamp,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import type { NotificationService } from "../interfaces/notification-service";
import type { AppNotification } from "../../types";

function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = new Date(value).getTime();
    return isNaN(parsed) ? 0 : parsed;
  }
  if (value && typeof value === "object") {
    const seconds = (value as { _seconds?: number; seconds?: number })._seconds ?? (value as { seconds?: number }).seconds;
    const nanoseconds = (value as { _nanoseconds?: number; nanoseconds?: number })._nanoseconds ?? (value as { nanoseconds?: number }).nanoseconds;
    if (typeof seconds === "number") return seconds * 1000 + (typeof nanoseconds === "number" ? nanoseconds / 1_000_000 : 0);
  }
  return 0;
}

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
        createdAt: toMillis(data.createdAt),
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

  async updateNotificationData(notificationId: string, data: Record<string, string>): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");
    if (!notificationId) throw new Error("Notification ID is required");

    const notifDoc = await getDoc(doc(db, "users", uid, "notifications", notificationId));
    if (!notifDoc.exists()) throw new Error("Notification not found");

    const existingData = (notifDoc.data()?.data as Record<string, string>) || {};
    await updateDoc(doc(db, "users", uid, "notifications", notificationId), {
      read: true,
      data: { ...existingData, ...data },
    });
  }

  async markAllNotificationsRead(): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("User not authenticated");

    let hasMore = true;
    while (hasMore) {
      const snapshot = await getDocs(
        firestoreQuery(
          collection(db, "users", uid, "notifications"),
          where("read", "==", false),
          limit(100)
        )
      );

      if (snapshot.empty) {
        hasMore = false;
        break;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => {
        batch.update(d.ref, { read: true });
      });
      await batch.commit();

      if (snapshot.size < 100) hasMore = false;
    }
  }
}
