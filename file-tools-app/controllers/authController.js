/**
 * Authentication Controller
 *
 * Handles user registration, login, and profile management.
 */

const jwt = require('jsonwebtoken');
<<<<<<< HEAD
const mongoose = require('mongoose');
=======
const { notifySignup } = require('../services/adminNotificationService');
>>>>>>> 28cf681062553fb00488b53f5fa64d9c11451f8b
const User = require('../models/User');
const Plan = require('../models/Plan');
const PaymentTransaction = require('../models/PaymentTransaction');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET must be configured.');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const EMAIL_VERIFY_DISABLED = process.env.EMAIL_VERIFY_DISABLED === 'true';
const EMAIL_VERIFY_DEV_MODE = process.env.EMAIL_VERIFY_DEV_MODE === 'true' && process.env.NODE_ENV !== 'production';
const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const BREVO_FROM = process.env.BREVO_FROM?.trim();
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY;
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_ENABLED = Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY);

// In-memory email verification storage (for MVP; replace with DB/Redis in production)
const verificationCodes = new Map();
const verifiedEmails = new Map();
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const VERIFIED_TTL_MS = 30 * 60 * 1000; // 30 minutes

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function storeVerificationCode(email, code) {
  verificationCodes.set(email, { code, expiresAt: Date.now() + CODE_TTL_MS });
}

function storeVerifiedEmail(email) {
  verifiedEmails.set(email, { expiresAt: Date.now() + VERIFIED_TTL_MS });
}

function isEmailVerified(email) {
  const record = verifiedEmails.get(email);
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    verifiedEmails.delete(email);
    return false;
  }
  return true;
}

async function verifyHumanToken(token, remoteIp) {
  if (!TURNSTILE_ENABLED) return { success: true, skipped: true };
  if (!token) return { success: false, message: 'Please complete human verification.' };

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: TURNSTILE_SECRET_KEY,
        response: token,
        ...(remoteIp ? { remoteip: remoteIp } : {})
      })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      return { success: false, message: 'Human verification failed. Please try again.' };
    }
    return { success: true };
  } catch (error) {
    console.error('Turnstile verification failed:', error.message);
    return { success: false, message: 'Human verification failed. Please try again.' };
  }
}

/**
 * Generate JWT token for user
 * @param {Object} user - User document
 * @returns {string} JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      plan: user.plan
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function ensureDatabaseAvailable() {
  if (mongoose.connection.readyState !== 1) {
    const error = new Error('Database is currently unavailable. Please try again shortly.');
    error.statusCode = 503;
    throw error;
  }
}

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { username, email, password } = req.body;
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';

    // Validate input
    if (!normalizedUsername || !email || !password) {
      return errorResponse(res, 'Username, email and password are required', 400);
    }

    if (!/^[A-Za-z0-9_-]{3,30}$/.test(normalizedUsername)) {
      return errorResponse(res, 'Username must be 3–30 characters and use only letters, numbers, underscores, or hyphens', 400);
    }

    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long', 400);
    }

    if (!EMAIL_VERIFY_DISABLED && !isEmailVerified(email)) {
      return errorResponse(res, 'Please verify your email before signing up.', 400);
    }

    ensureDatabaseAvailable();

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 409);
    }

    const existingUsername = await User.findOne({ username: normalizedUsername });
    if (existingUsername) {
      return errorResponse(res, 'This username is already taken', 409);
    }

    // Create new user
    const freePlan = await Plan.findOne({ code: 'free', active: true });
    if (!freePlan) {
      return errorResponse(res, 'FREE plan is not configured', 503);
    }

    const user = new User({
      username: normalizedUsername,
      email,
      password,
      plan: 'free',
      currentPlan: freePlan._id
    });

    await user.save();
    await notifySignup(user);

    // Generate token
    const token = generateToken(user);

    return successResponse(res, {
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

/**
 * Login user
 */
