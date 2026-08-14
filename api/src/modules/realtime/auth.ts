import { verifyToken } from "../auth/jwt";
import { isTokenRevoked } from "../auth/token-revocation";
import type { WsConnectionData } from "./types";

/**
 * Authenticate a WebSocket connection from the URL query parameter.
 *
 * Connection URL: wss://api.tukangndeso.id/v1/realtime?token=<jwt>
 *
 * Returns connection data if valid, null if rejected.
 */
export function authenticateWsConnection(url: string): WsConnectionData | null {
  try {
    const parsedUrl = new URL(url, "http://localhost");
    const token = parsedUrl.searchParams.get("token");

    if (!token) {
      return null;
    }

    // Check if token is revoked
    if (isTokenRevoked(token)) {
      return null;
    }

    // Verify JWT
    const payload = verifyToken(token);

    return {
      userId: payload.userId,
      role: payload.role,
      subscribedOrders: new Set(),
      connectedAt: new Date(),
    };
  } catch {
    return null;
  }
}
