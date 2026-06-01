const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { 
  initiateMpesaPayment: serviceInitiateMpesaPayment,
  initiateAirtelPayment: serviceInitiateAirtelPayment,
  queryPaymentStatus: serviceQueryPaymentStatus,
  handleMpesaCallback: serviceHandleMpesaCallback,
  handleAirtelCallback: serviceHandleAirtelCallback,
  getUserPaymentHistory,
  processRefund: serviceProcessRefund
} = require('../services/paymentService');
const { initiateYasPayment, verifyYasPayment } = require('../services/yasService');
const { initiateHalopesaPayment, verifyHalopesaPayment } = require('../services/halopesaService');
const {
  logPremiumActivation,
  logPremiumDeactivation,
  logPaymentOverride
} = require('../utils/auditLogger');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const SUBSCRIPTION_DAYS = 60; // Exactly 60 days
const SUBSCRIPTION_MONTHS = 2; // Admin UI compatibility for the 60-day plan
const SUBSCRIPTION_AMOUNT = 10000; // Tsh 10,000
const VALID_PAYMENT_METHODS = ['mpesa', 'airtel', 'airtel-money', 'yas', 'halopesa', 'card', 'mock'];

const getCurrentUserId = (req) => req.user?._id?.toString() || req.body.deviceId || req.query.deviceId || LOCAL_USER_ID;

const normalizePaymentMethod = (method = '') => {
  const value = method.toLowerCase().trim();
  return value === 'airtel' ? 'airtel-money' : value;
};

const isMockPaymentAllowed = () => (
  process.env.NODE_ENV !== 'production' ||
  process.env.ALLOW_MOCK_PAYMENTS === 'true'
);

const getExpiryDate = (fromDate = new Date()) => {
  const expiryDate = new Date(fromDate);
  expiryDate.setDate(expiryDate.getDate() + SUBSCRIPTION_DAYS); // Exactly 60 days
  return expiryDate;
};

const getActivationWindow = (existingSubscription) => {
  const now = new Date();
  const currentExpiry = existingSubscription?.expiryDate ? new Date(existingSubscription.expiryDate) : null;
  const startDate = currentExpiry && currentExpiry > now ? currentExpiry : now;

  return {
    paymentDate: now,
    startDate,
    expiryDate: getExpiryDate(startDate)
  };
};

const getMissingProviderConfig = (paymentMethod) => {
  const requiredEnvVars = {
    mpesa: ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_PASSKEY', 'MPESA_SHORTCODE'],
    'airtel-money': ['AIRTEL_CLIENT_ID', 'AIRTEL_CLIENT_SECRET'],
    yas: ['YAS_API_KEY', 'YAS_MERCHANT_ID', 'YAS_SECRET_KEY'],
    halopesa: ['HALOPESA_API_KEY', 'HALOPESA_MERCHANT_ID', 'HALOPESA_SECRET_KEY'],
    card: ['STRIPE_SECRET_KEY']
  };

  return (requiredEnvVars[paymentMethod] || []).filter((name) => !process.env[name]);
};

