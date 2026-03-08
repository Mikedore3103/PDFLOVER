/**
 * Authentication Routes
 *
 * Handles user registration, login, and profile management.
 */

const express = require('express');
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/usageLimiter');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', requireAuth, authController.getProfile);
router.put('/plan', requireAuth, authController.updatePlan);

module.exports = router;