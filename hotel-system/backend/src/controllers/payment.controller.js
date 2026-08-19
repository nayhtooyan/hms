const Payment = require("../models/Payment");
const Reservation = require("../models/Reservation");

const asyncHandler = require("../utils/asyncHandler");

const generateReceiptNo = () => {
  const datePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `PAY-${datePart}-${randomPart}`;
};

const getPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find()
    .sort({
      createdAt: -1
    })
    .populate({
      path: "reservationId",
      select: "bookingNo guest status roomId priceSnapshot",
      populate: {
        path: "roomId",
        select: "roomNumber roomType"
      }
    })
    .populate("createdBy", "name username");

  res.json(payments);
});

const getPaymentsByReservation = asyncHandler(async (req, res) => {
  const payments = await Payment.find({
    reservationId: req.params.reservationId
  }).sort({
    createdAt: -1
  });

  res.json(payments);
});

const createPayment = asyncHandler(async (req, res) => {
  const { reservationId, amount, method, reference, note } = req.body;

  if (!reservationId || amount === undefined) {
    return res.status(400).json({
      message: "reservationId and amount are required"
    });
  }

  const amountNumber = Number(amount);

  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return res.status(400).json({
      message: "Amount must be greater than zero"
    });
  }

  const reservation = await Reservation.findById(reservationId);

  if (!reservation) {
    return res.status(404).json({
      message: "Reservation not found"
    });
  }

  if (reservation.status === "cancelled") {
    return res.status(400).json({
      message: "Cannot take payment for a cancelled reservation"
    });
  }

  const completedPayments = await Payment.find({
    reservationId,
    status: "completed"
  });

  const paidAmount = completedPayments.reduce((sum, payment) => {
    return sum + Number(payment.amount || 0);
  }, 0);

  const totalAmount = Number(reservation.priceSnapshot?.total || 0);

  const balance = totalAmount - paidAmount;

  if (amountNumber > balance) {
    return res.status(400).json({
      message: `Payment amount exceeds remaining balance. Remaining balance is ${balance}`
    });
  }

  const payment = await Payment.create({
    receiptNo: generateReceiptNo(),
    reservationId,
    amount: amountNumber,
    method,
    reference,
    note,
    status: "completed",
    createdBy: req.user._id
  });

  const populated = await payment.populate({
    path: "reservationId",
    select: "bookingNo guest status roomId priceSnapshot",
    populate: {
      path: "roomId",
      select: "roomNumber roomType"
    }
  });

  res.status(201).json(populated);
});

const getInvoiceData = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.reservationId)
    .populate("roomId", "roomNumber roomType floor basePrice")
    .populate("createdBy", "name username");

  if (!reservation) {
    return res.status(404).json({
      message: "Reservation not found"
    });
  }

  const payments = await Payment.find({
    reservationId: reservation._id,
    status: "completed"
  }).sort({
    createdAt: 1
  });

  const total = Number(reservation.priceSnapshot?.total || 0);

  const paid = payments.reduce((sum, payment) => {
    return sum + Number(payment.amount || 0);
  }, 0);

  const balance = total - paid;

  res.json({
    reservation,
    payments,
    total,
    paid,
    balance
  });
});

module.exports = {
  getPayments,
  getPaymentsByReservation,
  createPayment,
  getInvoiceData
};