const express = require('express');
const billingController = require('../controllers/billingController');
const { requireAuth } = require('../middleware/usageLimiter');

const router = express.Router();

router.post('/checkout', requireAuth, billingController.prepareCheckout);
router.get('/status/:reference', requireAuth, billingController.getPaymentStatus);
router.post('/webhook', billingController.flutterwaveWebhook);
router.get('/callback', billingController.paymentCallback);

module.exports = router;
