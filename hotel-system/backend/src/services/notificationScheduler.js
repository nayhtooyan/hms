const cron = require("node-cron");
const Reservation = require("../models/Reservation");
const Payment = require("../models/Payment");
const Backup = require("../models/Backup");
const { createNotification } = require("./notification.service");

const dayStr = (d) => d.toISOString().split("T")[0];

/* OVERTIME / EXPIRING CHECK-OUT SCAN (every 5 min)  */
const scanOvertime = async () => {
  try {
    const now = new Date();
    const active = await Reservation.find({ status: "checked_in" })
      .populate("roomId", "roomNumber")
      .lean();

    for (const res of active) {
      const out = new Date(res.scheduledCheckOut);
      const diffMs = out.getTime() - now.getTime();
      const roomNo = res.roomId?.roomNumber || "?";
      const guestName = res.guest?.name || "-";

      if (diffMs > 0 && diffMs <= 60 * 60 * 1000) {
        await createNotification({
          type: "checkout_soon",
          severity: "warning",
          titleKey: "notif_checkout_soon_title",
          messageKey: "notif_checkout_soon_msg",
          params: {
            room: roomNo,
            guest: guestName,
            time: out.toISOString(),
            mins: Math.max(1, Math.round(diffMs / 60000)),
            reservationId: String(res._id)
          },
          roles: ["admin", "manager", "reception"],
          link: "/room-board",
          dedupeKey: `checkout-warn-${res._id}-${dayStr(now)}`,
          expiresAt: new Date(now.getTime() + 24 * 3600 * 1000)
        });
      }

      if (diffMs <= 0) {
        const minsOver = Math.round(-diffMs / 60000);
        const hourBucket = Math.floor(minsOver / 60);
        await createNotification({
          type: "checkout_overtime",
          severity: "critical",
          titleKey: "notif_checkout_overtime_title",
          messageKey: "notif_checkout_overtime_msg",
          params: { 
            room: roomNo, 
            guest: guestName, 
            mins: minsOver,
            reservationId: String(res._id)
        },
          roles: ["admin", "manager", "reception"],
          link: "/room-board",
          dedupeKey: `checkout-over-${res._id}-${dayStr(now)}-h${hourBucket}`,
          expiresAt: new Date(now.getTime() + 24 * 3600 * 1000)
        });
      }
    }
  } catch (e) {
    console.error("[NotifyWatcher] overtime scan:", e.message);
  }
};

/* BACKUP HEALTH (hourly)  */
const scanBackup = async () => {
  try {
    const now = new Date();
    const last = await Backup.findOne({ status: "completed" }).sort({ createdAt: -1 }).lean();
    const lastFailed = await Backup.findOne({ status: "failed" }).sort({ createdAt: -1 }).lean();

    if (!last || now - new Date(last.createdAt) > 24 * 3600 * 1000) {
      await createNotification({
        type: "backup_overdue",
        severity: "warning",
        titleKey: "notif_backup_overdue_title",
        messageKey: "notif_backup_overdue_msg",
        params: { time: last ? new Date(last.createdAt).toISOString() : "-" },
        roles: ["admin"],
        link: "/backups",
        dedupeKey: `backup-overdue-${dayStr(now)}`,
        expiresAt: new Date(now.getTime() + 24 * 3600 * 1000)
      });
    }

    if (
      lastFailed &&
      now - new Date(lastFailed.createdAt) < 24 * 3600 * 1000 &&
      (!last || new Date(lastFailed.createdAt) > new Date(last.createdAt))
    ) {
      await createNotification({
        type: "backup_failed",
        severity: "critical",
        titleKey: "notif_backup_failed_title",
        messageKey: "notif_backup_failed_msg",
        params: { time: new Date(lastFailed.createdAt).toISOString() },
        roles: ["admin"],
        link: "/backups",
        dedupeKey: `backup-failed-${dayStr(now)}`,
        expiresAt: new Date(now.getTime() + 24 * 3600 * 1000)
      });
    }
  } catch (e) {
    console.error("[NotifyWatcher] backup scan:", e.message);
  }
};

/*  MORNING DIGESTS (daily 9:00) */
const sendDigests = async () => {
  try {
    const now = new Date();
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const end = new Date(now); end.setHours(23, 59, 59, 999);

    const revAgg = await Payment.aggregate([
      { $match: { status: "completed", createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const revenue = revAgg[0]?.total || 0;

    const arrivals = await Reservation.countDocuments({
      scheduledCheckIn: { $gte: start, $lte: end },
      status: { $nin: ["cancelled"] }
    });
    const departures = await Reservation.countDocuments({
      scheduledCheckOut: { $gte: start, $lte: end },
      status: { $nin: ["cancelled"] }
    });

    await createNotification({
      type: "digest_revenue",
      severity: "info",
      titleKey: "notif_digest_revenue_title",
      messageKey: "notif_digest_revenue_msg",
      params: { amount: revenue, arrivals, departures },
      roles: ["admin", "manager"],
      link: "/reports",
      dedupeKey: `digest-revenue-${dayStr(now)}`,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000)
    });

    await createNotification({
      type: "digest_ops",
      severity: "info",
      titleKey: "notif_digest_ops_title",
      messageKey: "notif_digest_ops_msg",
      params: { arrivals, departures },
      roles: ["reception"],
      link: "/room-board",
      dedupeKey: `digest-ops-${dayStr(now)}`,
      expiresAt: new Date(now.getTime() + 48 * 3600 * 1000)
    });
  } catch (e) {
    console.error("[NotifyWatcher] digest:", e.message);
  }
};

const init = () => {
  cron.schedule("*/5 * * * *", scanOvertime);
  cron.schedule("0 * * * *", scanBackup);
  cron.schedule("0 9 * * *", sendDigests);

  setTimeout(() => {
    scanOvertime();
    scanBackup();
  }, 5000);

  console.log("[NotifyWatcher] scheduled (overtime 5min / backup hourly / digest 9AM)");
};

module.exports = { init };