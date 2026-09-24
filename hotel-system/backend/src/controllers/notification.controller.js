const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");

const RESOLVE_FADE_MS = 3 * 60 * 1000; // 3 minutes

const getNotifications = asyncHandler(async (req, res) => {
  const now = new Date();
  const resolvedWindow = new Date(Date.now() - RESOLVE_FADE_MS);

  const list = await Notification.find({
    roles: req.user.role,
    $and: [
      { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] },
      { $or: [{ resolvedAt: null }, { resolvedAt: { $gt: resolvedWindow } }] }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const withRead = list.map((n) => ({
    ...n,
    isResolved: Boolean(n.resolvedAt),
    isRead: (n.readBy || []).some((id) => String(id) === String(req.user._id))
  }));

  res.json({
    notifications: withRead,
    unread: withRead.filter((n) => !n.isRead && !n.isResolved).length
  });
});

const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne(
    { _id: req.params.id },
    { $addToSet: { readBy: req.user._id } }
  );
  res.json({ success: true });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { roles: req.user.role, resolvedAt: null, readBy: { $ne: req.user._id } },
    { $addToSet: { readBy: req.user._id } }
  );
  res.json({ success: true });
});

module.exports = { getNotifications, markRead, markAllRead };