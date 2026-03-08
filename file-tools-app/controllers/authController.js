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

module.exports = {
  register,
  login,
  getProfile,
  updatePlan
};