const express = require('express');
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/usageLimiter');
const { rateLimit } = require('../middleware/rateLimiter');

const router = express.Router();
router.use(requireAdmin);
router.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

router.get('/overview', adminController.getOverview);
router.get('/users', adminController.listUsers);
router.patch('/users/:userId/plan', adminController.updateUserPlan);
router.get('/audit-logs', adminController.listAuditLogs);

module.exports = router;
