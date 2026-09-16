/**
 * Authentication Routes
 *
 * Handles user registration, login, and profile management.
 */

const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/usageLimiter');
const { rateLimit } = require('../middleware/rateLimiter');

const router = express.Router();
router.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }));

// Public routes
router.post('/send-verification', authController.sendVerification);
router.post('/verify-email', authController.verifyEmail);
router.get('/security-config', authController.getSecurityConfig);
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', requireAuth, authController.getProfile);

module.exports = router;
