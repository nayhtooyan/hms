const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, unique: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
    guest: { name: String, phone: String, idNumber: String, notes: String },
    source: { type: String, enum: ["walk_in", "phone", "online", "agent", "other"], default: "walk_in" },
    status: { type: String, enum: ["reserved", "checked_in", "checked_out", "cancelled"], default: "reserved" },
    scheduledCheckIn: { type: Date, required: true },
    scheduledCheckOut: { type: Date, required: true },
    actualCheckIn: Date,
    actualCheckOut: Date,
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    extraBeds: { type: Number, default: 0 },
    
    // Voucher tracking
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher" },
    voucherCode: { type: String }, // Keep a text copy in case voucher is deleted later

    priceSnapshot: {
      nights: Number,
      roomCharge: Number,
      extraBedCharge: Number,
      overtimeCharge: { type: Number, default: 0 },
      voucherDiscount: { type: Number, default: 0 }, 
      total: Number,
      currency: { type: String, default: "USD" }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelledAt: Date,
    cancellationReason: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Reservation", reservationSchema);