import type { AppWebSocket, WsMessage, WsConnectionData } from "./types";

/**
 * WebSocket Connection Manager
 *
 * Manages connected clients, room subscriptions, and message broadcasting.
 * Rooms:
 *   - `user:{userId}` — personal channel (notifications, status)
 *   - `order:{orderId}` — order-specific channel (status, location)
 */
class ConnectionManager {
  // userId → Set of their WebSocket connections (supports multiple devices)
  private userConnections = new Map<string, Set<AppWebSocket>>();

  // orderId → Set of WebSocket connections subscribed to that order
  private orderRooms = new Map<string, Set<AppWebSocket>>();

  // All active connections
  private allConnections = new Set<AppWebSocket>();

  /** Register a new connection */
  addConnection(ws: AppWebSocket): void {
    const { userId } = ws.data;
    this.allConnections.add(ws);

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(ws);
  }

  /** Remove a disconnected connection */
  removeConnection(ws: AppWebSocket): void {
    const { userId, subscribedOrders } = ws.data;
    this.allConnections.delete(ws);

    // Remove from user connections
    const userSet = this.userConnections.get(userId);
    if (userSet) {
      userSet.delete(ws);
      if (userSet.size === 0) {
        this.userConnections.delete(userId);
      }
    }

    // Remove from all order rooms
    for (const orderId of subscribedOrders) {
      const room = this.orderRooms.get(orderId);
      if (room) {
        room.delete(ws);
        if (room.size === 0) {
          this.orderRooms.delete(orderId);
        }
      }
    }
  }

  /** Subscribe a connection to an order room */
  subscribeToOrder(ws: AppWebSocket, orderId: string): void {
    ws.data.subscribedOrders.add(orderId);

    if (!this.orderRooms.has(orderId)) {
      this.orderRooms.set(orderId, new Set());
    }
    this.orderRooms.get(orderId)!.add(ws);
  }

  /** Unsubscribe a connection from an order room */
  unsubscribeFromOrder(ws: AppWebSocket, orderId: string): void {
    ws.data.subscribedOrders.delete(orderId);

    const room = this.orderRooms.get(orderId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.orderRooms.delete(orderId);
      }
    }
  }

  /** Send a message to a specific user (all their devices) */
  sendToUser(userId: string, message: WsMessage): void {
    const connections = this.userConnections.get(userId);
    if (!connections) return;

    const data = JSON.stringify(message);
    for (const ws of connections) {
      try {
        ws.send(data);
      } catch {
        // Connection broken — will be cleaned up on close
      }
    }
  }

  /** Broadcast a message to all subscribers of an order */
  broadcastToOrder(orderId: string, message: WsMessage): void {
    const room = this.orderRooms.get(orderId);
    if (!room) return;

    const data = JSON.stringify(message);
    for (const ws of room) {
      try {
        ws.send(data);
      } catch {
        // Connection broken
      }
    }
  }

  /** Send message to a specific connection */
  sendTo(ws: AppWebSocket, message: WsMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // Ignore send errors
    }
  }

  /** Check if user is currently online */
  isUserOnline(userId: string): boolean {
    const connections = this.userConnections.get(userId);
    return connections !== undefined && connections.size > 0;
  }

  /** Get stats for monitoring */
  getStats() {
    return {
      totalConnections: this.allConnections.size,
      uniqueUsers: this.userConnections.size,
      activeOrderRooms: this.orderRooms.size,
    };
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
