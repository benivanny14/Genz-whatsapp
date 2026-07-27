const mongoose = require('mongoose');
const ManualPayment = require('../models/ManualPayment');
const User = require('../models/User');
const { parsePaymentSms, isValidTransactionId } = require('../utils/mobileMoneySmsParser');

// The account users are instructed to pay into.
const getReceiverDetails = () => ({
  receiverName: process.env.MANUAL_PAYMENT_RECEIVER_NAME || 'ERASTOR GODFREY PAUL',
  receiverNumber: process.env.MANUAL_PAYMENT_RECEIVER_NUMBER || '0639533428'
});

const SUBSCRIPTION_PLANS = {
  Premium: { days: 30, amount: 10000 }
};

const escapeHtml = (str = '') => String(str)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const getIO = (req) => req.app.get('io');

const notifyUser = (req, userId, event, payload) => {
  const io = getIO(req);
  if (io) io.to(String(userId)).emit(event, payload);
};

const notifyAdmins = (req, event, payload) => {
  const io = getIO(req);
  if (io) io.to('role:admin').emit(event, payload);
};

// ---------------------------------------------------------------------
// PUBLIC INFO (for the payment page — where to pay)
// ---------------------------------------------------------------------
exports.getPaymentInfo = async (req, res) => {
  const { receiverName, receiverNumber } = getReceiverDetails();

  res.json({
    success: true,
    receiverName,
    receiverNumber,
    plan: {
      name: 'Premium',
      ...SUBSCRIPTION_PLANS.Premium
    },
    instructions: [
      `Send payment to ${receiverNumber} (${receiverName}).`,
      'Copy the entire confirmation SMS you receive.',
      'Paste the SMS below.',
      'Submit.'
    ]
  });
};

// Live-preview parse as the user pastes their SMS (no DB write).
exports.previewSms = async (req, res) => {
  try {
    const { sms } = req.body;
    if (!sms || !String(sms).trim()) {
      return res.status(400).json({ success: false, message: 'SMS text is required' });
    }
    const parsed = parsePaymentSms(sms);
    res.json({ success: true, parsed });
  } catch (error) {
    console.error('[ManualPayment] previewSms error:', error);
    res.status(500).json({ success: false, message: 'Failed to parse SMS' });
  }
};

// ---------------------------------------------------------------------
// USER: submit a payment
// ---------------------------------------------------------------------
exports.submitPayment = async (req, res) => {
  try {
    const userId = req.user._id;
    let { sms, transactionId, amount, subscriptionPlan } = req.body;

    sms = (sms || '').toString().trim();
    if (!sms) {
      return res.status(400).json({ success: false, message: 'Payment confirmation SMS is required' });
    }
    if (sms.length > 4000) {
      return res.status(400).json({ success: false, message: 'SMS text is too long' });
    }

    const parsed = parsePaymentSms(sms);

    const finalTransactionId = (transactionId || parsed.transactionId || '').toString().trim();
    const finalAmount = amount ? Number(amount) : parsed.amount;

    if (!finalTransactionId || !isValidTransactionId(finalTransactionId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid Transaction ID is required. We could not detect one automatically — please enter it manually.'
      });
    }
    if (!finalAmount || Number.isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid payment amount is required. We could not detect one automatically — please enter it manually.'
      });
    }

    const plan = SUBSCRIPTION_PLANS[subscriptionPlan] ? subscriptionPlan : 'Premium';
    const planConfig = SUBSCRIPTION_PLANS[plan];

    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const { receiverName, receiverNumber } = getReceiverDetails();

    // Sanitize the stored SMS to prevent stored-XSS if ever rendered as HTML.
    const safeSms = escapeHtml(sms);

    // ----- Duplicate detection -----------------------------------------
    const existing = await ManualPayment.findOne({
      transactionId: finalTransactionId,
      status: { $in: ['Pending', 'Approved'] }
    }).sort({ createdAt: 1 });

    const payment = new ManualPayment({
      userId,
      username: user.username,
      registeredPhone: user.phoneNumber,
      paymentSMS: safeSms,
      parsed: {
        operator: parsed.operator || 'Unknown',
        date: parsed.date || null,
        confidence: parsed.confidence
      },
      senderPhone: parsed.senderPhone || null,
      transactionId: finalTransactionId,
      amount: finalAmount,
      currency: parsed.currency || 'TZS',
      receiverName,
      receiverNumber,
      subscriptionPlan: plan,
      subscriptionDays: planConfig.days
    });

    if (existing) {
      payment.status = 'Duplicate';
      payment.duplicateOfPaymentId = existing._id;
      payment.approvalHistory.push({ action: 'marked_duplicate', reason: `Transaction ID already used in payment ${existing._id}` });
    }

    await payment.save();

    if (existing) {
      notifyAdmins(req, 'payment:duplicate', {
        paymentId: payment._id,
        transactionId: finalTransactionId,
        username: user.username,
        originalPaymentId: existing._id,
        originalUsername: existing.username,
        originalDate: existing.submittedAt
      });
    } else {
      notifyAdmins(req, 'payment:submitted', {
        paymentId: payment._id,
        username: user.username,
        amount: finalAmount,
        transactionId: finalTransactionId
      });
    }

    res.status(201).json({
      success: true,
      message: existing
        ? 'This transaction ID has already been used. Your payment has been flagged for admin review.'
        : 'Payment submitted successfully. It will be reviewed shortly.',
      payment: sanitizePaymentForUser(payment)
    });
  } catch (error) {
    console.error('[ManualPayment] submitPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to submit payment' });
  }
};

