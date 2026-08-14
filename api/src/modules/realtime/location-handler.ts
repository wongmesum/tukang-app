import type { ServerWebSocket } from "bun";
import type { WsConnectionData } from "./types";
import { connectionManager } from "./connection-manager";

/**
 * Handle worker location updates.
 *
 * Workers send their location while EN_ROUTE → customer gets real-time position.
 * Payload: { lat: number, lng: number, order_id: string }
 */
export function handleLocationUpdate(
  ws: ServerWebSocket<WsConnectionData>,
  payload: Record<string, unknown>,
): void {
  if (ws.data.role !== "worker") {
    connectionManager.sendTo(ws, {
      type: "connection.error",
      payload: { message: "Only workers can send location updates" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const lat = payload.lat as number | undefined;
  const lng = payload.lng as number | undefined;
  const orderId = payload.order_id as string | undefined;

  if (lat === undefined || lng === undefined || !orderId) {
    connectionManager.sendTo(ws, {
      type: "connection.error",
      payload: { message: "lat, lng, and order_id required" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Validate lat/lng ranges
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    connectionManager.sendTo(ws, {
      type: "connection.error",
      payload: { message: "Invalid lat/lng values" },
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Broadcast location to all subscribers of this order (customer watching)
  connectionManager.broadcastToOrder(orderId, {
    type: "worker.location_update",
    payload: {
      worker_id: ws.data.userId,
      order_id: orderId,
      lat,
      lng,
    },
    timestamp: new Date().toISOString(),
  });
}
