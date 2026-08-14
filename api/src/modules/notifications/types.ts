export interface DeviceToken {
  id: string;
  userId: string;
  token: string;
  platform: "android" | "ios";
  createdAt: Date;
}

export type NotificationType =
  | "order.new_match"
  | "order.accepted"
  | "order.en_route"
  | "order.arrived"
  | "order.started"
  | "order.completed"
  | "order.paid"
  | "order.cancelled"
  | "worker.verified";

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
}
