const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const getAuditLogs = asyncHandler(async (req, res) => {
  const filter = {};

  if (req.query.userId) filter.userId = req.query.userId;
  if (req.query.entity) filter.entity = req.query.entity;
  if (req.query.action) filter.action = req.query.action;

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) filter.createdAt.$lte = new Date(`${req.query.to}T23:59:59.999`);
  }

  const logs = await AuditLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(1000) // Limit to prevent loading too much data at once
    .lean();

  // Get unique users for the frontend filter dropdown
  const users = await User.find({}).select("name username role").lean();

  res.json({ logs, users });
});

module.exports = { getAuditLogs };