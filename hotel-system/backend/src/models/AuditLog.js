const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userName: String,
    userRole: String,
    action: { type: String, required: true }, // e.g., CREATE, UPDATE, DELETE, CHECK_IN
    entity: { type: String, required: true }, // e.g., Room, Reservation, User
    entityId: String,
    before: Object,
    after: Object,
    ipAddress: String,
    userAgent: String
  },
  { 
    timestamps: { createdAt: true, updatedAt: false } 
  }
);

// Indexes for fast searching
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ entity: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);