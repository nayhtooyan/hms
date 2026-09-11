const { emitEvent } = require("../utils/socketEmit");
const Reservation = require("../models/Reservation");
const Room = require("../models/Room");
const Voucher = require("../models/Voucher"); // Added for voucher support
const HousekeepingTask = require("../models/HousekeepingTask");

const asyncHandler = require("../utils/asyncHandler");

const generateBookingNo = () => {
  const datePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `BK-${datePart}-${randomPart}`;
};

const isRoomAvailable = async ({ roomId, checkIn, checkOut, excludeId }) => {
  const query = {
    roomId,
    status: {
      $in: ["reserved", "checked_in"]
    },
    scheduledCheckIn: {
      $lt: checkOut
    },
    scheduledCheckOut: {
      $gt: checkIn
    }
  };

  if (excludeId) {
    query._id = {
      $ne: excludeId
    };
  }

  const existing = await Reservation.findOne(query);

  return !existing;
};

const getReservations = asyncHandler(async (req, res) => {
  const reservations = await Reservation.find()
    .populate("roomId", "roomNumber status basePrice")
    .sort({
      createdAt: -1
    });

  res.json(reservations);
});

const getReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id).populate(
    "roomId",
    "roomNumber status basePrice"
  );

  if (!reservation) {
    return res.status(404).json({
      message: "Reservation not found"
    });
  }

  res.json(reservation);
});

const createReservation = asyncHandler(async (req, res) => {
  const {
    roomId,
    guest,
    source,
    scheduledCheckIn,
    scheduledCheckOut,
    adults,
    children,
    extraBeds,
    voucherId 
  } = req.body;

  if (!roomId || !scheduledCheckIn || !scheduledCheckOut) {
    return res.status(400).json({
      message: "roomId, scheduledCheckIn and scheduledCheckOut are required"
    });
  }

  const checkIn = new Date(scheduledCheckIn);
  const checkOut = new Date(scheduledCheckOut);

  if (checkOut <= checkIn) {
    return res.status(400).json({
      message: "Check-out must be after check-in"
    });
  }

  const room = await Room.findOne({
    _id: roomId,
    active: true
  });

  if (!room) {
    return res.status(404).json({
      message: "Room not found"
    });
  }

  const available = await isRoomAvailable({
    roomId,
    checkIn,
    checkOut
  });

  if (!available) {
    return res.status(400).json({
      message: "Room is not available for selected dates"
    });
  }

  const nights = Math.max(
    1,
    Math.ceil((checkOut - checkIn) / (24 * 60 * 60 * 1000))
  );

  const extraBedsCount = Number(extraBeds || 0);
  const roomCharge = nights * Number(room.basePrice || 0);
  const extraBedCharge = extraBedsCount * nights * Number(room.extraBedPrice || 0);
  
  let subtotal = roomCharge + extraBedCharge;
  let voucherDiscount = 0;
  let appliedVoucherId = null;
  let appliedVoucherCode = "";

  // Apply Voucher if provided
  if (voucherId) {
    const voucher = await Voucher.findById(voucherId);
    if (voucher && voucher.active) {
      if (voucher.type === "fixed") {
        voucherDiscount = voucher.value;
      } else if (voucher.type === "percentage") {
        voucherDiscount = subtotal * (voucher.value / 100);
        if (voucher.maxDiscount > 0 && voucherDiscount > voucher.maxDiscount) {
          voucherDiscount = voucher.maxDiscount;
        }
      }
      
      // Ensure discount doesn't exceed subtotal
      if (voucherDiscount > subtotal) voucherDiscount = subtotal;
      
      appliedVoucherId = voucher._id;
      appliedVoucherCode = voucher.code;
      
      // Increment usage count
      await Voucher.findByIdAndUpdate(voucher._id, { $inc: { usedCount: 1 } });
    }
  }

  const total = subtotal - voucherDiscount;

  const reservation = await Reservation.create({
    bookingNo: generateBookingNo(),
    roomId,
    guest,
    source,
    status: "reserved",
    scheduledCheckIn: checkIn,
    scheduledCheckOut: checkOut,
    adults: Number(adults || 1),
    children: Number(children || 0),
    extraBeds: extraBedsCount,
    voucherId: appliedVoucherId,
    voucherCode: appliedVoucherCode,
    priceSnapshot: {
      nights,
      roomCharge,
      extraBedCharge,
      overtimeCharge: 0,
      voucherDiscount: Math.round(voucherDiscount * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: "USD"
    },
    createdBy: req.user._id
  });

  if (room.status === "available") {
    room.status = "reserved";
    await room.save();
  }

  const populated = await reservation.populate(
    "roomId",
    "roomNumber status basePrice"
  );

  emitEvent(req, "reservations:updated", { action: "created", reservationId: populated._id });
  emitEvent(req, "rooms:updated", { action: "status_changed" });
  emitEvent(req, "dashboard:updated", { action: "data_changed" });
  res.status(201).json(populated);
});

// Check IN Res
const checkInReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return res.status(404).json({
      message: "Reservation not found"
    });
  }

  if (reservation.status !== "reserved") {
    return res.status(400).json({
      message: "Only reserved bookings can be checked in"
    });
  }

  reservation.status = "checked_in";
  reservation.actualCheckIn = new Date();

  await reservation.save();

  await Room.findByIdAndUpdate(reservation.roomId, {
    status: "occupied"
  });

  const populated = await reservation.populate(
    "roomId",
    "roomNumber status basePrice"
  );

  emitEvent(req, "reservations:updated", { action: "checked_in", reservationId: populated._id });
  emitEvent(req, "rooms:updated", { action: "status_changed" });
  emitEvent(req, "dashboard:updated", { action: "data_changed" });
  res.json(populated);
});

