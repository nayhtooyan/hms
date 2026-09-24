const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    type: String,
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "info"
    },
    titleKey: String,
    messageKey: String,
    params: { type: Object, default: {} },
    roles: [String],
    link: String,
    dedupeKey: { type: String, index: true },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    resolvedAt: Date,
    expiresAt: Date
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ resolvedAt: 1 });

module.exports = mongoose.model("Notification", notificationSchema);