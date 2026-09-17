/**
 * Usage Limiter Middleware for Registered Users
 *
 * Handles monthly limits for registered Free, Pro, and Premium users.
 * Tracks usage in the database and enforces plan-based limits.
 */

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Plan = require('../models/Plan');
const { errorResponse } = require('../utils/responseHandler');

// JWT secret (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET must be configured.');

const PLAN_FILE_LIMITS = {
  free: 50 * 1024 * 1024,
  pro: 500 * 1024 * 1024,
  premium: 500 * 1024 * 1024
};
const MONTHLY_USAGE_INTERVAL = 30 * 24 * 60 * 60 * 1000;

// Premium tools that require Pro plan
const PREMIUM_TOOLS = new Set([
  'compress-pdf',
  'ocr-pdf', // Assuming this will be added later
  'batch-convert' // Assuming this will be added later
]);

/**
 * Reserve one conversion in the user's current 30-day usage period.
 * @param {Object} user - User document from database
 * @returns {Object} Updated user object
 */
async function reserveConversion(user, plan) {
  const now = new Date();
  const expiredPeriodCutoff = new Date(now.getTime() - MONTHLY_USAGE_INTERVAL);
  const limit = plan.monthlyConversionLimit;
  const limitFilter = {
    $or: [
      { monthlyUsageResetAt: { $lte: expiredPeriodCutoff } },
      { monthlyUsageResetAt: { $exists: false } },
      { monthlyUsageResetAt: null },
      { monthlyUsageCount: { $lt: limit } }
    ]
  };

  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id, ...limitFilter },
    [{
      $set: {
        monthlyUsageCount: {
          $cond: [
            { $lte: [{ $ifNull: ['$monthlyUsageResetAt', new Date(0)] }, expiredPeriodCutoff] },
            1,
            { $add: [{ $ifNull: ['$monthlyUsageCount', 0] }, 1] }
          ]
        },
        monthlyUsageResetAt: {
          $cond: [
            { $lte: [{ $ifNull: ['$monthlyUsageResetAt', new Date(0)] }, expiredPeriodCutoff] },
            now,
            '$monthlyUsageResetAt'
          ]
        }
      }
    }],
    { new: true }
  );

  if (!updatedUser) return null;

  return {
    user: updatedUser,
    release: async () => {
      await User.updateOne(
        {
          _id: updatedUser._id,
          monthlyUsageResetAt: updatedUser.monthlyUsageResetAt,
          monthlyUsageCount: { $gt: 0 }
        },
        { $inc: { monthlyUsageCount: -1 } }
      );
    }
  };
}

/**
 * Check if tool requires premium plan
 * @param {string} toolName - Name of the tool
 * @param {string} userPlan - User's plan (free/pro)
 * @returns {boolean} True if tool is premium and user doesn't have access
 */
function isPremiumToolRestricted(toolName, userPlan) {
  return PREMIUM_TOOLS.has(toolName) && !['pro', 'premium'].includes(userPlan);
}

/**
 * Validate file size for registered users
 * @param {Array} files - Array of uploaded files
 * @param {string} userPlan - User's plan
 * @throws {Error} If any file exceeds size limit
 */
function validateUserFileSize(files, userPlan) {
  const maxSize = PLAN_FILE_LIMITS[userPlan] || PLAN_FILE_LIMITS.free;

  for (const file of files) {
    if (file.size > maxSize) {
      const sizeMB = maxSize / (1024 * 1024);
      throw new Error(`File size exceeds ${userPlan} plan limit of ${sizeMB}MB. ${userPlan === 'free' ? 'Upgrade to Pro for higher limits.' : ''}`);
    }
  }
}

/**
 * Extract and verify JWT token from request
 * @param {Object} req - Express request object
 * @returns {Object|null} Decoded token payload or null if invalid
 */
function ensureDatabaseAvailable() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('Database is currently unavailable. Please try again shortly.');
    error.statusCode = 503;
    throw error;
  }
}

function getUserFromToken(req) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Middleware to enforce usage limits for registered users
 * Should be applied to tool routes - checks JWT and applies limits
 */
