import type { ServerWebSocket } from "bun";
import type { WsClientMessage, WsConnectionData } from "./types";
import { connectionManager } from "./connection-manager";
import { handleLocationUpdate } from "./location-handler";

/**
 * WebSocket message handler — processes incoming client messages.
 */
export function handleWsMessage(ws: ServerWebSocket<WsConnectionData>, raw: string | Buffer): void {
  let message: WsClientMessage;

  try {
    const text = typeof raw === "string" ? raw : raw.toString("utf-8");
    message = JSON.parse(text) as WsClientMessage;
  } catch {
    connectionManager.sendTo(ws, {
      type: "connection.error",
      payload: { message: "Invalid JSON" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  switch (message.type) {
    case "subscribe.order": {
      const orderId = message.payload.order_id as string | undefined;
      if (!orderId) {
        connectionManager.sendTo(ws, {
          type: "connection.error",
          payload: { message: "order_id required" },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      connectionManager.subscribeToOrder(ws, orderId);
      connectionManager.sendTo(ws, {
        type: "connection.ack",
        payload: { action: "subscribed", order_id: orderId },
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case "unsubscribe.order": {
      const orderId = message.payload.order_id as string | undefined;
      if (!orderId) return;
      connectionManager.unsubscribeFromOrder(ws, orderId);
      connectionManager.sendTo(ws, {
        type: "connection.ack",
        payload: { action: "unsubscribed", order_id: orderId },
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case "worker.location": {
      handleLocationUpdate(ws, message.payload);
      break;
    }

    case "ping": {
      connectionManager.sendTo(ws, {
        type: "pong",
        payload: {},
        timestamp: new Date().toISOString(),
      });
      break;
    }

    default:
      connectionManager.sendTo(ws, {
        type: "connection.error",
        payload: { message: `Unknown message type: ${message.type}` },
        timestamp: new Date().toISOString(),
      });
  }
}

/**
 * WebSocket open handler — called when connection is established.
 */
export function handleWsOpen(ws: ServerWebSocket<WsConnectionData>): void {
  connectionManager.addConnection(ws);

  connectionManager.sendTo(ws, {
    type: "connection.ack",
    payload: {
      message: "Connected",
      user_id: ws.data.userId,
      role: ws.data.role,
    },
    timestamp: new Date().toISOString(),
  });

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[WS] Connected: user=${ws.data.userId} role=${ws.data.role}`);
  }
}

/**
 * WebSocket close handler — cleanup on disconnect.
 */
export function handleWsClose(ws: ServerWebSocket<WsConnectionData>): void {
  connectionManager.removeConnection(ws);

  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.log(`[WS] Disconnected: user=${ws.data.userId}`);
  }
}
