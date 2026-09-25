import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import api from "./api";
import { useAuth } from "./AuthContext";
import { useSocket } from "./SocketContext";
import { useSettings } from "./SettingsContext";
import { useLanguage } from "./LanguageContext";
import { useToast } from "./components/ToastContext";

const NotificationsContext = createContext(null);
const FADE_MS = 3 * 60 * 1000; // solved rows fade 3 min then delete

/*sound files  */
const soundCache = {};
const playSound = (severity) => {
  if (localStorage.getItem("notifMuted") === "1") return;
  const base = `${import.meta.env.BASE_URL || "/"}sounds/`;
  const file = severity === "critical" ? `${base}critical.mp3` : `${base}notification.mp3`;
  try {
    let audio = soundCache[file] || (soundCache[file] = new Audio(file));
    audio.currentTime = 0;
    audio.play().catch(() => {
      if (severity === "critical") {
        const fb = `${base}notification.mp3`;
        const a2 = soundCache[fb] || (soundCache[fb] = new Audio(fb));
        a2.currentTime = 0;
        a2.play().catch(() => {});
      }
    });
  } catch (e) { /* silent */ }
};

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const { subscribe, connected } = useSocket();
  const { formatMoney, formatDateTime } = useSettings();
  const { t } = useLanguage();
  const { addToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [muted, setMuted] = useState(localStorage.getItem("notifMuted") === "1");
  const notificationsRef = useRef([]);
  const timersRef = useRef({});

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      localStorage.setItem("notifMuted", next ? "1" : "0");
      return next;
    });
  };

  const scheduleRemoval = useCallback((ids, delayMs) => {
    ids.forEach((rawId) => {
      const id = String(rawId);
      if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
      timersRef.current[id] = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => String(n._id) !== id));
        delete timersRef.current[id];
      }, delayMs);
    });
  }, []);

  const fill = useCallback((n) => {
    let msg = t(n.messageKey) || "";
    const params = n.params || {};
    Object.keys(params).forEach((k) => {
      let v = params[k];
      if (k === "amount") v = formatMoney(v);
      else if (k === "time" && v && v !== "-" && !isNaN(Date.parse(v))) v = formatDateTime(v);
      msg = msg.split(`{${k}}`).join(v);
    });
    return msg;
  }, [t, formatMoney, formatDateTime]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/notifications");
      const now = Date.now();
      const items = [];
      (res.data.notifications || []).forEach((n) => {
        if (n.isResolved && n.resolvedAt) {
          const remaining = new Date(n.resolvedAt).getTime() + FADE_MS - now;
          if (remaining <= 0) return;
          items.push(n);
          scheduleRemoval([n._id], remaining);
        } else {
          items.push(n);
        }
      });
      setNotifications(items);
      setUnread(res.data.unread);
    } catch (e) { /* silent */ }
  }, [scheduleRemoval]);

  useEffect(() => {
    if (user) load();
    else {
      setNotifications([]);
      setUnread(0);
    }
  }, [user, load]);

  useEffect(() => {
    if (!connected || !user) return;

    const unsubNew = subscribe("notification:new", ({ notification }) => {
      if (!notification || !(notification.roles || []).includes(user.role)) return;
      if (notification.resolvedAt) return;
      setNotifications((prev) => [notification, ...prev].slice(0, 30));
      setUnread((u) => u + 1);
      playSound(notification.severity);
      if (notification.severity === "critical") {
        addToast(`${t(notification.titleKey)} — ${fill(notification)}`, "error");
      }
    });

    const unsubResolved = subscribe("notification:resolved", ({ ids }) => {
      if (!ids || !ids.length) return;
      const idSet = ids.map(String);
      const affected = notificationsRef.current.filter((n) => idSet.includes(String(n._id)));
      const unreadLost = affected.filter((n) => !n.isRead && !n.isResolved).length;

      setNotifications((prev) =>
        prev.map((n) =>
          idSet.includes(String(n._id))
            ? { ...n, isResolved: true, isRead: true, resolvedAt: n.resolvedAt || new Date().toISOString() }
            : n
        )
      );
      if (unreadLost) setUnread((u) => Math.max(0, u - unreadLost));
      scheduleRemoval(idSet, FADE_MS);
    });

    return () => {
      if (unsubNew) unsubNew();
      if (unsubResolved) unsubResolved();
    };
  }, [connected, subscribe, user, fill, t, addToast, scheduleRemoval]);

  const markRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    try { await api.post(`/notifications/${id}/read`); } catch (e) { /* silent */ }
  };

  const markAll = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    try { await api.post("/notifications/read-all"); } catch (e) { /* silent */ }
  };

  return (
    <NotificationsContext.Provider value={{ notifications, unread, markRead, markAll, fill, reload: load, muted, toggleMute }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationsContext);