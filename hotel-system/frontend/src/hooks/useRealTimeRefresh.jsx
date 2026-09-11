import { useEffect, useCallback } from "react";
import { useSocket } from "../SocketContext";

export default function useRealTimeRefresh(refreshFn, events = [], delay = 500) {
  const { subscribe, connected } = useSocket();

  useEffect(() => {
    if (!connected || events.length === 0 || !refreshFn) return;

    console.log("[RealTime] Subscribing to events:", events);

    const unsubscribers = events.map((event) => {
      return subscribe(event, (data) => {
        console.log(`[RealTime] Event received: ${event}`, data);
        // Small delay to let the backend finish saving
        setTimeout(() => {
          refreshFn();
        }, delay);
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [connected, subscribe, refreshFn, events, delay]);
}