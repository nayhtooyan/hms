const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    type: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed"
    },
    value: {
      type: Number,
      required: true // e.g. 50 for $50 off, or 20 for 20% off
    },
    maxDiscount: {
      type: Number,
      default: 0 // Useful for percentage vouchers (e.g. max $100 off)
    },
    validFrom: {
      type: Date,
      required: true
    },
    validTo: {
      type: Date,
      required: true
    },
    usageLimit: {
      type: Number,
      default: 1
    },
    usedCount: {
      type: Number,
      default: 0
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Voucher", voucherSchema);