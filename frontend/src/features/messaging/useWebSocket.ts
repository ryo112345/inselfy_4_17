"use client";

import { useCallback, useEffect, useRef } from "react";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8081/api/ws";

type WSMessage = {
  type: string;
  payload: unknown;
};

type Options = {
  type: "candidate" | "company";
  enabled?: boolean;
  onMessage?: (msg: WSMessage) => void;
};

async function fetchTicket(type: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/ws/ticket?type=${type}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ticket ?? null;
  } catch {
    return null;
  }
}

export function useMessagingWebSocket({ type, enabled = true, onMessage }: Options) {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectDelay = useRef(1000);
  const mountedRef = useRef(true);

  const connect = useCallback(async () => {
    if (!mountedRef.current) return;

    const ticket = await fetchTicket(type);
    if (!ticket || !mountedRef.current) {
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
      return;
    }

    const url = `${WS_BASE}?ticket=${ticket}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = 1000;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        onMessageRef.current?.(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [type]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [enabled, connect]);
}
