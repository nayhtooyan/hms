import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

// Change this to your backend URL
// If testing on same network, use your computer's IP
// e.g., "http://192.168.1.100:5000"
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [listeners, setListeners] = useState({});

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("[Socket] Connected to server");
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("[Socket] Disconnected from server");
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Subscribe to an event
  const subscribe = useCallback((event, callback) => {
    if (!socket) return () => {};

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket]);

  return (
    <SocketContext.Provider value={{ socket, connected, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);