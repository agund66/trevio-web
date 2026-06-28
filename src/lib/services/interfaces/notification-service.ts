import type { AppNotification } from "../../types";

export interface NotificationService {
  getNotifications(pageSize: number, lastNotificationId?: string): Promise<{ notifications: AppNotification[]; hasMore: boolean; lastNotificationId: string | null }>;
  markNotificationRead(notificationId: string): Promise<void>;
  markAllNotificationsRead(): Promise<void>;
}
