const router = require("express").Router();

const {
  getRooms,
  createRoom,
  updateRoom,
  updateRoomStatus,
  deleteRoom
} = require("../controllers/room.controller");

const {
  authenticate,
  requirePermission
} = require("../middleware/auth");

router.use(authenticate);

router.get(
  "/",
  requirePermission("rooms.view"),
  getRooms
);

router.post(
  "/",
  requirePermission("rooms.create"),
  createRoom
);

router.patch(
  "/:id",
  requirePermission("rooms.edit"),
  updateRoom
);

router.patch(
  "/:id/status",
  requirePermission("rooms.edit"),
  updateRoomStatus
);

router.delete(
  "/:id",
  requirePermission("rooms.delete"),
  deleteRoom
);

module.exports = router;