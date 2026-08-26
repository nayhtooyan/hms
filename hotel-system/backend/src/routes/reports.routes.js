const router = require("express").Router();

const {
  getReportsOverview,
  exportReport
} = require("../controllers/reports.controller");

const {
  authenticate,
  requirePermission
} = require("../middleware/auth");

router.use(authenticate);

router.get(
  "/overview",
  requirePermission("reports.view"),
  getReportsOverview
);

router.get(
  "/export/:type",
  requirePermission("reports.view"),
  exportReport
);

module.exports = router;