import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../NotificationsContext";
import { useLanguage } from "../LanguageContext";

const severityStyle = {
  critical: { bar: "border-l-red-500", tint: "bg-red-500/10" },
  warning: { bar: "border-l-amber-500", tint: "bg-amber-500/10" },
  info: { bar: "border-l-blue-500", tint: "bg-blue-500/10" },
};

const timeAgo = (iso, t) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("justNow");
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

export default function NotificationBell() {
  const { notifications, unread, markRead, markAll, fill, muted, toggleMute } = useNotifications();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const openNotif = (n) => {
    if (n.isResolved) {
      setOpen(false);
      return;
    }
    markRead(n._id);
    setOpen(false);
    if (!n.link) return;
    if (n.params?.reservationId && (n.type === "checkout_soon" || n.type === "checkout_overtime")) {
      navigate(n.link, { state: { openReservationId: n.params.reservationId } });
    } else {
      navigate(n.link);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative px-3 py-2 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-200 hover:text-white hover:border-purple-500/40 transition-all text-xs font-bold"
      >
        {t("notifications")}
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-[26rem] max-w-[calc(100vw-1.5rem)] max-h-[75vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-40 animate-pop-in">
            {/* Header */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-700/60 sticky top-0 bg-gray-900 rounded-t-2xl z-10">
              <h3 className="text-sm font-bold text-white">
                {t("notifications")} {unread > 0 && <span className="text-purple-300">({unread})</span>}
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  title={muted ? t("unmute") : t("mute")}
                  className="text-sm hover:scale-110 transition-transform"
                >
                  {muted ? "�" : "�"}
                </button>
                <button onClick={markAll} className="text-[11px] font-semibold text-purple-300 hover:text-purple-200">
                  {t("markAllRead")}
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">{t("noNotifications")}</div>
            ) : (
              <div className="p-1.5 space-y-1">
                {notifications.map((n) => {
                  const s = severityStyle[n.severity] || severityStyle.info;
                  return (
                    <button
                      key={n._id}
                      onClick={() => openNotif(n)}
                      className={`w-full text-left rounded-lg border-l-[3px] ${s.bar} px-3 py-2 transition-colors ${
                        n.isResolved
                          ? "opacity-40 bg-transparent"
                          : !n.isRead
                            ? s.tint
                            : "bg-gray-800/30 hover:bg-gray-800/70"
                      }`}
                    >
                      {/* Line 1: title + solved tag + time */}
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={`text-[13px] font-bold truncate ${n.isRead || n.isResolved ? "text-gray-300" : "text-white"}`}>
                          {t(n.titleKey)}
                        </p>
                        <span className="flex-shrink-0 flex items-center gap-1.5">
                          {n.isResolved && (
                            <span className="text-[9px] font-bold text-emerald-400">✓ {t("solved")}</span>
                          )}
                          <span className="text-[10px] text-gray-500">{timeAgo(n.createdAt, t)}</span>
                        </span>
                      </div>
                      {/* Line 2: message */}
                      <p className={`text-[11.5px] leading-snug mt-0.5 ${n.isRead || n.isResolved ? "text-gray-500" : "text-gray-300"}`}>
                        {fill(n)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}