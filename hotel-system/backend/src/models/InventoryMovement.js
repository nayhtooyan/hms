const mongoose = require("mongoose");

const inventoryMovementSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true },
    type: { type: String, enum: ["in", "out", "adjust"], required: true },
    qty: { type: Number, required: true },
    change: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    reason: { type: String, required: true },
    note: { type: String, default: "" },
    unitPrice: { type: Number, default: 0 },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    performedByName: { type: String, default: "" }
  },
  { timestamps: true }
);

inventoryMovementSchema.index({ itemId: 1, createdAt: -1 });

module.exports = mongoose.model("InventoryMovement", inventoryMovementSchema);