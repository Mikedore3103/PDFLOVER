const User = require('../models/User');
const Plan = require('../models/Plan');
const PaymentTransaction = require('../models/PaymentTransaction');
const AdminAuditLog = require('../models/AdminAuditLog');
const Subscription = require('../models/Subscription');
const crypto = require('crypto');
const { successResponse, errorResponse } = require('../utils/responseHandler');

function toPositiveInteger(value, fallback, maximum) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number) || number < 1) return fallback;
  return Math.min(number, maximum);
}

async function getOverview(req, res) {
  try {
    const [totalUsers, activeSubscriptions, successfulPayments, recentUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ subscriptionStatus: 'active' }),
      PaymentTransaction.countDocuments({ status: 'successful' }),
      User.find().sort({ createdAt: -1 }).limit(5)
        .select('_id email role plan subscriptionStatus createdAt').lean()
    ]);

    return successResponse(res, { totalUsers, activeSubscriptions, successfulPayments, recentUsers });
  } catch (error) {
    return errorResponse(res, 'Unable to load the admin overview.', 500);
  }
}

async function listUsers(req, res) {
  try {
    const page = toPositiveInteger(req.query.page, 1, 100000);
    const limit = toPositiveInteger(req.query.limit, 25, 100);
    const search = String(req.query.search || '').trim();
    const filter = search ? { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } } : {};
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .select('_id email role plan currentPlan subscriptionStatus subscriptionExpiresAt dailyUsageCount createdAt').lean()
    ]);
    return successResponse(res, { users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    return errorResponse(res, 'Unable to load users.', 500);
  }
}

async function updateUserPlan(req, res) {
  try {
    const planCode = String(req.body.planCode || '').toLowerCase();
    const plan = await Plan.findOne({ code: planCode, active: true }).lean();
    if (!plan) return errorResponse(res, 'Select an active plan.', 400);

    const user = await User.findById(req.params.userId);
    if (!user) return errorResponse(res, 'User not found.', 404);
    if (user._id.equals(req.userId)) return errorResponse(res, 'Administrators cannot change their own plan here.', 400);

    const previousPlan = user.plan;
    const now = new Date();
    const manualDays = Number(process.env.MANUAL_SUBSCRIPTION_DAYS || 30);
    const expiresAt = plan.code === 'free'
      ? null
      : (req.body.expiresAt ? new Date(req.body.expiresAt) : new Date(now.getTime() + manualDays * 24 * 60 * 60 * 1000));
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return errorResponse(res, 'The supplied expiry date is invalid.', 400);
    }
    const manualAmount = Number(req.body.amount ?? plan.price);
    if (plan.code !== 'free' && (!Number.isFinite(manualAmount) || manualAmount < 0)) {
      return errorResponse(res, 'The cash payment amount must be a valid positive number.', 400);
    }

    // A manual grant replaces any current paid subscription. It is deliberately
    // recorded separately from Flutterwave so cash/offline payments remain
    // traceable without pretending they were gateway-approved.
    await Subscription.updateMany(
      { user: user._id, status: { $in: ['active', 'pending'] } },
      { $set: { status: 'cancelled' } }
    );

    user.plan = plan.code;
    user.currentPlan = plan._id;
    user.subscriptionStatus = plan.code === 'free' ? 'inactive' : 'active';
    user.subscriptionStartedAt = plan.code === 'free' ? null : now;
    user.subscriptionExpiresAt = expiresAt;
    await user.save();

    let payment = null;
    if (plan.code !== 'free') {
      const reference = `manual-${plan.code}-${user._id}-${crypto.randomUUID()}`;
      payment = await PaymentTransaction.create({
        user: user._id,
        plan: plan._id,
        amount: manualAmount,
        currency: plan.currency,
        provider: 'manual-cash',
        reference,
        status: 'successful',
        paidAt: now,
        providerReference: { notes: String(req.body.notes || '').trim(), grantedBy: req.userId.toString() }
      });
      await Subscription.create({
        user: user._id,
        plan: plan._id,
        status: 'active',
        startedAt: now,
        expiresAt,
        subscriptionReference: reference,
        lastPaymentAt: now
      });
      user.lastSuccessfulPaymentAt = now;
      user.paymentSubscriptionReference = reference;
      await user.save();
    }

    await AdminAuditLog.create({
      admin: req.userId,
      action: 'user_plan_updated',
      targetUser: user._id,
      previousPlan,
      newPlan: plan.code,
      metadata: {
        paymentMethod: plan.code === 'free' ? 'manual-revocation' : 'cash',
        paymentId: payment?._id,
        amount: payment?.amount,
        expiresAt: user.subscriptionExpiresAt,
        notes: String(req.body.notes || '').trim()
      }
    });

    return successResponse(res, { message: 'User plan updated.', user: {
      id: user._id, email: user.email, plan: user.plan, subscriptionStatus: user.subscriptionStatus,
      subscriptionExpiresAt: user.subscriptionExpiresAt
    } });
  } catch (error) {
    return errorResponse(res, 'Unable to update the user plan.', 500);
  }
}

async function listAuditLogs(req, res) {
  try {
    const limit = toPositiveInteger(req.query.limit, 50, 100);
    const logs = await AdminAuditLog.find().sort({ createdAt: -1 }).limit(limit)
      .populate('admin', 'email').populate('targetUser', 'email').lean();
    return successResponse(res, { logs });
  } catch (error) {
    return errorResponse(res, 'Unable to load audit logs.', 500);
  }
}

module.exports = { getOverview, listUsers, updateUserPlan, listAuditLogs };
