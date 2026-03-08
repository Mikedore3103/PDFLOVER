/**
 * Guest Usage Limiter Middleware
 *
 * Tracks guest user conversions using IP address as identifier.
 * Limits: 3 conversions per day, 10MB max file size.
 * Resets daily at midnight.
 */

const { errorResponse } = require('../utils/responseHandler');

// In-memory storage for guest usage (in production, use Redis)
const guestUsage = new Map();

// Reset interval: 24 hours in milliseconds
const RESET_INTERVAL = 24 * 60 * 60 * 1000;

// Guest limits
const GUEST_LIMITS = {
  maxConversions: 3,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  resetInterval: RESET_INTERVAL
};

/**
 * Get or create guest usage record for an IP address
 * @param {string} ip - IP address of the guest user
 * @returns {Object} Usage record with count and lastReset timestamp
 */
function getGuestRecord(ip) {
  if (!guestUsage.has(ip)) {
    guestUsage.set(ip, {
      count: 0,
      lastReset: Date.now()
    });
  }

  const record = guestUsage.get(ip);

  // Check if we need to reset the counter
  if (Date.now() - record.lastReset >= RESET_INTERVAL) {
    record.count = 0;
    record.lastReset = Date.now();
  }

  return record;
}

/**
 * Check if guest has exceeded daily conversion limit
 * @param {string} ip - IP address of the guest user
 * @returns {boolean} True if limit exceeded
 */
function isGuestLimitExceeded(ip) {
  const record = getGuestRecord(ip);
  return record.count >= GUEST_LIMITS.maxConversions;
}

/**
 * Increment guest conversion count
 * @param {string} ip - IP address of the guest user
 */
function incrementGuestCount(ip) {
  const record = getGuestRecord(ip);
  record.count += 1;
}

/**
 * Validate file size for guest users
 * @param {Array} files - Array of uploaded files
 * @throws {Error} If any file exceeds size limit
 */
function validateGuestFileSize(files) {
  for (const file of files) {
    if (file.size > GUEST_LIMITS.maxFileSize) {
      throw new Error(`File size exceeds guest limit of ${GUEST_LIMITS.maxFileSize / (1024 * 1024)}MB. Create a free account for higher limits.`);
    }
  }
}

/**
 * Middleware to enforce guest usage limits
 * Should be applied to tool routes for non-authenticated users
 */
function guestLimiter(req, res, next) {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';

    // Check conversion limit
    if (isGuestLimitExceeded(clientIP)) {
      return errorResponse(res, 'Free usage limit reached. Create a free account for higher limits.', 429);
    }

    // Validate file sizes
    if (req.files && req.files.length > 0) {
      validateGuestFileSize(req.files);
    }

    // Increment counter on successful validation
    incrementGuestCount(clientIP);

    // Add guest info to request for later use
    req.userType = 'guest';
    req.userLimits = GUEST_LIMITS;

    next();
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
}

/**
 * Get current guest usage for an IP (for debugging/monitoring)
 * @param {string} ip - IP address
 * @returns {Object|null} Usage record or null if not found
 */
function getGuestUsage(ip) {
  return guestUsage.get(ip) || null;
}

/**
 * Clean up old guest records (optional maintenance)
 * Removes records older than 48 hours
 */
function cleanupOldRecords() {
  const cutoff = Date.now() - (48 * 60 * 60 * 1000); // 48 hours ago

  for (const [ip, record] of guestUsage.entries()) {
    if (record.lastReset < cutoff) {
      guestUsage.delete(ip);
    }
  }
}

// Export middleware and utility functions
module.exports = {
  guestLimiter,
  getGuestUsage,
  cleanupOldRecords,
  GUEST_LIMITS
};