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
      const exists = await Notification.findOne({ dedupeKey });
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

/* AUTO RESOLVE: hide notifications whose problem is solved */
const resolveNotifications = async ({ types = [], reservationId = null }) => {
  try {
    const filter = { resolvedAt: null, type: { $in: types } };
    if (reservationId) filter["params.reservationId"] = String(reservationId);

    const docs = await Notification.find(filter).lean();
    if (!docs.length) return;

    const ids = docs.map((d) => d._id);
    await Notification.updateMany(
      { _id: { $in: ids } },
      { $set: { resolvedAt: new Date() } }
    );

    if (io) io.emit("notification:resolved", { ids: ids.map(String) });
  } catch (e) {
    console.error("[Notify] resolve failed:", e.message);
  }
};

module.exports = { setIo, createNotification, resolveNotifications };