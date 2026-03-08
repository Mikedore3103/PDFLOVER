/**
 * Usage Limiter Middleware for Registered Users
 *
 * Handles limits for free and pro registered users.
 * Tracks usage in database and enforces plan-based limits.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { errorResponse } = require('../utils/responseHandler');

// JWT secret (should be in environment variables in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// User limits by plan
const USER_LIMITS = {
  free: {
    maxConversions: 20,
    maxFileSize: 50 * 1024 * 1024, // 50MB
    resetInterval: 24 * 60 * 60 * 1000 // 24 hours
  },
  pro: {
    maxConversions: -1, // unlimited
    maxFileSize: 500 * 1024 * 1024, // 500MB
    resetInterval: 24 * 60 * 60 * 1000
  }
};

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
function resetDailyUsageIfNeeded(user) {
  const now = Date.now();
  const timeSinceReset = now - user.lastUsageReset;

  if (timeSinceReset >= USER_LIMITS[user.plan].resetInterval) {
    user.dailyUsageCount = 0;
    user.lastUsageReset = now;
  }

  return user;
}

/**
 * Check if user has exceeded their daily conversion limit
 * @param {Object} user - User document
 * @returns {boolean} True if limit exceeded
 */
function isUserLimitExceeded(user) {
  const limits = USER_LIMITS[user.plan];

  // Pro users have unlimited conversions
  if (limits.maxConversions === -1) {
    return false;
  }

  return user.dailyUsageCount >= limits.maxConversions;
}

/**
 * Check if tool requires premium plan
 * @param {string} toolName - Name of the tool
 * @param {string} userPlan - User's plan (free/pro)
 * @returns {boolean} True if tool is premium and user doesn't have access
 */
function isPremiumToolRestricted(toolName, userPlan) {
  return PREMIUM_TOOLS.has(toolName) && userPlan !== 'pro';
}

/**
 * Validate file size for registered users
 * @param {Array} files - Array of uploaded files
 * @param {string} userPlan - User's plan
 * @throws {Error} If any file exceeds size limit
 */
function validateUserFileSize(files, userPlan) {
  const maxSize = USER_LIMITS[userPlan].maxFileSize;

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

    // Reset daily usage if needed
    resetDailyUsageIfNeeded(user);

    // Check if tool is premium-only
    const toolName = req.body?.tool || req.params?.tool || '';
    if (isPremiumToolRestricted(toolName, user.plan)) {
      return errorResponse(res, 'This tool requires a Pro plan.', 403);
    }

    // Check conversion limit
    if (isUserLimitExceeded(user)) {
      const message = user.plan === 'free'
        ? 'Daily conversion limit reached. Upgrade to Pro for unlimited access.'
        : 'Conversion limit reached. Please try again tomorrow.';
      return errorResponse(res, message, 429);
    }

    // Validate file sizes
    if (req.files && req.files.length > 0) {
      validateUserFileSize(req.files, user.plan);
    }

    // Increment usage counter
    user.dailyUsageCount += 1;
    await user.save();

    // Add user info to request
    req.user = user;
    req.userType = 'registered';
    req.userLimits = USER_LIMITS[user.plan];

    next();
  } catch (error) {
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
    if (!user || user.plan !== 'pro') {
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
  USER_LIMITS,
  PREMIUM_TOOLS
};