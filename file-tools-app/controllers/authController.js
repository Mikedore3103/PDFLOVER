/**
 * Authentication Controller
 *
 * Handles user registration, login, and profile management.
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const EMAIL_VERIFY_DISABLED = process.env.EMAIL_VERIFY_DISABLED === 'true';
const MAILERSEND_API_KEY = process.env.MAILERSEND_API_KEY;
const MAILERSEND_FROM = process.env.MAILERSEND_FROM;

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

/**
 * Register a new user
 */
async function register(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long', 400);
    }

    if (!EMAIL_VERIFY_DISABLED && !isEmailVerified(email)) {
      return errorResponse(res, 'Please verify your email before signing up.', 400);
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return errorResponse(res, 'User with this email already exists', 409);
    }

    // Create new user
    const user = new User({
      email,
      password,
      plan: 'free' // Default to free plan
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    return successResponse(res, {
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        plan: user.plan
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * Login user
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required', 400);
    }

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
        email: user.email,
        plan: user.plan,
        dailyUsageCount: user.dailyUsageCount
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * Get current user profile
 */
async function getProfile(req, res) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }

    return successResponse(res, {
      user: {
        id: user._id,
        email: user.email,
        plan: user.plan,
        dailyUsageCount: user.dailyUsageCount,
        lastUsageReset: user.lastUsageReset,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return errorResponse(res, error.message, 500);
  }
}

/**
 * Update user plan (for admin or payment processing)
 */
async function updatePlan(req, res) {
  try {
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
    return errorResponse(res, error.message, 500);
  }
}

/**
 * Send email verification code
 */
async function sendVerification(req, res) {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Email is required', 400);
    }

    const code = generateCode();
    storeVerificationCode(email, code);

    if (!MAILERSEND_API_KEY || !MAILERSEND_FROM) {
      return successResponse(res, {
        message: 'Verification configured for development. MAILERSEND_API_KEY/MAILERSEND_FROM not set.',
        code
      });
    }

    const mailersendResponse = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        from: {
          email: MAILERSEND_FROM
        },
        to: [
          { email }
        ],
        subject: 'Your verification code',
        html: `<p>Your verification code is <strong>${code}</strong>. It expires in 10 minutes.</p>`,
        text: `Your verification code is ${code}. It expires in 10 minutes.`
      })
    });

    if (!mailersendResponse.ok) {
      const errorBody = await mailersendResponse.text();
      return errorResponse(res, `Email send failed: ${errorBody}`, 502);
    }

    return successResponse(res, { message: 'Verification code sent.' });
  } catch (error) {
    return errorResponse(res, error.message, 500);
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
  updatePlan,
  sendVerification,
  verifyEmail
};
