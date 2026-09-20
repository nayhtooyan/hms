const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

/* URL prefix Mongoose model + display name */
const ENTITY_MAP = [
  { prefix: "/rooms", model: "Room", entity: "Room" },
  { prefix: "/reservations", model: "Reservation", entity: "Reservation" },
  { prefix: "/payments", model: "Payment", entity: "Payment" },
  { prefix: "/vouchers", model: "Voucher", entity: "Voucher" },
  { prefix: "/users", model: "User", entity: "User" },
  { prefix: "/housekeeping", model: "HousekeepingTask", entity: "Housekeeping" },
  { prefix: "/settings", model: "Settings", entity: "Settings" },
  { prefix: "/backups", model: "Backup", entity: "Backup" },
];

const SKIP_ENTITIES = ["Room"];

const objectIdLike = (s) => /^[0-9a-fA-F]{24}$/.test(s);

const sanitize = (obj) => {
  if (!obj || typeof obj !== "object") return obj || undefined;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  delete copy.password;
  return copy;
};

const deriveAction = (req, hasId) => {
  const p = req.path.toLowerCase();
  const m = req.method;
  if (p.endsWith("/check-in")) return "CHECK_IN";
  if (p.endsWith("/check-out")) return "CHECK_OUT";
  if (p.endsWith("/cancel")) return "CANCEL";
  if (p.endsWith("/start")) return "START";
  if (p.endsWith("/complete")) return "COMPLETE";
  if (p.endsWith("/restore")) return "RESTORE";
  if (m === "DELETE") return "DELETE";
  if (m === "POST") return hasId ? "UPDATE" : "CREATE";
  if (m === "PUT" || m === "PATCH") {
    if (p.includes("/status") || p.includes("/active")) return "UPDATE_STATUS";
    return "UPDATE";
  }
  return m;
};

const autoAudit = (req, res, next) => {
  // Never log read-only requests
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  try {
    const fullPath = (req.baseUrl || "") + req.path;
    const clean = fullPath.replace(/^\/api/, "");
    const entry = ENTITY_MAP.find((e) => clean.startsWith(e.prefix));
    if (!entry || SKIP_ENTITIES.includes(entry.entity)) return next();

    let Model;
    try {
      Model = mongoose.model(entry.model);
    } catch (e) {
      return next(); // model not registered 
    }

    const segments = clean.split("/").filter(Boolean);
    const idSegment = segments.slice(1).find(objectIdLike);
    const action = deriveAction(req, Boolean(idSegment));
    const ip = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers["user-agent"];

    const writeLog = (beforeDoc, afterDoc, entityId) => {
      // req.user is available here (set by authenticate during the request)
      if (!req.user) return Promise.resolve();
      return AuditLog.create({
        user: req.user._id,
        userName: req.user.name || "System",
        userRole: req.user.role || "system",
        action,
        entity: entry.entity,
        entityId: entityId || idSegment || undefined,
        before: sanitize(beforeDoc),
        after: sanitize(afterDoc),
        ipAddress: ip,
        userAgent,
      }).catch((e) => console.error("[AutoAudit] write failed:", e.message));
    };

    if (idSegment) {
      Model.findById(idSegment)
        .lean()
        .then((beforeDoc) => {
          res.on("finish", () => {
            Model.findById(idSegment)
              .lean()
              .then((afterDoc) => writeLog(beforeDoc, afterDoc, idSegment))
              .catch(() => {});
          });
          next();
        })
        .catch(() => next());
      return;
    }

    if (action === "CREATE") {
      let captured = null;
      const origJson = res.json.bind(res);
      res.json = (body) => {
        captured = body;
        return origJson(body);
      };
      res.on("finish", () => {
        const newId =
          captured?._id ||
          captured?.id ||
          captured?.backup?.id ||
          captured?.reservation?._id ||
          captured?.data?._id;
        if (!newId) {
          writeLog(null, sanitize(captured), null);
          return;
        }
        Model.findById(newId)
          .lean()
          .then((afterDoc) => writeLog(null, afterDoc, newId))
          .catch(() => writeLog(null, sanitize(captured), newId));
      });
      return next();
    }

    if (entry.prefix === "/settings") {
      Model.findOne()
        .lean()
        .then((beforeDoc) => {
          res.on("finish", () => {
            Model.findOne()
              .lean()
              .then((afterDoc) => writeLog(beforeDoc, afterDoc, afterDoc?._id))
              .catch(() => {});
          });
          next();
        })
        .catch(() => next());
      return;
    }

    return next();
  } catch (e) {
    console.error("[AutoAudit] setup error:", e.message);
    return next();
  }
};

module.exports = autoAudit;