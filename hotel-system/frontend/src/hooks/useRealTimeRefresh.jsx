import { useEffect, useCallback } from "react";
import { useSocket } from "../SocketContext";

/**
 * Hook that automatically calls a refresh function when socket events are received.
 * @param {Function} refreshFn - The function to call to reload data
 * @param {string[]} events - Array of event names to listen for
 * @param {number} delay - Optional delay in ms before refreshing (default 500ms)
 */
export default function useRealTimeRefresh(refreshFn, events = [], delay = 500) {
  const { subscribe, connected } = useSocket();

  useEffect(() => {
    if (!connected || events.length === 0) return;

    const unsubscribers = events.map((event) => {
      return subscribe(event, (data) => {
        console.log(`[RealTime] Event received: ${event}`, data);
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