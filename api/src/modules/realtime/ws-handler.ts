import type { ServerWebSocket } from "bun";
import type { WsData } from "./hub";
import { hub } from "./hub";
import { verifyToken } from "../auth/jwt";
import { isTokenRevokedAsync } from "../auth/token-revocation";
import { orderRepo } from "../orders/repository";
import { emitWorkerLocationUpdate } from "./events";

/**
 * Bun WebSocket handler configuration.
 * Used with Bun.serve({ websocket: wsHandler }).
 */
export const wsHandler = {
  open(ws: ServerWebSocket<WsData>) {
    hub.register(ws);
    ws.send(JSON.stringify({
      type: "connected",
      data: { user_id: ws.data.userId, role: ws.data.role },
      timestamp: new Date().toISOString(),
    }));
  },

  message(ws: ServerWebSocket<WsData>, message: string | Buffer) {
    try {
      const raw = typeof message === "string" ? message : message.toString();
      const parsed = JSON.parse(raw) as { type?: string; data?: Record<string, unknown> };

      // Handle client-sent events
      switch (parsed.type) {
        case "worker.location_update":
          handleLocationUpdate(ws, parsed.data);
          break;
        case "ping":
          ws.send(JSON.stringify({ type: "pong", timestamp: new Date().toISOString() }));
          break;
        default:
          // Unknown event type — ignore
          break;
      }
    } catch {
      // Malformed message — ignore
    }
  },

  close(ws: ServerWebSocket<WsData>) {
    hub.unregister(ws);
  },
};

/**
 * Handle worker location update sent from the worker's device.
 * Forward it to the customer if there's an active en-route order.
 */
async function handleLocationUpdate(
  ws: ServerWebSocket<WsData>,
  data: Record<string, unknown> | undefined,
): Promise<void> {
  if (!data) return;
  const { order_id, lat, lng } = data as { order_id?: string; lat?: number; lng?: number };
  if (!order_id || lat === undefined || lng === undefined) return;

  const order = await orderRepo.findById(order_id);
  if (!order) return;
  if (order.workerId !== ws.data.userId) return;
  if (order.status !== "EN_ROUTE") return;

  emitWorkerLocationUpdate(order.customerId, {
    order_id,
    worker_id: ws.data.userId,
    location: { lat, lng },
  });
}

/**
 * Authenticate a WebSocket upgrade request.
 * Returns user data for the socket or null if auth fails.
 */
export async function authenticateUpgrade(url: URL): Promise<WsData | null> {
  const token = url.searchParams.get("token");
  if (!token) return null;

  if (await isTokenRevokedAsync(token)) return null;

  try {
    const payload = verifyToken(token);
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
