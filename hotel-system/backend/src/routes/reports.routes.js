const router = require("express").Router();

const {
  getReportsOverview,
  getGuestReport,
  getPaymentReport,
  exportReport
} = require("../controllers/reports.controller");

const { authenticate, requirePermission } = require("../middleware/auth");

router.use(authenticate);

router.get("/overview", requirePermission("reports.view"), getReportsOverview);
router.get("/guests", requirePermission("reports.view"), getGuestReport);
router.get("/payments", requirePermission("reports.view"), getPaymentReport);
router.get("/export/:type", requirePermission("reports.view"), exportReport);

module.exports = router;