//Check out res
const checkOutReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return res.status(404).json({
      message: "Reservation not found"
    });
  }

  if (reservation.status !== "checked_in") {
    return res.status(400).json({
      message: "Only checked-in bookings can be checked out"
    });
  }

  const room = await Room.findById(reservation.roomId);

  const actualCheckOut = new Date();

  let overtimeCharge = 0;

  if (room && actualCheckOut > reservation.scheduledCheckOut) {
    const ms = actualCheckOut - reservation.scheduledCheckOut;

    const hours = Math.max(1, Math.ceil(ms / (1000 * 60 * 60)));

    overtimeCharge = hours * Number(room.overtimeHourlyRate || 0);
  }

  reservation.status = "checked_out";
  reservation.actualCheckOut = actualCheckOut;

  reservation.priceSnapshot = reservation.priceSnapshot || {};

  reservation.priceSnapshot.overtimeCharge = overtimeCharge;

  reservation.priceSnapshot.total =
    Number(reservation.priceSnapshot.roomCharge || 0) +
    Number(reservation.priceSnapshot.extraBedCharge || 0) +
    Number(overtimeCharge) -
    Number(reservation.priceSnapshot.voucherDiscount || 0);

  await reservation.save();

  await Room.findByIdAndUpdate(reservation.roomId, {
  status: "cleaning"
});

  await HousekeepingTask.create({
    roomId: reservation.roomId,
    type: "cleaning",
    priority: "high",
    status: "pending",
    notes: "Auto-created after checkout",
    createdBy: req.user._id
  });

  const populated = await reservation.populate(
    "roomId",
    "roomNumber status basePrice"
  );

  emitEvent(req, "reservations:updated", { action: "checked_out", reservationId: populated._id });
  emitEvent(req, "rooms:updated", { action: "status_changed" });
  emitEvent(req, "housekeeping:updated", { action: "auto_task_created" });
  emitEvent(req, "dashboard:updated", { action: "data_changed" });
  res.json(populated);
});

//Cancel Res
const cancelReservation = asyncHandler(async (req, res) => {
  const reservation = await Reservation.findById(req.params.id);

  if (!reservation) {
    return res.status(404).json({
      message: "Reservation not found"
    });
  }

  if (reservation.status !== "reserved") {
    return res.status(400).json({
      message: "Only reserved bookings can be cancelled"
    });
  }

  reservation.status = "cancelled";
  reservation.cancelledAt = new Date();
  reservation.cancellationReason = req.body.reason || "";

  await reservation.save();

  await Room.findByIdAndUpdate(reservation.roomId, {
    status: "available"
  });

  const populated = await reservation.populate(
    "roomId",
    "roomNumber status basePrice"
  );

  emitEvent(req, "reservations:updated", { action: "cancelled", reservationId: populated._id });
  emitEvent(req, "rooms:updated", { action: "status_changed" });
  emitEvent(req, "dashboard:updated", { action: "data_changed" });
  res.json(populated);
});

module.exports = {
  getReservations,
  getReservation,
  createReservation,
  checkInReservation,
  checkOutReservation,
  cancelReservation
};