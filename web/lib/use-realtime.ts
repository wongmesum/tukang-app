"use client";

import { useEffect, useRef, useCallback } from "react";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3000/v1/realtime";

type EventHandler = (event: { type: string; data: Record<string, unknown>; timestamp: string }) => void;

/**
 * Hook to connect to the TukangNDeso WebSocket and listen for real-time events.
 * Auto-reconnects on disconnect. Calls handler when an event matching `eventTypes` arrives.
 */
export function useRealtime(token: string | null, eventTypes: string[], handler: EventHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const connect = useCallback(() => {
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}?token=${token}`);
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const event = JSON.parse(ev.data as string);
        if (eventTypes.length === 0 || eventTypes.includes(event.type)) {
          handlerRef.current(event);
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      // Auto-reconnect after 3s
      setTimeout(() => {
        if (wsRef.current === ws) connect();
      }, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [token, eventTypes.join(",")]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on unmount
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}

/**
 * Hook specifically for config/master data changes.
 * Triggers a callback whenever categories, services, or pricing are updated by admin.
 */
export function useConfigSync(token: string | null, onUpdate: (type: string) => void) {
  useRealtime(
    token,
    ["config.categories_updated", "config.services_updated", "config.pricing_updated"],
    (event) => { onUpdate(event.type); },
  );
}
