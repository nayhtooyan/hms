import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../NotificationsContext";
import { useLanguage } from "../LanguageContext";

const dotColor = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-500"
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

  const live = notifications.filter((n) => !n.isResolved);
  const solved = notifications.filter((n) => n.isResolved);

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

  const Row = ({ n, faded }) => (
    <button
      onClick={() => openNotif(n)}
      className={`w-full text-left px-3.5 py-2.5 transition-colors ${faded ? "" : "hover:bg-gray-800/40"}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 min-w-0">
          {n.isRead || faded ? (
            <span className="w-1.5 h-1.5 rounded-full border border-gray-500 flex-shrink-0" />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor[n.severity] || dotColor.info}`} />
          )}
          <p className={`text-[13px] font-semibold truncate ${n.isRead || faded ? "text-gray-300" : "text-white"}`}>
            {t(n.titleKey)}
          </p>
        </span>
        <span className="text-[10px] text-gray-500 flex-shrink-0">{timeAgo(n.createdAt, t)}</span>
      </div>
      <p className={`text-[11.5px] leading-snug mt-0.5 pl-3.5 ${n.isRead || faded ? "text-gray-500" : "text-gray-400"}`}>
        {fill(n)}
      </p>
    </button>
  );

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
            {/* Header — text buttons only */}
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-700/60 sticky top-0 bg-gray-900 rounded-t-2xl z-10">
              <h3 className="text-sm font-bold text-white">
                {t("notifications")} {unread > 0 && <span className="text-purple-300">({unread})</span>}
              </h3>
              <div className="flex items-center gap-3">
                <button onClick={toggleMute} className="text-[11px] font-semibold text-gray-400 hover:text-white">
                  {muted ? t("soundOff") : t("soundOn")}
                </button>
                <button onClick={markAll} className="text-[11px] font-semibold text-purple-300 hover:text-purple-200">
                  {t("markAllRead")}
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">{t("noNotifications")}</div>
            ) : (
              <div>
                {/* NEEDS ACTION */}
                {live.length > 0 && (
                  <div>
                    <p className="px-3.5 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                      {t("needsAction")}
                    </p>
                    <div className="divide-y divide-gray-800/60">
                      {live.map((n) => <Row key={n._id} n={n} faded={false} />)}
                    </div>
                  </div>
                )}

                {/* SOLVED faded, auto-clears in 3 min */}
                {solved.length > 0 && (
                  <div className="border-t border-gray-700/60 opacity-40">
                    <p className="px-3.5 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-wider text-gray-500">
                      {t("solvedCaption")}
                    </p>
                    <div className="divide-y divide-gray-800/40">
                      {solved.map((n) => <Row key={n._id} n={n} faded={true} />)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}