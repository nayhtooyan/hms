const router = require("express").Router();

const {
  getReportsOverview
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

module.exports = router;