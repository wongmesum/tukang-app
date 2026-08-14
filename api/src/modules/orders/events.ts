import { emitOrderStatusChanged, emitNewOrderMatch } from "../realtime/events";
import { notificationService, getOrderNotification } from "../notifications/service";
import type { OrderStatus } from "./state-machine";

/**
 * Centralized order event dispatcher.
 *
 * Every order status transition should call `notifyOrderTransition()`.
 * This guarantees both channels fire together:
 *   1. WebSocket broadcast (instant, for apps currently open)
 *   2. Push notification via FCM (for apps in background/closed)
 *
 * Recipient targeting matters: a MATCHED order must notify the *worker*
 * ("new order for you"), while ACCEPTED must notify the *customer*
 * ("your worker is on the way"). Sending both parties every message
 * would be noisy and confusing.
 */

type NotifyTarget = "customer" | "worker" | "both";

/**
 * Which party cares about each status change.
 */
const NOTIFY_TARGET: Record<string, NotifyTarget> = {
  // Worker needs to know there's work available / money arrived
  MATCHED: "worker",
  PAID: "worker",
  CANCELLED_BY_CUSTOMER: "worker",

  // Customer tracks their order's progress
  ACCEPTED: "customer",
  EN_ROUTE: "customer",
  ARRIVED: "customer",
  IN_PROGRESS: "customer",
  COMPLETED: "customer",
  CANCELLED_BY_WORKER: "customer",

  // Both parties need to know about problems
  DISPUTED: "both",
  EXPIRED: "both",
};

export interface OrderTransitionEvent {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  customerId: string;
  workerId: string | null;
}

/**
 * Fire all notification channels for an order status change.
 *
 * Push notifications are fire-and-forget: a failed FCM send must never
 * break the HTTP response for the transition that already succeeded.
 */
export function notifyOrderTransition(event: OrderTransitionEvent): void {
  const { orderId, orderNumber, status, customerId, workerId } = event;

  // 1. WebSocket — instant delivery to connected clients
  emitOrderStatusChanged({ orderId, orderNumber, status, customerId, workerId });

  // 2. Push notification — reaches backgrounded/closed apps
  const payload = getOrderNotification(status, orderNumber);
  if (!payload) return;

  // Attach order_id so tapping the notification can deep-link
  const enriched = {
    ...payload,
    data: { ...payload.data, order_id: orderId },
  };

  const target = NOTIFY_TARGET[status] ?? "customer";
  const recipients: string[] = [];

  if (target === "customer" || target === "both") {
    recipients.push(customerId);
  }
  if ((target === "worker" || target === "both") && workerId) {
    recipients.push(workerId);
  }

  if (recipients.length === 0) return;

  void notificationService
    .sendToMultiple(recipients, enriched)
    .catch(() => {
      // Push delivery is best-effort. The WebSocket event and the DB
      // state change are the sources of truth.
    });
}

/**
 * Special case: a newly matched order sends the worker a richer payload
 * (distance, earnings) so they can decide without opening the app first.
 */
export function notifyWorkerNewMatch(params: {
  workerId: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  categoryCode: string;
  distanceKm: number;
  totalEstimate: number;
}): void {
  const { workerId, orderId, orderNumber, customerId, categoryCode, distanceKm, totalEstimate } =
    params;

  // Rich WebSocket event for the incoming-order screen
  emitNewOrderMatch({
    workerId,
    orderId,
    orderNumber,
    categoryCode,
    distanceKm,
    totalEstimate,
  });

  // Standard status broadcast so any order-detail view updates too
  emitOrderStatusChanged({
    orderId,
    orderNumber,
    status: "MATCHED",
    customerId,
    workerId,
  });

  // Push notification with the numbers that drive the accept decision
  const rupiah = `Rp ${totalEstimate.toLocaleString("id-ID")}`;
  void notificationService
    .sendToUser(workerId, {
      type: "order.new_match",
      title: "Order Baru! 🔔",
      body: `${categoryCode} • ${distanceKm.toFixed(1)} km • ${rupiah}. Segera terima!`,
      data: {
        order_id: orderId,
        order_number: orderNumber,
        status: "MATCHED",
        distance_km: String(distanceKm),
        total_estimate: String(totalEstimate),
      },
    })
    .catch(() => {
      // Best-effort — worker can still see it via polling/WebSocket
    });
}
