const express = require('express');
const billingController = require('../controllers/billingController');
const { requireAuth } = require('../middleware/usageLimiter');
const { rateLimit } = require('../middleware/rateLimiter');

const router = express.Router();
const checkoutLimiter = rateLimit({ windowMs: 60 * 1000, max: 5 });

router.post('/checkout', checkoutLimiter, requireAuth, billingController.prepareCheckout);
router.get('/status/:reference', requireAuth, billingController.getPaymentStatus);
router.post('/webhook', billingController.flutterwaveWebhook);
router.get('/callback', billingController.paymentCallback);

module.exports = router;
