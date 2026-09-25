const cron = require("node-cron");
const Reservation = require("../models/Reservation");
const Payment = require("../models/Payment");
const Backup = require("../models/Backup");
const Notification = require("../models/Notification");
const InventoryItem = require("../models/InventoryItem");
const { createNotification, resolveNotificationIds } = require("./notification.service");

const dayStr = (d) => d.toISOString().split("T")[0];
const WARN_WINDOW = 60 * 60 * 1000; // 60 minutes

/* OVERTIME SCAN + AUTO-RESOLVE (every 1 min)  */
const scanOvertime = async () => {
  try {
    const now = new Date();
    const active = await Reservation.find({ status: "checked_in" })
      .populate("roomId", "roomNumber")
      .lean();

    const activeMap = {};
    active.forEach((res) => { activeMap[String(res._id)] = res; });

    /* AUTO-RESOLVE: checked-out or extended-back-to-future  */
    const openNotifs = await Notification.find({
      resolvedAt: null,
      type: { $in: ["checkout_soon", "checkout_overtime"] }
    }).select("_id params").lean();

    const resolveIds = [];
    for (const n of openNotifs) {
      const rid = String(n.params?.reservationId || "");
      const res = activeMap[rid];
      if (!res) {
        resolveIds.push(n._id); // guest checked out / cancelled
        continue;
      }
      const diffMs = new Date(res.scheduledCheckOut).getTime() - now.getTime();
      if (diffMs > WARN_WINDOW) {
        resolveIds.push(n._id); // stay extended → problem solved
      }
    }
    if (resolveIds.length) await resolveNotificationIds(resolveIds);

    /*  CREATE fresh warnings / overtimes  */
    for (const res of active) {
      const out = new Date(res.scheduledCheckOut);
      const diffMs = out.getTime() - now.getTime();
      const roomNo = res.roomId?.roomNumber || "?";
      const guestName = res.guest?.name || "-";

      if (diffMs > 0 && diffMs <= WARN_WINDOW) {
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

/* BACKUP HEALTH + AUTO-RESOLVE (every 5 min)  */
const scanBackup = async () => {
  try {
    const now = new Date();
    const last = await Backup.findOne({ status: "completed" }).sort({ createdAt: -1 }).lean();
    const lastFailed = await Backup.findOne({ status: "failed" }).sort({ createdAt: -1 }).lean();

    const healthy =
      last &&
      now - new Date(last.createdAt) <= 24 * 3600 * 1000 &&
      (!lastFailed || new Date(last.createdAt) > new Date(lastFailed.createdAt));

    if (healthy) {
      // problem solved → fade out any backup alerts
      const open = await Notification.find({
        resolvedAt: null,
        type: { $in: ["backup_overdue", "backup_failed"] }
      }).select("_id").lean();
      if (open.length) await resolveNotificationIds(open.map((o) => o._id));
      return;
    }

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

/* MORNING DIGESTS (daily 9:00) */
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

/* LOW STOCK SCAN (every 30 min)  */
const scanLowStock = async () => {
  try {
    const now = new Date();
    const items = await InventoryItem.find({ active: true }).lean();
    const healthyIds = [];

    for (const item of items) {
      if (item.minStock > 0 && item.stock <= item.minStock) {
        await createNotification({
          type: "low_stock",
          severity: "warning",
          titleKey: "notif_lowstock_title",
          messageKey: "notif_lowstock_msg",
          params: {
            item: item.name,
            stock: item.stock,
            min: item.minStock,
            unit: item.unit,
            itemId: String(item._id)
          },
          roles: ["admin", "manager"],
          link: "/inventory",
          dedupeKey: `lowstock-${item._id}-${dayStr(now)}`,
          expiresAt: new Date(now.getTime() + 24 * 3600 * 1000)
        });
      } else {
        healthyIds.push(String(item._id));
      }
    }

    // auto-resolve alerts for restocked items
    if (healthyIds.length) {
      const open = await Notification.find({
        resolvedAt: null,
        type: "low_stock",
        "params.itemId": { $in: healthyIds }
      }).select("_id").lean();
      if (open.length) await resolveNotificationIds(open.map((o) => o._id));
    }
  } catch (e) {
    console.error("[NotifyWatcher] low stock scan:", e.message);
  }
};

const init = () => {
  cron.schedule("* * * * *", scanOvertime);
  cron.schedule("*/5 * * * *", scanBackup);
  cron.schedule("*/30 * * * *", scanLowStock);
  cron.schedule("0 9 * * *", sendDigests);

  setTimeout(() => {
    scanOvertime();
    scanBackup();
    scanLowStock();
  }, 5000);

  console.log("[NotifyWatcher] scheduled (overtime 1min / backup 5min / lowstock 30min / digest 9AM)");
};

module.exports = { init };