const AuditLog = require("../models/AuditLog");

const logAudit = async (req, action, entity, entityId, before = null, after = null) => {
  try {
    await AuditLog.create({
      userId: req.user?._id,
      userName: req.user?.name || "System",
      userRole: req.user?.role || "system",
      action,
      entity,
      entityId: String(entityId),
      before,
      after,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || req.connection?.remoteAddress,
      userAgent: req.headers["user-agent"]
    });
  } catch (error) {
    // We don't want audit log errors to crash the main app
    console.error("Audit log error:", error);
  }
};

module.exports = { logAudit };