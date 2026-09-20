const Payment = require("../models/Payment");
const Reservation = require("../models/Reservation");
const asyncHandler = require("../utils/asyncHandler");
const { emitEvent } = require("../utils/socketEmit");

//  HELPERS
const generateReceiptNo = async () => {
  const count = await Payment.countDocuments();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `PAY-${String(count + 1).padStart(4, "0")}-${rand}`;
};

//  CREATE PAYMENT 
const createPayment = asyncHandler(async (req, res) => {
  const { reservationId, amount, method, reference, note } = req.body;

  if (!reservationId || !amount || Number(amount) <= 0) {
    return res.status(400).json({
      message: "Reservation and a valid amount are required"
    });
  }

  const reservation = await Reservation.findById(reservationId);
  if (!reservation) {
    return res.status(404).json({ message: "Reservation not found" });
  }

  const payment = await Payment.create({
    reservationId,
    amount: Number(amount),
    method: method || "cash",
    reference: reference || "",
    note: note || "",
    receiptNo: await generateReceiptNo(),
    status: "completed"
  });

  // Real-time updates
  emitEvent(req, "payments:updated", { action: "created", paymentId: payment._id });
  emitEvent(req, "reservations:updated", { action: "payment_added" });
  emitEvent(req, "dashboard:updated", { action: "data_changed" });

  res.status(201).json(payment);
});

// ===== GET ALL PAYMENTS =====
const getPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find()
    .sort({ createdAt: -1 })
    .populate({
      path: "reservationId",
      select: "bookingNo guest roomId",
      populate: { path: "roomId", select: "roomNumber roomType" }
    })
    .lean();

  res.json(payments);
});

const getInvoice = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.reservationId)
    .populate({
      path: "roomId",
      select:
        "roomNumber roomType floor maxGuests basePrice extraBedPrice extraPersonPrice overtimeHourlyRate"
    })
    .lean();

  if (!reservation) {
    return res.status(404).json({ message: "Reservation not found" });
  }

  const payments = await Payment.find({
    reservationId: reservation._id,
    status: "completed"
  })
    .sort({ createdAt: 1 })
    .lean();

  const total = Number(reservation.priceSnapshot?.total || 0);
  const paid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const balance = total - paid;

  res.json({ reservation, payments, total, paid, balance });
});

module.exports = {
  createPayment,
  getPayments,
  getInvoice
};