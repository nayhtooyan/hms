const mongoose = require("mongoose");

const housekeepingTaskSchema = new mongoose.Schema(
  {
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    type: {
      type: String,
      enum: ["cleaning", "maintenance", "inspection"],
      default: "cleaning"
    },

    priority: {
      type: String,
      enum: ["low", "normal", "high", "urgent"],
      default: "normal"
    },

    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending"
    },

    notes: String,

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    completedAt: Date
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("HousekeepingTask", housekeepingTaskSchema);