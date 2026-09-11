const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    sender: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    receiver: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    timestamp: {
      type: Number,
      required: true,
      index: true,
    },
    deviceId: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    riskScore: {
      type: Number,
      default: 0,
    },
    riskLevel: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
      index: true,
    },
    isFraud: {
      type: Boolean,
      default: false,
      index: true,
    },
    reasons: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // auto adds createdAt, updatedAt
  }
);

// Compound indexes for optimal query execution on historical search & filtering
transactionSchema.index({ timestamp: -1, riskLevel: 1 });
transactionSchema.index({ sender: 1, timestamp: -1 });
transactionSchema.index({ receiver: 1, timestamp: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
