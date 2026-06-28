import { httpsCallable } from "firebase/functions";
import { functions } from "../../firebase";
import type { NotificationService } from "../interfaces/notification-service";
import type { AppNotification } from "../../types";

export class FirebaseNotificationService implements NotificationService {
  async getNotifications(pageSize: number, lastNotificationId?: string): Promise<{ notifications: AppNotification[]; hasMore: boolean; lastNotificationId: string | null }> {
    const fn = httpsCallable(functions, "getNotifications");
    const result = await fn({ pageSize, lastNotificationId });
    return result.data as { notifications: AppNotification[]; hasMore: boolean; lastNotificationId: string | null };
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const fn = httpsCallable(functions, "markNotificationRead");
    await fn({ notificationId });
  }

  async markAllNotificationsRead(): Promise<void> {
    const fn = httpsCallable(functions, "markAllNotificationsRead");
    await fn();
  }
}
