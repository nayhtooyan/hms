const router = require("express").Router();

const {
  getSettings,
  updateSettings
} = require("../controllers/setting.controller");

const {
  authenticate,
  requirePermission
} = require("../middleware/auth");

router.get(
  "/",
  authenticate,
  getSettings
);

router.put(
  "/",
  authenticate,
  requirePermission("settings.manage"),
  updateSettings
);

module.exports = router;