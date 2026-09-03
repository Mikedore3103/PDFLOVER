/**
 * User Model
 *
 * Represents registered users in the system.
 * Supports free and pro plans with usage tracking.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'pro', 'premium'],
    default: 'free'
  },
  currentPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    default: null
  },
  subscriptionStatus: {
    type: String,
    enum: ['inactive', 'pending', 'active', 'past_due', 'cancelled', 'expired'],
    default: 'inactive'
  },
  subscriptionStartedAt: {
    type: Date,
    default: null
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null
  },
  paymentCustomerReference: {
    type: String,
    default: null
  },
  paymentSubscriptionReference: {
    type: String,
    default: null
  },
  lastSuccessfulPaymentAt: {
    type: Date,
    default: null
  },
  dailyUsageCount: {
    type: Number,
    default: 0
  },
  lastUsageReset: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Update the updatedAt field before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to reset daily usage
userSchema.methods.resetDailyUsage = function() {
  this.dailyUsageCount = 0;
  this.lastUsageReset = Date.now();
  return this.save();
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema);