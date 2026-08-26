const jwt = require("jsonwebtoken");
const User = require("../models/User");

const rolePermissions = {
  admin: ["*"],

  manager: [
    "rooms.*",
    "reservations.*",
    "vouchers.*",
    "payments.*",
    "housekeeping.*",
    "users.view",
    "reports.view",
    "backups.manage"
  ],

  reception: [
    "rooms.view",
    "reservations.view",
    "reservations.create",
    "reservations.checkin",
    "reservations.checkout",
    "reservations.cancel",
    "vouchers.view",
    "vouchers.validate",
    "payments.view",
    "payments.create",
    "housekeeping.view",
    "reports.view"
  ],

  cleaner: [
    "rooms.view",
    "housekeeping.view",
    "housekeeping.update"
  ],

  maintenance: [
    "rooms.view",
    "housekeeping.view",
    "housekeeping.update"
  ]
};

const hasPermission = (user, permission) => {
  const permissions = user.permissions?.length
    ? user.permissions
    : rolePermissions[user.role] || [];

  if (permissions.includes("*")) return true;

  if (permissions.includes(permission)) return true;

  return permissions.some((p) => {
    if (!p.endsWith(".*")) return false;

    const prefix = p.slice(0, -1);

    return permission.startsWith(prefix);
  });
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";

    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!token) {
      return res.status(401).json({
        message: "No token provided"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.sub);

    if (!user || !user.active) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Unauthorized"
    });
  }
};

const requirePermission = (permissions) => {
  const requiredPermissions = Array.isArray(permissions)
    ? permissions
    : [permissions];

  return (req, res, next) => {
    const allowed = requiredPermissions.some((permission) =>
      hasPermission(req.user, permission)
    );

    if (!allowed) {
      return res.status(403).json({
        message: "Forbidden"
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  requirePermission
};