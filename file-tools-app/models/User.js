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
  plan: {
    type: String,
    enum: ['free', 'pro'],
    default: 'free'
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

// Instance method to check if daily limit exceeded
userSchema.methods.isLimitExceeded = function() {
  const limits = {
    free: 20,
    pro: -1 // unlimited
  };

  if (limits[this.plan] === -1) return false;
  return this.dailyUsageCount >= limits[this.plan];
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

module.exports = mongoose.model('User', userSchema);