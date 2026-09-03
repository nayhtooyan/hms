const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    floor: {
      type: Number,
      default: 1
    },
    roomType: {
      type: String,
      default: "Standard"
    },
    maxGuests: {
      type: Number,
      default: 2
    },
    status: {
      type: String,
      enum: [
        "available",
        "occupied",
        "reserved",
        "cleaning",
        "maintenance",
        "blocked"
      ],
      default: "available"
    },
    basePrice: {
      type: Number,
      default: 0
    },
    extraBedPrice: {
      type: Number,
      default: 0
    },
    extraPersonPrice: {
      type: Number,
      default: 0
    },
    overtimeHourlyRate: {
      type: Number,
      default: 0
    },
    amenities: [String],
    notes: String,
    active: {
      type: Boolean,
      default: true
    },
    deletedAt: Date
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Room", roomSchema);