// ---------------------------------------------------------------------
// USER: my payments / single payment / reply in conversation
// ---------------------------------------------------------------------
exports.getMyPayments = async (req, res) => {
  try {
    const payments = await ManualPayment.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, payments: payments.map(sanitizePaymentForUser) });
  } catch (error) {
    console.error('[ManualPayment] getMyPayments error:', error);
    res.status(500).json({ success: false, message: 'Failed to load payments' });
  }
};

exports.getMyPaymentById = async (req, res) => {
  try {
    const payment = await ManualPayment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment: sanitizePaymentForUser(payment) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load payment' });
  }
};

exports.userReply = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }
    const payment = await ManualPayment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const entry = {
      sender: 'user',
      senderId: req.user._id,
      message: escapeHtml(message.trim()).slice(0, 2000),
      readByUser: true,
      readByAdmin: false
    };
    payment.conversation.push(entry);
    await payment.save();

    notifyAdmins(req, 'payment:message', {
      paymentId: payment._id,
      username: payment.username,
      message: entry.message
    });

    res.json({ success: true, message: 'Message sent', conversation: payment.conversation });
  } catch (error) {
    console.error('[ManualPayment] userReply error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// ---------------------------------------------------------------------
// ADMIN: list / search / filter / paginate
// ---------------------------------------------------------------------
exports.listPayments = async (req, res) => {
  try {
    const {
      status = 'Pending',
      search = '',
      sortBy = 'createdAt',
      sortDir = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    if (status && status !== 'All') query.status = status;

    if (search && search.trim()) {
      const re = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ username: re }, { transactionId: re }, { registeredPhone: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const sort = { [sortBy]: sortDir === 'asc' ? 1 : -1 };

    const [payments, total] = await Promise.all([
      ManualPayment.find(query).sort(sort).skip((pageNum - 1) * limitNum).limit(limitNum),
      ManualPayment.countDocuments(query)
    ]);

    res.json({
      success: true,
      payments,
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 }
    });
  } catch (error) {
    console.error('[ManualPayment] listPayments error:', error);
    res.status(500).json({ success: false, message: 'Failed to load payments' });
  }
};

exports.getStatistics = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      pending, approved, rejected, duplicate, expired,
      todaysPayments, activeSubscribers,
      monthlyRevenueAgg, totalRevenueAgg
    ] = await Promise.all([
      ManualPayment.countDocuments({ status: 'Pending' }),
      ManualPayment.countDocuments({ status: 'Approved' }),
      ManualPayment.countDocuments({ status: 'Rejected' }),
      ManualPayment.countDocuments({ status: 'Duplicate' }),
      ManualPayment.countDocuments({ status: 'Expired' }),
      ManualPayment.countDocuments({ submittedAt: { $gte: startOfDay } }),
      User.countDocuments({ premium: true, subscriptionExpiresAt: { $gt: new Date() } }),
      ManualPayment.aggregate([
        { $match: { status: 'Approved', approvedAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      ManualPayment.aggregate([
        { $match: { status: 'Approved' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    res.json({
      success: true,
      stats: {
        pendingPayments: pending,
        todaysPayments,
        approvedPayments: approved,
        rejectedPayments: rejected,
        duplicatePayments: duplicate,
        expiredUsers: expired,
        activeSubscribers,
        monthlyRevenue: monthlyRevenueAgg[0]?.total || 0,
        totalRevenue: totalRevenueAgg[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('[ManualPayment] getStatistics error:', error);
    res.status(500).json({ success: false, message: 'Failed to load statistics' });
  }
};

// ---------------------------------------------------------------------
// ADMIN: payment + user detail view
// ---------------------------------------------------------------------
exports.getPaymentDetails = async (req, res) => {
  try {
    const payment = await ManualPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const user = await User.findById(payment.userId).select('-passwordHash -passwordResetToken -emailVerificationToken');
    const paymentHistory = await ManualPayment.find({ userId: payment.userId }).sort({ createdAt: -1 });

    let duplicateOf = null;
    if (payment.duplicateOfPaymentId) {
      duplicateOf = await ManualPayment.findById(payment.duplicateOfPaymentId).select('username submittedAt _id transactionId status');
    }

    res.json({
      success: true,
      payment,
      duplicateOf,
      user,
      paymentHistory: paymentHistory.map((p) => ({
        _id: p._id,
        amount: p.amount,
        transactionId: p.transactionId,
        status: p.status,
        submittedAt: p.submittedAt,
        approvedAt: p.approvedAt
      })),
      stats: {
        totalPayments: paymentHistory.length,
        rejectedPayments: paymentHistory.filter((p) => p.status === 'Rejected').length,
        duplicatePayments: paymentHistory.filter((p) => p.status === 'Duplicate').length,
        approvedPayments: paymentHistory.filter((p) => p.status === 'Approved').length
      }
    });
  } catch (error) {
    console.error('[ManualPayment] getPaymentDetails error:', error);
    res.status(500).json({ success: false, message: 'Failed to load payment details' });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-passwordHash -passwordResetToken -emailVerificationToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const paymentHistory = await ManualPayment.find({ userId: user._id }).sort({ createdAt: -1 });

    res.json({
      success: true,
      user,
      paymentHistory,
      stats: {
        totalPayments: paymentHistory.length,
        approvedPayments: paymentHistory.filter((p) => p.status === 'Approved').length,
        rejectedPayments: paymentHistory.filter((p) => p.status === 'Rejected').length,
        duplicatePayments: paymentHistory.filter((p) => p.status === 'Duplicate').length,
        totalPaid: paymentHistory.filter((p) => p.status === 'Approved').reduce((s, p) => s + p.amount, 0)
      }
    });
  } catch (error) {
    console.error('[ManualPayment] getUserProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to load user profile' });
  }
};

// ---------------------------------------------------------------------
// ADMIN: approve / reject
// ---------------------------------------------------------------------
exports.approvePayment = async (req, res) => {
  try {
    const payment = await ManualPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    if (payment.status === 'Duplicate') {
      return res.status(400).json({ success: false, message: 'This payment is flagged as a duplicate. Resolve the duplicate before approving.' });
    }
    if (payment.status === 'Approved') {
      return res.status(400).json({ success: false, message: 'Payment already approved' });
    }

    const user = await User.findById(payment.userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();
    // Extend from current expiry if still active, otherwise start fresh from now.
    const base = user.premium && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) > now
      ? new Date(user.subscriptionExpiresAt)
      : now;
    const expiresAt = new Date(base);
    expiresAt.setDate(expiresAt.getDate() + (payment.subscriptionDays || 30));

    user.premium = true;
    user.subscriptionExpiresAt = expiresAt;
    await user.save();

    payment.status = 'Approved';
    payment.approvedAt = now;
    payment.approvedBy = req.user._id;
    payment.expiresAt = expiresAt;
    payment.approvalHistory.push({ action: 'approved', by: req.user._id, byUsername: req.user.username, at: now });
    await payment.save();

    notifyUser(req, payment.userId, 'payment:approved', {
      paymentId: payment._id,
      expiresAt,
      message: 'Your payment has been approved! Premium is now active.'
    });

    res.json({ success: true, message: 'Payment approved and subscription activated', payment });
  } catch (error) {
    console.error('[ManualPayment] approvePayment error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to approve payment' });
  }
};

exports.rejectPayment = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required' });
    }
    const payment = await ManualPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    payment.status = 'Rejected';
    payment.rejectedReason = escapeHtml(reason.trim()).slice(0, 500);
    payment.approvalHistory.push({ action: 'rejected', by: req.user._id, byUsername: req.user.username, reason: payment.rejectedReason });
    await payment.save();

    notifyUser(req, payment.userId, 'payment:rejected', {
      paymentId: payment._id,
      reason: payment.rejectedReason,
      message: 'Your payment was rejected.'
    });

    res.json({ success: true, message: 'Payment rejected', payment });
  } catch (error) {
    console.error('[ManualPayment] rejectPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject payment' });
  }
};

// ---------------------------------------------------------------------
// ADMIN: conversation
// ---------------------------------------------------------------------
exports.adminSendMessage = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty' });
    }
    const payment = await ManualPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });

    const entry = {
      sender: 'admin',
      senderId: req.user._id,
      message: escapeHtml(message.trim()).slice(0, 2000),
      readByAdmin: true,
      readByUser: false
    };
    payment.conversation.push(entry);
    await payment.save();

    notifyUser(req, payment.userId, 'payment:message', {
      paymentId: payment._id,
      message: entry.message,
      from: 'admin'
    });

    res.json({ success: true, conversation: payment.conversation });
  } catch (error) {
    console.error('[ManualPayment] adminSendMessage error:', error);
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
};

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function sanitizePaymentForUser(payment) {
  const obj = payment.toObject ? payment.toObject() : payment;
  return obj;
}

// ---------------------------------------------------------------------
// Cron-callable: expire subscriptions whose expiry date has passed.
// ---------------------------------------------------------------------
exports.runExpiryCheck = async (io) => {
  const now = new Date();
  const expiredPayments = await ManualPayment.find({ status: 'Approved', expiresAt: { $lte: now } });

  for (const payment of expiredPayments) {
    payment.status = 'Expired';
    await payment.save();

    const user = await User.findById(payment.userId);
    if (user && user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) <= now) {
      user.premium = false;
      await user.save();
    }

    if (io) {
      io.to(String(payment.userId)).emit('payment:expired', {
        paymentId: payment._id,
        message: 'Your subscription has expired. Please renew.'
      });
    }
  }

  return expiredPayments.length;
};
