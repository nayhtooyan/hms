const router = require("express").Router();

const {
  getDashboardSummary
} = require("../controllers/dashboard.controller");

const {
  authenticate
} = require("../middleware/auth");

router.use(authenticate);

router.get("/summary", getDashboardSummary);

module.exports = router;