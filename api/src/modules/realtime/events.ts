import { connectionManager } from "./connection-manager";
import type { WsMessage } from "./types";

/**
 * Event emitter for WebSocket broadcasts.
 *
 * Called from order routes, payment routes, etc. when state changes occur.
 * This decouples the WebSocket layer from the route handlers.
 */

/**
 * Emit order status change to all subscribers of the order + the specific users.
 */
export function emitOrderStatusChanged(params: {
  orderId: string;
  orderNumber: string;
  status: string;
  customerId: string;
  workerId?: string | null;
}): void {
  const { orderId, orderNumber, status, customerId, workerId } = params;

  const message: WsMessage = {
    type: "order.status_changed",
    payload: {
      order_id: orderId,
      order_number: orderNumber,
      status,
    },
    timestamp: new Date().toISOString(),
  };

  // Broadcast to all subscribers of this order room
  connectionManager.broadcastToOrder(orderId, message);

  // Also send to the user channels directly (in case they're not subscribed to order room)
  connectionManager.sendToUser(customerId, message);
  if (workerId) {
    connectionManager.sendToUser(workerId, message);
  }
}

/**
 * Emit new order match to a worker (when matching system assigns an order).
 */
export function emitNewOrderMatch(params: {
  workerId: string;
  orderId: string;
  orderNumber: string;
  categoryCode: string;
  distanceKm: number;
  totalEstimate: number;
}): void {
  const message: WsMessage = {
    type: "order.new_match",
    payload: {
      order_id: params.orderId,
      order_number: params.orderNumber,
      category_code: params.categoryCode,
      distance_km: params.distanceKm,
      total_estimate: params.totalEstimate,
    },
    timestamp: new Date().toISOString(),
  };

  connectionManager.sendToUser(params.workerId, message);
}

/**
 * Deliver a chat message to the other party in real time.
 */
export function emitChatMessage(params: {
  orderId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  content: string;
  createdAt: string;
}): void {
  const message: WsMessage = {
    type: "chat.message",
    payload: {
      order_id: params.orderId,
      message_id: params.messageId,
      sender_id: params.senderId,
      content: params.content,
      created_at: params.createdAt,
    },
    timestamp: new Date().toISOString(),
  };

  // Send to the order room so an open chat screen updates, and to the
  // recipient's personal channel in case they're elsewhere in the app.
  connectionManager.broadcastToOrder(params.orderId, message);
  connectionManager.sendToUser(params.recipientId, message);
}

/**
 * Whether a user currently has an open WebSocket.
 *
 * Used to skip push notifications for someone already looking at the app.
 */
export function isUserConnected(userId: string): boolean {
  return connectionManager.isUserOnline(userId);
}

/**
 * Get connection stats — useful for health/admin endpoints.
 */
export function getRealtimeStats() {
  return connectionManager.getStats();
}
