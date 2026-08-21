export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface NotificationService {
  /** Send push notification to a user by their userId */
  sendToUser(userId: string, notification: PushNotification): Promise<void>;

  /** Send push notification to multiple users */
  sendToUsers(userIds: string[], notification: PushNotification): Promise<void>;
}

export interface DeviceToken {
  userId: string;
  token: string;
  platform: "android" | "ios";
  createdAt: Date;
}
