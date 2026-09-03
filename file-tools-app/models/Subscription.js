const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
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
  status: {
    type: String,
    enum: ['inactive', 'pending', 'active', 'past_due', 'cancelled', 'expired'],
    default: 'inactive',
    index: true
  },
  startedAt: Date,
  expiresAt: Date,
  customerReference: String,
  subscriptionReference: String,
  lastPaymentAt: Date,
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ subscriptionReference: 1 }, { sparse: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
