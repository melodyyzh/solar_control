"use client";

/**
 * Resilient WebSocket client for the agent daemon: auto-reconnect with
 * backoff, typed message dispatch, and run/cancel commands.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentEvent,
  AgentProviderName,
  ClientMessage,
  PlanetStatus,
  RunInfo,
  ServerMessage,
} from "@/lib/types";

export interface SocketHandlers {
  onEvent?: (event: AgentEvent) => void;
  onStatus?: (planetId: string, status: PlanetStatus) => void;
  onRunState?: (run: RunInfo) => void;
  onError?: (message: string) => void;
}

export interface Socket {
  connected: boolean;
  run: (planetId: string, task: string, provider: AgentProviderName) => void;
  cancel: (runId: string) => void;
}

export function useSocket(handlers: SocketHandlers): Socket {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    let disposed = false;
    let retryMs = 1_000;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (disposed) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        retryMs = 1_000;
        setConnected(true);
      };
      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        if (!disposed) {
          timer = setTimeout(connect, retryMs);
          retryMs = Math.min(retryMs * 2, 15_000);
        }
      };
      ws.onerror = () => ws.close();
      ws.onmessage = (raw) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(String(raw.data)) as ServerMessage;
        } catch {
          return;
        }
        const h = handlersRef.current;
        switch (msg.type) {
          case "event":
            h.onEvent?.(msg.event);
            break;
          case "status":
            h.onStatus?.(msg.planetId, msg.status);
            break;
          case "run-state":
            h.onRunState?.(msg.run);
            break;
          case "error":
            h.onError?.(msg.message);
            break;
        }
      };
    }

    connect();
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      wsRef.current?.close();
    };
  }, []);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const run = useCallback(
    (planetId: string, task: string, provider: AgentProviderName) =>
      send({ type: "run", planetId, task, provider }),
    [send],
  );
  const cancel = useCallback((runId: string) => send({ type: "cancel", runId }), [send]);

  return { connected, run, cancel };
}
