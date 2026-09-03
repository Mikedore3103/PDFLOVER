/**
 * Usage Limiter Middleware for Registered Users
 *
 * Handles limits for free and pro registered users.
 * Tracks usage in database and enforces plan-based limits.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Plan = require('../models/Plan');
const { errorResponse } = require('../utils/responseHandler');

// JWT secret (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const PLAN_FILE_LIMITS = {
  free: 50 * 1024 * 1024,
  pro: 500 * 1024 * 1024,
  premium: 500 * 1024 * 1024
};
const RESET_INTERVAL = 24 * 60 * 60 * 1000;

// Premium tools that require Pro plan
const PREMIUM_TOOLS = new Set([
  'compress-pdf',
  'ocr-pdf', // Assuming this will be added later
  'batch-convert' // Assuming this will be added later
]);

/**
 * Reset daily usage counter if needed
 * @param {Object} user - User document from database
 * @returns {Object} Updated user object
 */
function getUtcDayStart(date = new Date()) {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  return dayStart;
}

async function reserveConversion(user, plan) {
  const dayStart = getUtcDayStart();
  const limit = plan.dailyConversionLimit;
  const limitFilter = limit === -1
    ? {}
    : {
        $or: [
          { lastUsageReset: { $lt: dayStart } },
          { lastUsageReset: { $exists: false } },
          { lastUsageReset: null },
          { dailyUsageCount: { $lt: limit } }
        ]
      };

  const updatedUser = await User.findOneAndUpdate(
    { _id: user._id, ...limitFilter },
    [{
      $set: {
        dailyUsageCount: {
          $cond: [
            { $lt: [{ $ifNull: ['$lastUsageReset', new Date(0)] }, dayStart] },
            1,
            { $add: [{ $ifNull: ['$dailyUsageCount', 0] }, 1] }
          ]
        },
        lastUsageReset: {
          $cond: [
            { $lt: [{ $ifNull: ['$lastUsageReset', new Date(0)] }, dayStart] },
            new Date(),
            '$lastUsageReset'
          ]
        }
      }
    }],
    { new: true }
  );

  if (!updatedUser) return null;

  return {
    user: updatedUser,
    dayStart,
    release: async () => {
      await User.updateOne(
        {
          _id: updatedUser._id,
          lastUsageReset: { $gte: dayStart, $lt: new Date(dayStart.getTime() + RESET_INTERVAL) },
          dailyUsageCount: { $gt: 0 }
        },
        { $inc: { dailyUsageCount: -1 } }
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
    const toolName = req.body?.tool || req.params?.tool || '';
    if (isPremiumToolRestricted(toolName, effectivePlan.code)) {
      return errorResponse(res, 'This tool requires a Pro plan.', 403);
    }

    reservation = await reserveConversion(user, effectivePlan);
    if (!reservation) {
      const message = effectivePlan.code === 'free'
        ? "You've reached your 10 free conversions for today. Upgrade to Pro for up to 100 conversions per day or Premium for unlimited conversions."
        : "You've reached your 100 daily conversions. Upgrade to Premium for unlimited conversions.";
      return errorResponse(res, message, 429, {
        plan: effectivePlan.code,
        dailyConversionLimit: effectivePlan.dailyConversionLimit,
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
      maxConversions: effectivePlan.dailyConversionLimit,
      maxFileSize: PLAN_FILE_LIMITS[effectivePlan.code] || PLAN_FILE_LIMITS.free,
      resetInterval: RESET_INTERVAL
    };
    req.plan = effectivePlan;
    req.releaseConversion = reservation.release;

    next();
  } catch (error) {
    if (reservation) await reservation.release();
    return errorResponse(res, error.message, 500);
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

/**
 * Middleware to require Pro plan for certain routes
 */
async function requirePro(req, res, next) {
  try {
    const tokenPayload = getUserFromToken(req);

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
    return errorResponse(res, error.message, 500);
  }
}

module.exports = {
  usageLimiter,
  requireAuth,
  requirePro,
  PLAN_FILE_LIMITS,
  PREMIUM_TOOLS
};