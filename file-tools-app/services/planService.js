const Plan = require('../models/Plan');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

function configuredPrice(name, fallback = 0) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

async function initializePlans() {
  const currency = (process.env.PLAN_CURRENCY || 'NGN').toUpperCase();
  const definitions = [
    {
      code: 'free',
      name: 'Free',
      price: 0,
      dailyConversionLimit: 10,
      active: true
    },
    {
      code: 'pro',
      name: 'Pro',
      price: configuredPrice('PRO_PLAN_PRICE', 3000),
      dailyConversionLimit: 100,
      active: true
    },
    {
      code: 'premium',
      name: 'Premium',
      price: configuredPrice('PREMIUM_PLAN_PRICE', 10000),
      dailyConversionLimit: -1,
      active: true
    }
  ];

  const plans = {};
  for (const definition of definitions) {
    plans[definition.code] = await Plan.findOneAndUpdate(
      { code: definition.code },
      // Keep plan definitions in code and MongoDB in sync. $setOnInsert left
      // already-created plans priced at 0, which made checkout unavailable.
      { $set: { ...definition, currency } },
      { upsert: true, new: true }
    );
  }

  // Legacy accounts had no subscription metadata. Assign them FREE once and
  // link the database-backed plan without resetting later paid accounts.
  await User.updateMany(
    { subscriptionStatus: { $exists: false } },
    {
      $set: {
        plan: 'free',
        currentPlan: plans.free._id,
        subscriptionStatus: 'inactive',
        subscriptionStartedAt: null,
        subscriptionExpiresAt: null,
        paymentCustomerReference: null,
        paymentSubscriptionReference: null,
        lastSuccessfulPaymentAt: null
      }
    }
  );

  if (process.env.ADMIN_EMAIL) {
    await User.updateOne(
      { email: process.env.ADMIN_EMAIL.toLowerCase().trim() },
      { $set: { role: 'admin' } }
    );
  }

  await User.updateMany(
    { subscriptionStatus: 'inactive', $or: [{ currentPlan: null }, { currentPlan: { $exists: false } }] },
    { $set: { plan: 'free', currentPlan: plans.free._id } }
  );

  const freeUsers = await User.find({
    currentPlan: plans.free._id,
    subscriptionStatus: 'inactive'
  }).select('_id createdAt');
  if (freeUsers.length > 0) {
    await Subscription.bulkWrite(freeUsers.map(user => ({
      updateOne: {
        filter: { user: user._id, status: 'inactive' },
        update: {
          $setOnInsert: {
            user: user._id,
            plan: plans.free._id,
            status: 'inactive',
            startedAt: user.createdAt
          }
        },
        upsert: true
      }
    })));
  }

  return plans;
}

async function listActivePlans() {
  return Plan.find({ active: true }).sort({ price: 1 }).lean();
}

module.exports = { initializePlans, listActivePlans };
