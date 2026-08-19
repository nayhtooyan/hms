const router = require("express").Router();

const {
  getPayments,
  getPaymentsByReservation,
  createPayment,
  getInvoiceData
} = require("../controllers/payment.controller");

const {
  authenticate,
  requirePermission
} = require("../middleware/auth");

router.use(authenticate);

router.get(
  "/",
  requirePermission("payments.view"),
  getPayments
);

router.get(
  "/invoice/:reservationId",
  requirePermission("payments.view"),
  getInvoiceData
);

router.get(
  "/reservation/:reservationId",
  requirePermission("payments.view"),
  getPaymentsByReservation
);

router.post(
  "/",
  requirePermission("payments.create"),
  createPayment
);

module.exports = router;