const createProviderTransaction = async ({ userId, amount, paymentMethod, phoneNumber, transactionId }) => {
  const provider = paymentMethod === 'airtel-money' ? 'airtel' : paymentMethod;

  return Transaction.findOneAndUpdate(
    { transactionId },
    {
      $setOnInsert: {
        userId,
        provider,
        type: 'subscription',
        amount,
        currency: 'TZS',
        phoneNumber,
        reference: 'GENZ Subscription',
        description: 'Premium subscription payment',
        status: 'pending',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      },
      $set: {
        updatedAt: new Date()
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

const initiateProviderPayment = async ({ userId, amount, paymentMethod, phoneNumber, transactionId }) => {
  if (paymentMethod === 'mpesa') {
    return serviceInitiateMpesaPayment(
      userId,
      amount,
      phoneNumber,
      'GENZ Subscription',
      'Premium subscription payment'
    );
  }

  if (paymentMethod === 'airtel-money') {
    return serviceInitiateAirtelPayment(
      userId,
      amount,
      phoneNumber,
      'GENZ Subscription',
      'Premium subscription payment'
    );
  }

  if (paymentMethod === 'card') {
    throw new Error('Card checkout is not wired. Configure Stripe and add a checkout session provider before enabling card payments.');
  }

  await createProviderTransaction({ userId, amount, paymentMethod, phoneNumber, transactionId });

  if (paymentMethod === 'yas') {
    return initiateYasPayment(phoneNumber, amount, transactionId);
  }

  if (paymentMethod === 'halopesa') {
    return initiateHalopesaPayment(phoneNumber, amount, transactionId);
  }

  throw new Error(`Unsupported payment provider: ${paymentMethod}`);
};

const upsertPendingSubscription = async ({ userId, amount, paymentMethod, phoneNumber, transactionId }) => {
  const paymentDate = new Date();
  const expiryDate = getExpiryDate(paymentDate);

  return Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        amount,
        paymentMethod,
        phoneNumber,
        paymentStatus: 'pending',
        status: 'pending',
        transactionId,
        paymentDate,
        startDate: paymentDate,
        expiryDate,
        updatedAt: paymentDate
      },
      $push: {
        paymentHistory: {
          transactionId,
          amount,
          paymentMethod,
          status: 'pending',
          paymentDate,
          expiryDate
        }
      },
      $setOnInsert: { createdAt: paymentDate }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
};

const activateSubscription = async ({ userId, amount, paymentMethod, phoneNumber, transactionId, gatewayResponse }) => {
  const existingSubscription = await Subscription.findOne({ userId });
  const { paymentDate, startDate, expiryDate } = getActivationWindow(existingSubscription);

  const subscription = await Subscription.findOneAndUpdate(
    { userId },
    {
      $set: {
        amount,
        paymentMethod,
        phoneNumber,
        paymentStatus: 'completed',
        status: 'active',
        transactionId,
        paymentDate,
        startDate,
        expiryDate,
        autoLocked: false,
        lockReason: null,
        paymentGatewayResponse: gatewayResponse,
        updatedAt: paymentDate
      },
      $push: {
        paymentHistory: {
          transactionId,
          amount,
          paymentMethod,
          status: 'completed',
          paymentDate,
          expiryDate
        }
      },
      $setOnInsert: { createdAt: paymentDate }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await User.findByIdAndUpdate(userId, {
    premium: true,
    subscriptionExpiresAt: expiryDate
  });

  return subscription;
};

// @desc    Initiate payment
// @route   POST /api/payment/initiate
// @access  Private
exports.initiatePayment = async (req, res) => {
  try {
    const { amount, paymentMethod, phoneNumber } = req.body;
    const userId = getCurrentUserId(req);
    const numericAmount = Number(amount);
    const normalizedMethod = normalizePaymentMethod(paymentMethod);

    if (!numericAmount || numericAmount <= 0 || !Number.isFinite(numericAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Valid positive amount is required'
      });
    }

    if (!VALID_PAYMENT_METHODS.includes(normalizedMethod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid payment method. Supported methods: ${VALID_PAYMENT_METHODS.join(', ')}`
      });
    }

    const shouldUseMockPayment = normalizedMethod === 'mock' || (
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_REAL_PAYMENT_PROVIDERS !== 'true'
    );

    if (normalizedMethod === 'mock' && !isMockPaymentAllowed()) {
      return res.status(400).json({
        success: false,
        error: 'Mock payments are disabled in this environment'
      });
    }

    const missingConfig = shouldUseMockPayment ? [] : getMissingProviderConfig(normalizedMethod);
    if (missingConfig.length > 0) {
      return res.status(500).json({
        success: false,
        error: `Payment provider not configured. Missing: ${missingConfig.join(', ')}`
      });
    }

    const transactionId = `TXN${Date.now()}${Math.random().toString(36).slice(2, 9)}`;
    const billingPhoneNumber = phoneNumber || req.user?.phoneNumber || 'not-provided';

    if (shouldUseMockPayment) {
      const subscription = await activateSubscription({
        userId,
        amount: numericAmount,
        paymentMethod: normalizedMethod,
        phoneNumber: billingPhoneNumber,
        transactionId,
        gatewayResponse: {
          provider: 'mock',
          requestedPaymentMethod: normalizedMethod,
          completedAt: new Date()
        }
      });

      return res.status(200).json({
        success: true,
        paymentUrl: `https://mock-payment-gateway.local/pay/${transactionId}`,
        transactionId,
        paymentStatus: 'completed',
        message: 'Payment completed in mock mode',
        subscription
      });
    }

    const providerResult = await initiateProviderPayment({
      userId,
      amount: numericAmount,
      paymentMethod: normalizedMethod,
      phoneNumber: billingPhoneNumber,
      transactionId
    });

    const providerTransactionId = providerResult.transactionId || transactionId;
    const subscription = await upsertPendingSubscription({
      userId,
      amount: numericAmount,
      paymentMethod: normalizedMethod,
      phoneNumber: billingPhoneNumber,
      transactionId: providerTransactionId
    });

    return res.status(200).json({
      success: true,
      ...providerResult,
      transactionId: providerTransactionId,
      paymentStatus: subscription.paymentStatus,
      message: providerResult.message || 'Payment initiated',
      subscription
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate payment. Please try again later.'
    });
  }
};

// @desc    Verify payment
// @route   POST /api/payment/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.body;
    const currentUserId = getCurrentUserId(req);

    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    const subscription = await Subscription.findOne({ transactionId });
    if (!subscription) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (subscription.userId !== currentUserId && !req.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized for this transaction' });
    }

    res.status(200).json({
      success: true,
      paymentStatus: subscription.paymentStatus,
      subscription
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get subscription status
// @route   GET /api/payment/subscription
// @access  Private
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const subscription = await Subscription.findOne({ userId });
    const user = req.user?._id ? await User.findById(req.user._id).select('premium subscriptionExpiresAt') : null;
    const isSubscriptionActive = Boolean(subscription?.isActive?.());
    const isUserPremium = Boolean(user?.premium && user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > new Date());
    const expiryDate = subscription?.expiryDate || user?.subscriptionExpiresAt || null;

    let remainingDays = 0;
    if (subscription?.getRemainingDays) {
      remainingDays = subscription.getRemainingDays();
    }
    if (remainingDays === 0 && user?.subscriptionExpiresAt && isUserPremium) {
      const diffTime = new Date(user.subscriptionExpiresAt) - new Date();
      remainingDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    const isActive = isSubscriptionActive || isUserPremium;

    // Auto-lock check: if subscription expired, ensure it's locked
    if (subscription && !isActive && subscription.status === 'active') {
      await Subscription.findOneAndUpdate(
        { userId },
        { $set: { status: 'expired', autoLocked: true, lockReason: 'subscription_expired', updatedAt: new Date() } }
      );
      if (user && req.user?._id) {
        await User.findByIdAndUpdate(req.user._id, { premium: false });
      }
    }

    res.status(200).json({
      success: true,
      isActive,
      hasSubscription: Boolean(subscription),
      expiryDate,
      remainingDays,
      autoLocked: subscription?.autoLocked || false,
      subscriptionAmount: SUBSCRIPTION_AMOUNT,
      subscriptionDays: SUBSCRIPTION_DAYS,
      userPremium: isActive,
      subscription
    });
  } catch (error) {
    console.error('Get subscription status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Renew subscription
// @route   POST /api/payment/renew
// @access  Private
exports.renewSubscription = async (req, res) => {
  req.body.amount = req.body.amount || SUBSCRIPTION_AMOUNT;
  req.body.paymentMethod = req.body.paymentMethod || 'mock';
  return exports.initiatePayment(req, res);
};

// @desc    Get payment history
// @route   GET /api/payment/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const subscription = await Subscription.findOne({ userId });
    const payments = subscription?.paymentHistory?.slice().reverse() || [];

    res.status(200).json({
      success: true,
      payments,
      subscription
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminActivatePremium = async (req, res) => {
  try {
    const { userId, months = SUBSCRIPTION_MONTHS, reason = 'manual_activation' } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const now = new Date();
    const expiryDate = new Date(now);
    expiryDate.setDate(expiryDate.getDate() + SUBSCRIPTION_DAYS);
    const transactionId = `ADMIN${Date.now()}`;

    const user = await User.findByIdAndUpdate(
      userId,
      { premium: true, subscriptionExpiresAt: expiryDate },
      { new: true }
    ).select('username phoneNumber premium subscriptionExpiresAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { userId: userId.toString() },
      {
        $set: {
          status: 'active',
          paymentStatus: 'completed',
          paymentDate: now,
          startDate: now,
          expiryDate,
          paymentMethod: 'mock',
          phoneNumber: user.phoneNumber || 'admin',
          amount: 0,
          transactionId,
          activatedBy: req.user?._id,
          updatedAt: now
        },
        $push: {
          paymentHistory: {
            transactionId,
            amount: 0,
            paymentMethod: 'mock',
            status: reason,
            paymentDate: now,
            expiryDate
          }
        },
        $setOnInsert: { createdAt: now }
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await logPremiumActivation(req.user?._id, user._id, subscription._id, req);

    res.status(200).json({ success: true, user, subscription });
  } catch (error) {
    console.error('Admin activate premium error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.adminDeactivatePremium = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { premium: false, subscriptionExpiresAt: null },
      { new: true }
    ).select('username phoneNumber premium subscriptionExpiresAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const subscription = await Subscription.findOneAndUpdate(
      { userId: userId.toString() },
      {
        $set: {
          status: 'expired',
          paymentStatus: 'failed',
          updatedAt: new Date()
        }
      }
    );

    await logPremiumDeactivation(req.user?._id, user._id, subscription?._id || null, req);

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error('Admin deactivate premium error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllPayments = async (req, res) => {
  try {
    const subscriptions = await Subscription.find()
      .sort({ updatedAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      payments: subscriptions
    });
  } catch (error) {
    console.error('Get all payments error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPaymentStatistics = async (req, res) => {
  try {
    const [totalPayments, successfulPayments, activeSubscriptions, revenueAgg] = await Promise.all([
      Subscription.countDocuments(),
      Subscription.countDocuments({ paymentStatus: 'completed' }),
      Subscription.countDocuments({ status: 'active', expiryDate: { $gt: new Date() } }),
      Subscription.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      statistics: {
        totalPayments,
        successfulPayments,
        failedPayments: totalPayments - successfulPayments,
        activeSubscriptions,
        totalRevenue: revenueAgg[0]?.totalRevenue || 0
      }
    });
  } catch (error) {
    console.error('Get payment statistics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserPaymentDetails = async (req, res) => {
  try {
    const targetUserId = req.params.userId;

    // Validate userId is a valid MongoDB ObjectId
    if (!targetUserId || !/^[0-9a-fA-F]{24}$/.test(targetUserId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    const subscription = await Subscription.findOne({ userId: targetUserId });
    const user = await User.findById(targetUserId).select('username phoneNumber premium subscriptionExpiresAt');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user,
      subscription,
      payments: subscription?.paymentHistory || []
    });
  } catch (error) {
    console.error('Get user payment details error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate M-Pesa STK Push payment
// @route   POST /api/payment/mpesa/initiate
// @access  Private
exports.initiateMpesaPayment = async (req, res) => {
  try {
    const { amount, phoneNumber, reference, description } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const result = await serviceInitiateMpesaPayment(
      userId,
      amount,
      phoneNumber,
      reference || 'GENZ Subscription',
      description || 'Premium subscription payment'
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('[PaymentController] M-Pesa payment failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Initiate Airtel Money payment
// @route   POST /api/payment/airtel/initiate
// @access  Private
exports.initiateAirtelPayment = async (req, res) => {
  try {
    const { amount, phoneNumber, reference, description } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid amount is required' });
    }

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const result = await serviceInitiateAirtelPayment(
      userId,
      amount,
      phoneNumber,
      reference || 'GENZ Subscription',
      description || 'Premium subscription payment'
    );

    res.status(200).json(result);
  } catch (error) {
    console.error('[PaymentController] Airtel payment failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Query payment status
// @route   GET /api/payment/status/:transactionId
// @access  Private
exports.queryPaymentStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const result = await serviceQueryPaymentStatus(transactionId);

    const ownerId = result?.transaction?.userId?.toString();
    const currentUserId = req.user._id?.toString();
    if (ownerId && ownerId !== currentUserId && !req.isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this transaction' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[PaymentController] Query payment status failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Handle M-Pesa callback
// @route   POST /api/payment/webhook/mpesa
// @access  Public
exports.handleMpesaCallback = async (req, res) => {
  try {
    const result = await serviceHandleMpesaCallback(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('[PaymentController] M-Pesa callback failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Handle Airtel callback
// @route   POST /api/payment/webhook/airtel
// @access  Public
exports.handleAirtelCallback = async (req, res) => {
  try {
    const result = await serviceHandleAirtelCallback(req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('[PaymentController] Airtel callback failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get transaction history
// @route   GET /api/payment/transactions
// @access  Private
exports.getTransactionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;
    const transactions = await getUserPaymentHistory(userId, limit);
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    console.error('[PaymentController] Get transaction history failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Process refund
// @route   POST /api/payment/refund
// @access  Private (Admin)
exports.processRefund = async (req, res) => {
  try {
    const { transactionId, reason } = req.body;
    
    if (!transactionId) {
      return res.status(400).json({ success: false, message: 'Transaction ID is required' });
    }

    const result = await serviceProcessRefund(transactionId, reason);
    await logPaymentOverride(
      req.user?._id,
      result?.transaction?.userId || null,
      null,
      { transactionId, reason, resultStatus: result?.status || result?.success },
      req
    );
    res.status(200).json(result);
  } catch (error) {
    console.error('[PaymentController] Refund failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
