import type { NotificationPayload } from "./types";
import { deviceTokenRepo } from "./repository";

/**
 * Notification service — sends push notifications via FCM.
 * In MVP: log to console. Production: call Firebase Admin SDK.
 */
export interface NotificationService {
  sendToUser(userId: string, payload: NotificationPayload): Promise<void>;
  sendToMultiple(userIds: string[], payload: NotificationPayload): Promise<void>;
}

class FcmNotificationService implements NotificationService {
  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    const tokens = await deviceTokenRepo.findByUserId(userId);

    if (tokens.length === 0) {
      // No device token registered — skip silently
      return;
    }

    for (const deviceToken of tokens) {
      await this._sendToDevice(deviceToken.token, payload);
    }
  }

  async sendToMultiple(userIds: string[], payload: NotificationPayload): Promise<void> {
    await Promise.all(userIds.map((id) => this.sendToUser(id, payload)));
  }

  private async _sendToDevice(deviceToken: string, payload: NotificationPayload): Promise<void> {
    // TODO: Replace with Firebase Admin SDK in production
    // import admin from 'firebase-admin';
    // await admin.messaging().send({
    //   token: deviceToken,
    //   notification: { title: payload.title, body: payload.body },
    //   data: payload.data,
    // });

    // MVP: log only (never log token in production)
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`[PUSH] → ${deviceToken.slice(0, 8)}... | ${payload.type} | ${payload.title}`);
    }
  }
}

export const notificationService: NotificationService = new FcmNotificationService();

// --- Convenience helper for order status changes ---

export function getOrderNotification(
  status: string,
  orderNumber: string,
): NotificationPayload | null {
  const mapping: Record<string, { title: string; body: string; type: NotificationPayload["type"] }> = {
    MATCHED: {
      type: "order.new_match",
      title: "Order Baru! 🔔",
      body: `Ada order baru (${orderNumber}) di area Anda. Segera terima!`,
    },
    ACCEPTED: {
      type: "order.accepted",
      title: "Tukang Ditemukan ✅",
      body: `Tukang telah menerima order ${orderNumber}. Sedang menuju lokasi Anda.`,
    },
    EN_ROUTE: {
      type: "order.en_route",
      title: "Tukang Dalam Perjalanan 🚗",
      body: `Tukang sedang menuju lokasi Anda untuk order ${orderNumber}.`,
    },
    ARRIVED: {
      type: "order.arrived",
      title: "Tukang Tiba 📍",
      body: `Tukang telah tiba di lokasi untuk order ${orderNumber}.`,
    },
    IN_PROGRESS: {
      type: "order.started",
      title: "Pekerjaan Dimulai 🔨",
      body: `Pekerjaan untuk order ${orderNumber} telah dimulai.`,
    },
    COMPLETED: {
      type: "order.completed",
      title: "Pekerjaan Selesai ✅",
      body: `Order ${orderNumber} telah selesai. Silakan bayar dan beri rating.`,
    },
    PAID: {
      type: "order.paid",
      title: "Pembayaran Diterima 💰",
      body: `Pembayaran untuk order ${orderNumber} telah masuk ke saldo Anda.`,
    },
    CANCELLED_BY_CUSTOMER: {
      type: "order.cancelled",
      title: "Order Dibatalkan ❌",
      body: `Order ${orderNumber} dibatalkan oleh pelanggan.`,
    },
    CANCELLED_BY_WORKER: {
      type: "order.cancelled",
      title: "Order Dibatalkan ❌",
      body: `Order ${orderNumber} dibatalkan oleh tukang.`,
    },
  };

  const entry = mapping[status];
  if (!entry) return null;

  return {
    type: entry.type,
    title: entry.title,
    body: entry.body,
    data: { order_number: orderNumber, status },
  };
}
