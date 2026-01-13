import { useCallback, useEffect, useRef, useState } from "react";
import type { ServerEvent, ClientEvent } from "../types";

export function useWebSocket(onEvent: (event: ServerEvent) => void) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep the ref up to date without triggering reconnection
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const socket = new WebSocket("ws://" + window.location.host + "/ws");
    socketRef.current = socket;

    socket.addEventListener("open", () => setConnected(true));
    socket.addEventListener("close", () => setConnected(false));
    socket.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data as string) as ServerEvent;
        onEventRef.current(data);
      } catch {
        return;
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  const sendEvent = useCallback((event: ClientEvent) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify(event));
  }, []);

  return { connected, sendEvent };
}
