const Notification = require("../models/Notification");

let io = null;

const setIo = (instance) => {
  io = instance;
};

const createNotification = async ({
  type,
  severity = "info",
  titleKey,
  messageKey,
  params = {},
  roles = [],
  link = "",
  dedupeKey,
  expiresAt
}) => {
  try {
    if (dedupeKey) {
      // only unresolved notifications block duplicates
      const exists = await Notification.findOne({ dedupeKey, resolvedAt: null });
      if (exists) return null;
    }

    const doc = await Notification.create({
      type, severity, titleKey, messageKey, params, roles, link, dedupeKey, expiresAt
    });

    if (io) io.emit("notification:new", { notification: doc });
    return doc;
  } catch (e) {
    console.error("[Notify] create failed:", e.message);
    return null;
  }
};

/* resolve by query (types + optional reservation) */
const resolveNotifications = async ({ types = [], reservationId = null }) => {
  try {
    const filter = { resolvedAt: null, type: { $in: types } };
    if (reservationId) filter["params.reservationId"] = String(reservationId);
    const docs = await Notification.find(filter).select("_id").lean();
    if (docs.length) await resolveNotificationIds(docs.map((d) => d._id));
  } catch (e) {
    console.error("[Notify] resolve failed:", e.message);
  }
};

/* resolve by explicit ids + broadcast to all devices */
const resolveNotificationIds = async (ids = []) => {
  try {
    if (!ids.length) return;
    await Notification.updateMany(
      { _id: { $in: ids }, resolvedAt: null },
      { $set: { resolvedAt: new Date() } }
    );
    if (io) io.emit("notification:resolved", { ids: ids.map(String) });
  } catch (e) {
    console.error("[Notify] resolveIds failed:", e.message);
  }
};

module.exports = { setIo, createNotification, resolveNotifications, resolveNotificationIds };