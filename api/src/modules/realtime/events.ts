import { hub } from "./hub";
import type {
  ChatMessagePayload,
  OrderNewMatchPayload,
  OrderStatusChangedPayload,
  WorkerLocationPayload,
  WsEvent,
} from "./types";

function makeEvent(type: WsEvent["type"], data: Record<string, unknown>): WsEvent {
  return {
    type,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Notify the relevant worker when a new order is matched to them.
 */
export function emitOrderNewMatch(workerId: string, payload: OrderNewMatchPayload): void {
  const event = makeEvent("order.new_match", payload as unknown as Record<string, unknown>);
  hub.sendToUser(workerId, event);
}

/**
 * Notify both customer and worker when an order status changes.
 */
export function emitOrderStatusChanged(payload: OrderStatusChangedPayload): void {
  const event = makeEvent("order.status_changed", payload as unknown as Record<string, unknown>);
  const recipients = [payload.customer_id];
  if (payload.worker_id) recipients.push(payload.worker_id);
  hub.sendToUsers(recipients, event);
}

/**
 * Stream worker location to customer during EN_ROUTE status.
 */
export function emitWorkerLocationUpdate(customerId: string, payload: WorkerLocationPayload): void {
  const event = makeEvent("worker.location_update", payload as unknown as Record<string, unknown>);
  hub.sendToUser(customerId, event);
}

/**
 * Send a chat message event to the other party.
 */
export function emitChatMessage(recipientId: string, payload: ChatMessagePayload): void {
  const event = makeEvent("chat.message", payload as unknown as Record<string, unknown>);
  hub.sendToUser(recipientId, event);
}