async function login(req, res) {
  try {
    const { email, password, turnstileToken } = req.body;

    // Validate input
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

<<<<<<< HEAD
    ensureDatabaseAvailable();
=======
    const humanVerification = await verifyHumanToken(turnstileToken, req.ip);
    if (!humanVerification.success) {
      return errorResponse(res, humanVerification.message, 400);
    }
>>>>>>> 28cf681062553fb00488b53f5fa64d9c11451f8b

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 'Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken(user);

    return successResponse(res, {
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        dailyUsageCount: user.dailyUsageCount
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

function getSecurityConfig(req, res) {
  return successResponse(res, {
    turnstile: {
      enabled: TURNSTILE_ENABLED,
      siteKey: TURNSTILE_ENABLED ? TURNSTILE_SITE_KEY : null
    }
  });
}

/**
 * Get current user profile
 */
async function getProfile(req, res) {
  try {
    ensureDatabaseAvailable();

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    const assignedPlan = await Plan.findOne({ _id: user.currentPlan, active: true }).lean();
    const subscriptionExpired = user.subscriptionExpiresAt && user.subscriptionExpiresAt <= new Date();
    const paidSubscriptionActive = assignedPlan && assignedPlan.code !== 'free'
      && user.subscriptionStatus === 'active' && !subscriptionExpired;
    const effectivePlan = paidSubscriptionActive ? assignedPlan : await Plan.findOne({ code: 'free', active: true }).lean();
    const latestPayment = await PaymentTransaction.findOne({ user: user._id })
      .sort({ paidAt: -1 })
      .select('amount currency paidAt status createdAt')
      .lean();
    const effectiveStatus = subscriptionExpired ? 'expired' : (user.subscriptionStatus || 'inactive');

    return successResponse(res, {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: effectivePlan?.code || 'free',
        dailyUsageCount: user.dailyUsageCount,
        lastUsageReset: user.lastUsageReset,
        currentPlan: user.currentPlan,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartedAt: user.subscriptionStartedAt,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
        lastSuccessfulPaymentAt: user.lastSuccessfulPaymentAt,
        planDetails: effectivePlan ? {
          code: effectivePlan.code,
          name: effectivePlan.name,
          price: effectivePlan.price,
          currency: effectivePlan.currency,
          dailyConversionLimit: effectivePlan.dailyConversionLimit
        } : null,
        subscription: {
          status: effectiveStatus,
          startedAt: user.subscriptionStartedAt,
          expiresAt: user.subscriptionExpiresAt,
          lastPayment: latestPayment
        },
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

/**
<<<<<<< HEAD
 * Update user plan (for admin or payment processing)
 */
async function updatePlan(req, res) {
  try {
    ensureDatabaseAvailable();

    const { plan } = req.body;

    if (!['free', 'pro'].includes(plan)) {
      return errorResponse(res, 'Invalid plan type', 400);
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    user.plan = plan;
    await user.save();

    // Generate new token with updated plan
    const token = generateToken(user);

    return successResponse(res, {
      message: 'Plan updated successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, error.statusCode || 500);
  }
}

/**
=======
>>>>>>> 28cf681062553fb00488b53f5fa64d9c11451f8b
 * Send email verification code
 */
async function sendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Email is required', 400);
    }

    const code = generateCode();

    if (!BREVO_API_KEY || !BREVO_FROM) {
      if (!EMAIL_VERIFY_DEV_MODE) {
        return errorResponse(res, 'Email verification is not configured.', 503);
      }
      storeVerificationCode(email, code);
      return successResponse(res, {
        message: 'Verification configured for development. BREVO_API_KEY/BREVO_FROM not set.',
        code
      });
    }

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'PDFLOVER',
          email: BREVO_FROM
        },
        to: [
          { email }
        ],
        subject: 'Your verification code',
        htmlContent: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`
      })
    });

    if (!brevoResponse.ok) {
      // Keep provider details out of public responses and never log the API token.
      if (brevoResponse.status === 401 || brevoResponse.status === 403) {
        console.error(`Brevo rejected email authentication/authorization (HTTP ${brevoResponse.status}). Check BREVO_API_KEY validity and Brevo account permissions.`);
        return errorResponse(res, 'Email verification is temporarily unavailable. Please try again later.', 503);
      }
      console.error(`Brevo email request failed (HTTP ${brevoResponse.status}). Check the provider API logs.`);
      return errorResponse(res, 'Could not send the verification email. Please try again later.', 502);
    }

    storeVerificationCode(email, code);
    return successResponse(res, { message: 'Verification code sent.' });
  } catch (error) {
<<<<<<< HEAD
    return errorResponse(res, error.message, error.statusCode || 500);
=======
    console.error('Brevo email request failed before completion.');
    return errorResponse(res, 'Could not send the verification email. Please try again later.', 502);
>>>>>>> 28cf681062553fb00488b53f5fa64d9c11451f8b
  }
}

/**
 * Verify email code
 */
async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return errorResponse(res, 'Email and code are required', 400);
    }

    const record = verificationCodes.get(email);
    if (!record) {
      return errorResponse(res, 'Verification code not found. Request a new code.', 400);
    }

    if (Date.now() > record.expiresAt) {
      verificationCodes.delete(email);
      return errorResponse(res, 'Verification code expired. Request a new code.', 400);
    }

    if (record.code !== code) {
      return errorResponse(res, 'Invalid verification code.', 400);
    }

    verificationCodes.delete(email);
    storeVerifiedEmail(email);

    return successResponse(res, { message: 'Email verified.' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

module.exports = {
  register,
  login,
  getProfile,
  getSecurityConfig,
  sendVerification,
  verifyEmail
};
