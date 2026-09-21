const mongoose = require("mongoose");

const settingSchema = new mongoose.Schema(
  {
    hotelName: { type: String, default: "" },
    contactEmail: { type: String, default: "" },
    contactPhone: { type: String, default: "" },
    address: { type: String, default: "" },

    language: { type: String, default: "en" },
    currency: { type: String, default: "USD" },
    currencySymbol: { type: String, default: "$" },
    timezone: { type: String, default: "Auto" },

    checkInTime: { type: String, default: "14:00" },
    checkOutTime: { type: String, default: "12:00" },
    taxRate: { type: Number, default: 0 },
    overtimeGraceMinutes: { type: Number, default: 0 },
    invoiceFooter: { type: String, default: "" },

    // NEW: hotel logo path
    logoUrl: { type: String, default: "" }
  },
  { timestamps: true }
);

// Force collection name so existing settings data is never lost
module.exports = mongoose.model("Setting", settingSchema, "settings");