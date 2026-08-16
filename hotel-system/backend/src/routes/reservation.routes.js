const router = require("express").Router();

const {
  getReservations,
  getReservation,
  createReservation,
  checkInReservation,
  checkOutReservation,
  cancelReservation
} = require("../controllers/reservation.controller");

const {
  authenticate,
  requirePermission
} = require("../middleware/auth");

router.use(authenticate);

router.get(
  "/",
  requirePermission("reservations.view"),
  getReservations
);

router.post(
  "/",
  requirePermission("reservations.create"),
  createReservation
);

router.get(
  "/:id",
  requirePermission("reservations.view"),
  getReservation
);

router.post(
  "/:id/check-in",
  requirePermission("reservations.checkin"),
  checkInReservation
);

router.post(
  "/:id/check-out",
  requirePermission("reservations.checkout"),
  checkOutReservation
);

router.post(
  "/:id/cancel",
  requirePermission("reservations.cancel"),
  cancelReservation
);

module.exports = router;