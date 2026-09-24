const mongoose = require("mongoose");

const backupSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      default: 0
    },
    sizeFormatted: String,
    storageLocations: [{
      type: {
        type: String,
        enum: ["local", "r2"],
        required: true
      },
      path: String,
      uploadedAt: Date,
      success: {
        type: Boolean,
        default: false
      },
      errorMessage: String
    }],
    status: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending"
    },
    duration: Number,
    encrypted: {
      type: Boolean,
      default: true
    },
    encryptionAlgorithm: {
      type: String,
      default: "aes-256-gcm"
    },
    databaseInfo: {
      collections: Number,
      documents: Number,
      dbSize: Number
    },
    triggeredBy: {
      type: String,
      enum: ["system", "admin"],
      default: "system"
    },
    triggeredByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    errorMessage: String,
    errorStack: String,
    retentionDays: {
      type: Number,
      default: 7
    },
    expiresAt: Date,
    notificationSent: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

backupSchema.index({ createdAt: -1 });
backupSchema.index({ status: 1 });
backupSchema.index({ expiresAt: 1 });

backupSchema.methods.isExpired = function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model("Backup", backupSchema);