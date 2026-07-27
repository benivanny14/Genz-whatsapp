const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/auth');
const { superAdminAuth } = require('../middleware/superAdminAuth');
const { paymentRateLimiter, subscriptionRateLimiter } = require('../middleware/rateLimiter');
const ctrl = require('../controllers/manualPaymentController');

// ---------------------------------------------------------------------
// USER ROUTES — mounted at /api/payment/manual
// ---------------------------------------------------------------------
router.get('/info', protect, ctrl.getPaymentInfo);
router.post('/preview', protect, subscriptionRateLimiter, ctrl.previewSms);
router.post('/submit', protect, paymentRateLimiter, ctrl.submitPayment);
router.get('/mine', protect, subscriptionRateLimiter, ctrl.getMyPayments);
router.get('/mine/:id', protect, subscriptionRateLimiter, ctrl.getMyPaymentById);
router.post('/mine/:id/reply', protect, subscriptionRateLimiter, ctrl.userReply);

// ---------------------------------------------------------------------
// ADMIN ROUTES — mounted at /api/admin/manual-payments
// ---------------------------------------------------------------------
const adminRouter = express.Router();
adminRouter.use(superAdminAuth);
adminRouter.get('/', ctrl.listPayments);
adminRouter.get('/stats', ctrl.getStatistics);
adminRouter.get('/user/:userId', ctrl.getUserProfile);
adminRouter.get('/:id', ctrl.getPaymentDetails);
adminRouter.post('/:id/approve', ctrl.approvePayment);
adminRouter.post('/:id/reject', ctrl.rejectPayment);
adminRouter.post('/:id/message', ctrl.adminSendMessage);

module.exports = { userRoutes: router, adminRoutes: adminRouter };
