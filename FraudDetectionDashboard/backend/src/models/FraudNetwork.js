const mongoose = require('mongoose');

const fraudNetworkSchema = new mongoose.Schema(
  {
    networkId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    accounts: {
      type: [String],
      default: [],
    },
    suspiciousTransactions: {
      type: [String],
      default: [],
    },
    cycleDetected: {
      type: Boolean,
      default: false,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true,
    },
    riskIndicators: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

fraudNetworkSchema.index({ riskLevel: 1, cycleDetected: 1 });

module.exports = mongoose.model('FraudNetwork', fraudNetworkSchema);
