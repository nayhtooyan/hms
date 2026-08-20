const router = require("express").Router();

const {
  getBoard,
  getTasks,
  createTask,
  startTask,
  completeTask,
  cancelTask,
  updateRoomStatus
} = require("../controllers/housekeeping.controller");

const {
  authenticate,
  requirePermission
} = require("../middleware/auth");

router.use(authenticate);

router.get(
  "/board",
  requirePermission("housekeeping.view"),
  getBoard
);

router.get(
  "/tasks",
  requirePermission("housekeeping.view"),
  getTasks
);

router.post(
  "/tasks",
  requirePermission("housekeeping.update"),
  createTask
);

router.post(
  "/tasks/:id/start",
  requirePermission("housekeeping.update"),
  startTask
);

router.post(
  "/tasks/:id/complete",
  requirePermission("housekeeping.update"),
  completeTask
);

router.post(
  "/tasks/:id/cancel",
  requirePermission("housekeeping.update"),
  cancelTask
);

router.patch(
  "/room-status/:roomId",
  requirePermission("housekeeping.update"),
  updateRoomStatus
);

module.exports = router;