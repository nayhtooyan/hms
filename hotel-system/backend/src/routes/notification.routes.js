const router = require("express").Router();

const {
  getNotifications,
  markRead,
  markAllRead
} = require("../controllers/notification.controller");

const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", getNotifications);
router.post("/read-all", markAllRead);
router.post("/:id/read", markRead);

module.exports = router;