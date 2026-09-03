const User = require('../models/User');
const Plan = require('../models/Plan');
const PaymentTransaction = require('../models/PaymentTransaction');
const AdminAuditLog = require('../models/AdminAuditLog');
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
    user.plan = plan.code;
    user.currentPlan = plan._id;
    user.subscriptionStatus = plan.code === 'free' ? 'inactive' : 'active';
    user.subscriptionStartedAt = plan.code === 'free' ? null : now;
    user.subscriptionExpiresAt = plan.code === 'free' ? null : (req.body.expiresAt ? new Date(req.body.expiresAt) : null);
    await user.save();

    await AdminAuditLog.create({
      admin: req.userId,
      action: 'user_plan_updated',
      targetUser: user._id,
      previousPlan,
      newPlan: plan.code,
      metadata: { expiresAt: user.subscriptionExpiresAt }
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
