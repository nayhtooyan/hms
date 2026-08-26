const router = require("express").Router();

const multer = require("multer");

const {
  createBackup,
  listBackups,
  downloadBackup,
  deleteBackup,
  restoreBackup
} = require("../controllers/backup.controller");

const {
  authenticate,
  requirePermission
} = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024
  }
});

router.use(authenticate);

router.post(
  "/create",
  requirePermission("backups.manage"),
  createBackup
);

router.get(
  "/",
  requirePermission("backups.manage"),
  listBackups
);

router.get(
  "/download/:filename",
  requirePermission("backups.manage"),
  downloadBackup
);

router.delete(
  "/:filename",
  requirePermission("backups.manage"),
  deleteBackup
);

router.post(
  "/restore",
  requirePermission("backups.manage"),
  upload.single("backup"),
  restoreBackup
);

module.exports = router;