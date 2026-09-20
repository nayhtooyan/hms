const router = require("express").Router();

const {
  createPayment,
  getPayments,
  getInvoice
} = require("../controllers/payment.controller");

const { authenticate, requirePermission } = require("../middleware/auth");

router.use(authenticate);

// List all payments
router.get("/", requirePermission("payments.view"), getPayments);

// Invoice for a reservation
router.get("/invoice/:reservationId", requirePermission("payments.view"), getInvoice);

// Record a payment
router.post("/", requirePermission("payments.create"), createPayment);

module.exports = router;