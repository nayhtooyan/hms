const router = require("express").Router();

const {
  getSettings,
  updateSettings,
  uploadLogo,
  removeLogo
} = require("../controllers/setting.controller");

const { uploadLogo: uploadLogoMiddleware } = require("../middleware/upload");
const { authenticate, requirePermission } = require("../middleware/auth");

// ✅ GET settings is PUBLIC — needed for login page & sidebar before login
router.get("/", getSettings);

// ✅ Everything that changes settings still requires admin auth
router.put("/", authenticate, requirePermission("settings.manage"), updateSettings);
router.post("/logo", authenticate, requirePermission("settings.manage"), uploadLogoMiddleware, uploadLogo);
router.delete("/logo", authenticate, requirePermission("settings.manage"), removeLogo);

module.exports = router;