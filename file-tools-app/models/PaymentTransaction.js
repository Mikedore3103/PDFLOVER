const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  provider: {
    type: String,
    required: true,
    trim: true
  },
  reference: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'successful', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
    index: true
  },
  paidAt: Date,
  providerReference: mongoose.Schema.Types.Mixed
}, { timestamps: true });

paymentTransactionSchema.index({ provider: 1, reference: 1 }, { unique: true });

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
