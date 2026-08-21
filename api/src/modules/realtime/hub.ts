import type { ServerWebSocket } from "bun";
import type { WsEvent } from "./types";

// Bun WebSocket data attached to each connection
export interface WsData {
  userId: string;
  role: string;
}

/**
 * In-memory connection hub.
 * Maps userId → set of active WebSocket connections.
 * A user can have multiple active connections (multiple devices).
 */
class ConnectionHub {
  private connections = new Map<string, Set<ServerWebSocket<WsData>>>();

  register(ws: ServerWebSocket<WsData>): void {
    const { userId } = ws.data;
    const existing = this.connections.get(userId);
    if (existing) {
      existing.add(ws);
    } else {
      this.connections.set(userId, new Set([ws]));
    }
  }

  unregister(ws: ServerWebSocket<WsData>): void {
    const { userId } = ws.data;
    const existing = this.connections.get(userId);
    if (existing) {
      existing.delete(ws);
      if (existing.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  /** Send event to a specific user (all their connected devices) */
  sendToUser(userId: string, event: WsEvent): void {
    const sockets = this.connections.get(userId);
    if (!sockets) return;

    const payload = JSON.stringify(event);
    for (const ws of sockets) {
      try {
        ws.send(payload);
      } catch {
        // Socket may have closed; cleanup happens in onClose
      }
    }
  }

  /** Send event to multiple users */
  sendToUsers(userIds: string[], event: WsEvent): void {
    for (const userId of userIds) {
      this.sendToUser(userId, event);
    }
  }

  /** Check if a user is currently connected */
  isOnline(userId: string): boolean {
    const sockets = this.connections.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /** Broadcast event to ALL connected clients */
  broadcast(event: WsEvent): void {
    const payload = JSON.stringify(event);
    for (const sockets of this.connections.values()) {
      for (const ws of sockets) {
        try {
          ws.send(payload);
        } catch {
          // ignore
        }
      }
    }
  }

  /** Broadcast event to all clients with a specific role */
  broadcastToRole(role: string, event: WsEvent): void {
    const payload = JSON.stringify(event);
    for (const sockets of this.connections.values()) {
      for (const ws of sockets) {
        if (ws.data.role === role) {
          try {
            ws.send(payload);
          } catch {
            // ignore
          }
        }
      }
    }
  }

  /** Get count of active connections (for monitoring) */
  get totalConnections(): number {
    let count = 0;
    for (const sockets of this.connections.values()) {
      count += sockets.size;
    }
    return count;
  }

  get totalUsers(): number {
    return this.connections.size;
  }
}

export const hub = new ConnectionHub();
