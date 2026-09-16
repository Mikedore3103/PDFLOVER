const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema({
  provider: {
    type: String,
    required: true
  },
  eventId: {
    type: String,
    required: true
  },
  eventType: String,
  processedAt: Date,
  payload: mongoose.Schema.Types.Mixed
}, { timestamps: true });

webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('WebhookEvent', webhookEventSchema);
