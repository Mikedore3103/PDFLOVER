const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    enum: ['free', 'pro', 'premium']
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    default: 'NGN'
  },
  dailyConversionLimit: {
    type: Number,
    required: true,
    min: -1
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
