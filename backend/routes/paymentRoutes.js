const express = require('express');
const router = express.Router();
const {
  initiatePayment,
  verifyPayment,
  getSubscriptionStatus,
  renewSubscription,
  getPaymentHistory,
  adminActivatePremium,
  adminDeactivatePremium,
  getAllPayments,
  getPaymentStatistics,
  getUserPaymentDetails,
  initiateMpesaPayment,
  initiateAirtelPayment,
  queryPaymentStatus,
  handleMpesaCallback,
  handleAirtelCallback,
  getTransactionHistory,
  processRefund
} = require('../controllers/paymentController');
const {
  mpesaWebhook,
  airtelWebhook,
  yasWebhook,
  halopesaWebhook,
  paymentWebhook
} = require('../controllers/webhookController');
const {
  verifyMpesaSignature,
  verifyAirtelSignature,
  verifyYasSignature,
  verifyHalopesaSignature,
  validateTimestamp
} = require('../middleware/webhookAuth');
const {
  paymentRateLimiter,
  subscriptionRateLimiter,
  webhookRateLimiter
} = require('../middleware/rateLimiter');
const {
  validateMpesaWebhook,
  validateAirtelWebhook,
  validateYasWebhook,
  validateHalopesaWebhook
} = require('../middleware/webhookSchemaValidation');
const { sanitizeWebhookPayload } = require('../utils/idempotency');
const { protect, isAdmin } = require('../middleware/auth');
const { superAdminAuth } = require('../middleware/superAdminAuth');
const {
  preventWebhookRetryStorm,
  gracefulWebhookHandler
} = require('../middleware/errorHandling');

// Webhook data sanitization middleware
const sanitizeWebhook = (provider) => (req, res, next) => {
  try {
    const sanitized = sanitizeWebhookPayload(provider, req.body);
    if (!sanitized) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid webhook payload structure' 
      });
    }
    req.body = sanitized;
    next();
  } catch (error) {
    console.error('Webhook sanitization error:', error);
    return res.status(400).json({ 
      success: false, 
      message: 'Webhook payload sanitization failed' 
    });
  }
};

// Public webhook routes for each payment gateway with signature, timestamp validation, rate limiting, schema validation, sanitization and error handling
router.post('/webhook/mpesa', webhookRateLimiter, preventWebhookRetryStorm, validateTimestamp, verifyMpesaSignature, sanitizeWebhook('mpesa'), validateMpesaWebhook, gracefulWebhookHandler(handleMpesaCallback));
router.post('/webhook/airtel', webhookRateLimiter, preventWebhookRetryStorm, validateTimestamp, verifyAirtelSignature, sanitizeWebhook('airtel'), validateAirtelWebhook, gracefulWebhookHandler(handleAirtelCallback));
router.post('/webhook/yas', webhookRateLimiter, preventWebhookRetryStorm, validateTimestamp, verifyYasSignature, sanitizeWebhook('yas'), validateYasWebhook, gracefulWebhookHandler(yasWebhook));
router.post('/webhook/halopesa', webhookRateLimiter, preventWebhookRetryStorm, validateTimestamp, verifyHalopesaSignature, sanitizeWebhook('halopesa'), validateHalopesaWebhook, gracefulWebhookHandler(halopesaWebhook));

// Generic webhook route — disabled in production; provider-specific routes above are canonical
router.post('/webhook', webhookRateLimiter, validateTimestamp, (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_REAL_PAYMENT_PROVIDERS === 'true') {
    return res.status(404).json({ success: false, message: 'Use provider-specific webhook endpoints' });
  }
  return paymentWebhook(req, res);
});

// M-Pesa and Airtel payment initiation routes
router.post('/mpesa/initiate', protect, paymentRateLimiter, initiateMpesaPayment);
router.post('/airtel/initiate', protect, paymentRateLimiter, initiateAirtelPayment);
router.get('/status/:transactionId', protect, paymentRateLimiter, queryPaymentStatus);
router.get('/transactions', protect, subscriptionRateLimiter, getTransactionHistory);
router.post('/refund', superAdminAuth, processRefund);

// Protected user payment routes; webhooks stay public above.
router.post('/initiate', protect, paymentRateLimiter, initiatePayment);
router.post('/verify', protect, paymentRateLimiter, verifyPayment);
router.get('/subscription', protect, subscriptionRateLimiter, getSubscriptionStatus);
router.post('/renew', protect, paymentRateLimiter, renewSubscription);
router.get('/history', protect, subscriptionRateLimiter, getPaymentHistory);

// Admin routes — owner-only (see middleware/superAdminAuth.js)
router.post('/admin/activate', superAdminAuth, adminActivatePremium);
router.post('/admin/deactivate', superAdminAuth, adminDeactivatePremium);
router.get('/admin/all-payments', superAdminAuth, getAllPayments);
router.get('/admin/statistics', superAdminAuth, getPaymentStatistics);
router.get('/admin/user/:userId', superAdminAuth, getUserPaymentDetails);

module.exports = router;
