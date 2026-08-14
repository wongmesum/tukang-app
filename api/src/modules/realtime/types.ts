import type { ServerWebSocket } from "bun";

/**
 * WebSocket event types — server → client
 */
export type WsEventType =
  | "order.status_changed"
  | "order.new_match"
  | "worker.location_update"
  | "chat.message"
  | "connection.ack"
  | "connection.error"
  | "ping"
  | "pong";

/**
 * Base WebSocket message envelope
 */
export interface WsMessage {
  type: WsEventType;
  payload: Record<string, unknown>;
  timestamp: string;
}

/**
 * Client → server message types
 */
export type WsClientEventType =
  | "subscribe.order"
  | "unsubscribe.order"
  | "worker.location"
  | "ping";

export interface WsClientMessage {
  type: WsClientEventType;
  payload: Record<string, unknown>;
}

/**
 * Data attached to each WebSocket connection
 */
export interface WsConnectionData {
  userId: string;
  role: string;
  subscribedOrders: Set<string>;
  connectedAt: Date;
}

export type AppWebSocket = ServerWebSocket<WsConnectionData>;
