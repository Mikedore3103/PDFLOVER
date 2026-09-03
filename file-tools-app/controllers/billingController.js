const Plan = require('../models/Plan');
const User = require('../models/User');
const PaymentTransaction = require('../models/PaymentTransaction');
const { initializePayment, validSignature, processWebhook } = require('../services/flutterwaveService');
const { successResponse, errorResponse } = require('../utils/responseHandler');

async function prepareCheckout(req, res) {
  try {
    const { planCode } = req.body;
    const plan = await Plan.findOne({ code: planCode, active: true }).lean();

    if (!plan || plan.code === 'free') {
      return errorResponse(res, 'Select an active paid plan to continue.', 400);
    }

    const user = await User.findById(req.userId).select('_id email');
    if (!user) return errorResponse(res, 'User not found.', 404);
    if (user.currentPlan?.toString() === plan._id.toString() && user.subscriptionStatus === 'active') {
      return errorResponse(res, 'You already have this active plan.', 409);
    }

    const payment = await initializePayment(user, plan);
    return successResponse(res, {
      message: 'Payment initialized.',
      paymentRequired: true,
      reference: payment.reference,
      checkoutUrl: payment.link
    }, 201);
  } catch (error) {
    return errorResponse(res, error.message || 'Unable to prepare checkout.', error.statusCode || 500);
  }
}

async function flutterwaveWebhook(req, res) {
  const signature = req.headers['flutterwave-signature'];
  if (!validSignature(req.rawBody, signature)) {
    return res.status(401).send('Invalid signature');
  }

  try {
    await processWebhook(req.body);
    return res.sendStatus(200);
  } catch (error) {
    console.error('Flutterwave webhook processing failed:', error.message);
    return res.sendStatus(500);
  }
}

function paymentCallback(req, res) {
  const frontendUrl = process.env.FLW_FRONTEND_URL || '/';
  const callbackStatus = String(req.query.status || 'cancelled').toLowerCase();
  if (req.query.tx_ref && ['cancelled', 'failed'].includes(callbackStatus)) {
    PaymentTransaction.updateOne(
      { provider: 'flutterwave', reference: req.query.tx_ref, status: 'pending' },
      { $set: { status: callbackStatus } }
    ).catch(error => console.error('Failed to record payment callback:', error.message));
  }
  const query = new URLSearchParams({
    payment: callbackStatus === 'successful' ? 'pending-verification' : callbackStatus,
    reference: String(req.query.tx_ref || '')
  });
  return res.redirect(`${frontendUrl}${frontendUrl.includes('?') ? '&' : '?'}${query.toString()}`);
}

async function getPaymentStatus(req, res) {
  try {
    const transaction = await PaymentTransaction.findOne({
      user: req.userId,
      provider: 'flutterwave',
      reference: req.params.reference
    }).populate('plan', 'code name');
    if (!transaction) return errorResponse(res, 'Payment transaction not found.', 404);
    return successResponse(res, {
      reference: transaction.reference,
      status: transaction.status,
      plan: transaction.plan
    });
  } catch (error) {
    return errorResponse(res, 'Unable to load payment status.', 500);
  }
}

module.exports = { prepareCheckout, flutterwaveWebhook, paymentCallback, getPaymentStatus };
