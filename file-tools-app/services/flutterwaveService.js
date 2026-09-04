const crypto = require('crypto');
const mongoose = require('mongoose');
const PaymentTransaction = require('../models/PaymentTransaction');
const Subscription = require('../models/Subscription');
const Plan = require('../models/Plan');
const User = require('../models/User');
const WebhookEvent = require('../models/WebhookEvent');

const FLW_BASE_URL = process.env.FLW_BASE_URL || 'https://api.flutterwave.com';
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY;
const FLW_SECRET_HASH = process.env.FLW_SECRET_HASH;
const SUBSCRIPTION_DAYS = Number(process.env.FLW_SUBSCRIPTION_DAYS || 30);

function assertConfigured() {
  if (!FLW_SECRET_KEY || !FLW_SECRET_HASH || !process.env.FLW_REDIRECT_URL) {
    const error = new Error('Flutterwave payments are not configured on the server.');
    error.statusCode = 503;
    throw error;
  }
}

async function flutterwaveRequest(path, options = {}) {
  assertConfigured();
  const response = await fetch(`${FLW_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json();
  if (!response.ok || data.status !== 'success') {
    const error = new Error(data.message || 'Flutterwave request failed.');
    error.statusCode = response.status >= 500 ? 502 : 400;
    throw error;
  }
  return data;
}

function createReference(userId, planCode) {
  return `pdflover-${planCode}-${userId}-${crypto.randomUUID()}`;
}

async function initializePayment(user, plan) {
  if (plan.code === 'free' || plan.price <= 0) {
    const error = new Error('Only paid plans can start a payment.');
    error.statusCode = 400;
    throw error;
  }

  const reference = createReference(user._id.toString(), plan.code);
  const transaction = await PaymentTransaction.create({
    user: user._id,
    plan: plan._id,
    amount: plan.price,
    currency: plan.currency,
    provider: 'flutterwave',
    reference,
    status: 'pending'
  });
  console.log(`Flutterwave checkout created: ${reference}`);

  try {
    const result = await flutterwaveRequest('/v3/payments', {
      method: 'POST',
      headers: { 'X-Idempotency-Key': reference },
      body: JSON.stringify({
        tx_ref: reference,
        amount: plan.price,
        currency: plan.currency,
        redirect_url: process.env.FLW_REDIRECT_URL,
        payment_options: process.env.FLW_PAYMENT_OPTIONS || 'card,banktransfer,ussd',
        customer: {
          email: user.email,
          name: user.email
        },
        customizations: {
          title: process.env.FLW_CHECKOUT_TITLE || 'PDF Lover',
          description: `${plan.name} subscription`
        },
        meta: {
          userId: user._id.toString(),
          planCode: plan.code,
          transactionId: transaction._id.toString()
        }
      })
    });

    if (!result.data?.link) {
      throw new Error('Flutterwave did not return a checkout link.');
    }

    await PaymentTransaction.updateOne(
      { _id: transaction._id },
      { $set: { providerReference: result.data } }
    );
    return { reference, link: result.data.link };
  } catch (error) {
    await PaymentTransaction.updateOne(
      { _id: transaction._id },
      { $set: { status: 'failed', providerReference: { message: error.message } } }
    );
    throw error;
  }
}

function safeEquals(actual, expected) {
  if (!actual || !expected) return false;
  const actualBuffer = Buffer.from(String(actual));
  const expectedBuffer = Buffer.from(String(expected));
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function validSignature(rawBody, signature, verificationHash) {
  if (!FLW_SECRET_HASH) return false;

  // Flutterwave Standard sends the dashboard's Secret Hash as `verif-hash`.
  // Some newer webhook configurations use an HMAC SHA-256 value in
  // `flutterwave-signature`, so accept either verified format.
  if (safeEquals(verificationHash, FLW_SECRET_HASH)) return true;
  if (!rawBody || !signature) return false;
  const expected = crypto.createHmac('sha256', FLW_SECRET_HASH).update(rawBody).digest('base64');
  return safeEquals(signature, expected);
}

async function verifyTransaction(transactionId) {
  return flutterwaveRequest(`/v3/transactions/${encodeURIComponent(transactionId)}/verify`, { method: 'GET' });
}

function amountsMatch(actual, expected) {
  return Number(actual) === Number(expected);
}

function paymentValidationFailure(verifiedData, pending, user) {
  const status = String(verifiedData.status || '').toLowerCase();
  if (!['successful', 'succeeded'].includes(status)) return `Flutterwave reported status: ${status || 'missing'}`;
  if (verifiedData.tx_ref !== pending.reference) return 'Transaction reference did not match the checkout reference.';
  if (!amountsMatch(verifiedData.amount, pending.amount)) return `Amount mismatch: expected ${pending.amount}, received ${verifiedData.amount}.`;
  if (String(verifiedData.currency || '').toUpperCase() !== pending.currency) return `Currency mismatch: expected ${pending.currency}, received ${verifiedData.currency}.`;
  if (verifiedData.customer?.email && verifiedData.customer.email.toLowerCase() !== user.email.toLowerCase()) {
    return 'Customer email did not match the account that started checkout.';
  }
  return null;
}

async function processWebhook(payload) {
  const data = payload.data || {};
  const eventId = payload.id || payload.webhook_id || data.id;
  if (!eventId) {
    const error = new Error('Webhook event ID is missing.');
    error.statusCode = 400;
    throw error;
  }

  const existingEvent = await WebhookEvent.findOne({ provider: 'flutterwave', eventId });
  if (existingEvent?.processedAt) return { duplicate: true };
  if (!existingEvent) {
    await WebhookEvent.create({ provider: 'flutterwave', eventId, eventType: payload.type, payload });
  }

  const reference = data.tx_ref || data.reference;
  const transactionId = data.id;
  console.log(`Flutterwave webhook event received: type=${payload.type || 'unknown'}, reference=${reference || 'missing'}, transactionId=${transactionId || 'missing'}`);
  const pending = await PaymentTransaction.findOne({ provider: 'flutterwave', reference }).populate('plan');
  if (!pending) {
    console.warn(`Flutterwave payment transaction not found for reference: ${reference || 'missing'}`);
    throw new Error('Payment transaction not found.');
  }
  if (pending.status === 'successful') {
    await WebhookEvent.updateOne({ provider: 'flutterwave', eventId }, { $set: { processedAt: new Date() } });
    return { duplicate: true };
  }

  const user = await User.findById(pending.user);
  if (!user) throw new Error('Payment user not found.');

  const verified = await verifyTransaction(transactionId);
  const verifiedData = verified.data || {};
  const failureReason = paymentValidationFailure(verifiedData, pending, user);
  const valid = !failureReason;

  if (!valid) {
    const status = String(verifiedData.status || 'failed').toLowerCase();
    pending.status = ['cancelled', 'refunded'].includes(status) ? status : 'failed';
    pending.providerReference = {
      ...((pending.providerReference && typeof pending.providerReference === 'object') ? pending.providerReference : {}),
      verification: {
        transactionId: verifiedData.id,
        txRef: verifiedData.tx_ref,
        status: verifiedData.status,
        amount: verifiedData.amount,
        currency: verifiedData.currency
      },
      failureReason
    };
    await pending.save();
    console.warn(`Flutterwave payment ${pending.reference} failed validation: ${failureReason}`);
    await WebhookEvent.updateOne({ provider: 'flutterwave', eventId }, { $set: { processedAt: new Date() } });
    return { valid: false };
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);

  const session = await mongoose.startSession();
  let activated = false;
  try {
    await session.withTransaction(async () => {
      const claimed = await PaymentTransaction.findOneAndUpdate(
        { _id: pending._id, status: { $ne: 'successful' } },
        { $set: { status: 'successful', paidAt: now, providerReference: verifiedData } },
        { new: true, session }
      ).populate('plan');
      if (!claimed) return;

      await Subscription.updateMany(
        { user: user._id, status: { $in: ['active', 'pending'] } },
        { $set: { status: 'cancelled' } },
        { session }
      );
      await Subscription.create([{
        user: user._id,
        plan: pending.plan._id,
        status: 'active',
        startedAt: now,
        expiresAt,
        customerReference: verifiedData.customer?.id,
        subscriptionReference: pending.reference,
        lastPaymentAt: now
      }], { session });

      await User.updateOne(
        { _id: user._id },
        { $set: {
          plan: pending.plan.code,
          currentPlan: pending.plan._id,
          subscriptionStatus: 'active',
          subscriptionStartedAt: now,
          subscriptionExpiresAt: expiresAt,
          paymentCustomerReference: verifiedData.customer?.id || null,
          paymentSubscriptionReference: pending.reference,
          lastSuccessfulPaymentAt: now
        } },
        { session }
      );
      await WebhookEvent.updateOne({ provider: 'flutterwave', eventId }, { $set: { processedAt: now } }, { session });
      activated = true;
    });
  } finally {
    await session.endSession();
  }

  if (!activated) {
    await WebhookEvent.updateOne({ provider: 'flutterwave', eventId }, { $set: { processedAt: new Date() } });
    return { duplicate: true };
  }
  return { valid: true };
}

module.exports = { initializePayment, validSignature, processWebhook };
