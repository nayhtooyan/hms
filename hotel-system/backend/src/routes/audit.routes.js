const router = require("express").Router();
const { getAuditLogs } = require("../controllers/audit.controller");
const { authenticate, requirePermission } = require("../middleware/auth");

router.use(authenticate);

router.get("/", requirePermission("audit.view"), getAuditLogs);

module.exports = router;