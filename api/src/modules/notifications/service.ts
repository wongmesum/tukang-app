import type { NotificationService, PushNotification } from "./types";

/**
 * Console-based notification service for development.
 * Logs notifications instead of sending them via FCM.
 * Replace with FcmNotificationService for production.
 */
class ConsoleNotificationService implements NotificationService {
  async sendToUser(userId: string, notification: PushNotification): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[PUSH] → ${userId}: ${notification.title} - ${notification.body}`, notification.data ?? "");
  }

  async sendToUsers(userIds: string[], notification: PushNotification): Promise<void> {
    for (const userId of userIds) {
      await this.sendToUser(userId, notification);
    }
  }
}

/**
 * FCM (Firebase Cloud Messaging) notification service.
 * TODO: Implement when FCM credentials are configured.
 */
class FcmNotificationService implements NotificationService {
  async sendToUser(userId: string, notification: PushNotification): Promise<void> {
    // TODO: Lookup device tokens for userId from DB
    // TODO: Call FCM HTTP v1 API to send the notification
    // For now, fall through to console
    // eslint-disable-next-line no-console
    console.log(`[FCM-STUB] → ${userId}: ${notification.title}`, notification.data ?? "");
    void notification;
  }

  async sendToUsers(userIds: string[], notification: PushNotification): Promise<void> {
    for (const userId of userIds) {
      await this.sendToUser(userId, notification);
    }
  }
}

// Use FCM in production when configured, console otherwise
const useFcm = !!process.env.FCM_SERVICE_ACCOUNT_PATH;
export const notificationService: NotificationService = useFcm
  ? new FcmNotificationService()
  : new ConsoleNotificationService();