async function usageLimiter(req, res, next) {
  let reservation;
  try {
    const tokenPayload = getUserFromToken(req);

    if (!tokenPayload) {
      // No valid token - this will fall through to guest limiter
      return next();
    }

    ensureDatabaseAvailable();

    // Find user in database
    const user = await User.findById(tokenPayload.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 401);
    }

    // Resolve plan and limits from MongoDB, never from the JWT or request body.
    const plan = await Plan.findOne({ _id: user.currentPlan, active: true }).lean()
      || await Plan.findOne({ code: user.plan, active: true }).lean()
      || await Plan.findOne({ code: 'free', active: true }).lean();
    if (!plan) {
      return errorResponse(res, 'Subscription plans are not configured', 503);
    }

    let effectivePlan = plan;
    const paidPlan = !['free'].includes(plan.code);
    const subscriptionExpired = user.subscriptionExpiresAt && user.subscriptionExpiresAt <= new Date();
    if (paidPlan && (user.subscriptionStatus !== 'active' || subscriptionExpired)) {
      effectivePlan = await Plan.findOne({ code: 'free', active: true }).lean();
    }

    // Check if tool is premium-only
    const toolName = req.body?.tool || req.params?.tool || req.path.replace(/^\//, '');
    if (isPremiumToolRestricted(toolName, effectivePlan.code)) {
      return errorResponse(res, 'This tool requires a Pro plan.', 403);
    }

    reservation = await reserveConversion(user, effectivePlan);
    if (!reservation) {
      const message = effectivePlan.code === 'free'
        ? "You've reached your 10 free conversions for this month. Upgrade to Pro for 100 conversions per month or Premium for 300 conversions per month."
        : effectivePlan.code === 'pro'
          ? "You've reached your 100 monthly conversions. Upgrade to Premium for 300 conversions per month."
          : "You've reached your 300 monthly conversions.";
      return errorResponse(res, message, 429, {
        plan: effectivePlan.code,
        monthlyConversionLimit: effectivePlan.monthlyConversionLimit,
        upgradeOptions: effectivePlan.code === 'free' ? ['pro', 'premium'] : ['premium']
      });
    }

    // Validate file sizes
    if (req.files && req.files.length > 0) {
      validateUserFileSize(req.files, effectivePlan.code);
    }

    // Add user info to request
    req.user = reservation.user;
    req.userType = 'registered';
    req.userLimits = {
      maxConversions: effectivePlan.monthlyConversionLimit,
      maxFileSize: PLAN_FILE_LIMITS[effectivePlan.code] || PLAN_FILE_LIMITS.free,
      resetAt: new Date(reservation.user.monthlyUsageResetAt.getTime() + MONTHLY_USAGE_INTERVAL)
    };
    req.plan = effectivePlan;
    req.releaseConversion = reservation.release;

    next();
  } catch (error) {
    if (reservation) await reservation.release();
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

/**
 * Middleware to require authentication for certain routes
 * Use this for routes that require login (dashboard, saved files, etc.)
 */
function requireAuth(req, res, next) {
  const tokenPayload = getUserFromToken(req);

  if (!tokenPayload) {
    return errorResponse(res, 'Authentication required', 401);
  }

  // Add user ID to request for route handlers
  req.userId = tokenPayload.userId;
  next();
}

async function requireAdmin(req, res, next) {
  const tokenPayload = getUserFromToken(req);
  if (!tokenPayload) return errorResponse(res, 'Authentication required', 401);

  try {
    const user = await User.findById(tokenPayload.userId).select('_id email role');
    if (!user || user.role !== 'admin') return errorResponse(res, 'Administrator access required', 403);
    req.user = user;
    req.userId = user._id;
    return next();
  } catch (error) {
    return errorResponse(res, 'Unable to verify administrator access', 500);
  }
}

/**
 * Middleware to require Pro plan for certain routes
 */
async function requirePro(req, res, next) {
  try {
    const tokenPayload = getUserFromToken(req);

    ensureDatabaseAvailable();

    if (!tokenPayload) {
      return errorResponse(res, 'Authentication required', 401);
    }

    const user = await User.findById(tokenPayload.userId);
    const plan = user ? await Plan.findOne({ _id: user.currentPlan, active: true }).lean() : null;
    const expired = user?.subscriptionExpiresAt && user.subscriptionExpiresAt <= new Date();
    if (!user || !plan || !['pro', 'premium'].includes(plan.code) || user.subscriptionStatus !== 'active' || expired) {
      return errorResponse(res, 'Pro plan required', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

module.exports = {
  usageLimiter,
  requireAuth,
  requireAdmin,
  requirePro,
  PLAN_FILE_LIMITS,
  PREMIUM_TOOLS
};
