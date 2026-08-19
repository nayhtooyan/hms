const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    receiptNo: {
      type: String,
      unique: true
    },

    reservationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reservation",
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    method: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "other"],
      default: "cash"
    },

    status: {
      type: String,
      enum: ["completed", "refunded"],
      default: "completed"
    },

    reference: String,

    note: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("Payment", paymentSchema);