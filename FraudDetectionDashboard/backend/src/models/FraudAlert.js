const mongoose = require('mongoose');

const fraudAlertSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    accountId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    riskScore: {
      type: Number,
      required: true,
      index: true,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      required: true,
      index: true,
    },
    reasons: {
      type: [String],
      default: [],
    },
    timestamp: {
      type: Number,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

fraudAlertSchema.index({ riskScore: -1, timestamp: -1 });
fraudAlertSchema.index({ accountId: 1, riskScore: -1 });

module.exports = mongoose.model('FraudAlert', fraudAlertSchema);
