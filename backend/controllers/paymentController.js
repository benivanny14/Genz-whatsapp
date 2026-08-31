const mongoose = require('mongoose');
const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

const getIO = (req) => req.app.get('io');
const notifyUser = (req, userId, event, payload) => {
  const io = getIO(req);
  if (io) io.to(String(userId)).emit(event, payload);
};

/**
 * Notify all connected admins about a payment event.
 * Both 'role:admin' and 'admin-room' rooms are joined by admin sockets
 * in socket/index.js — emit to both for compatibility.
 */
const notifyAdmins = (req, event, payload) => {
  const io = getIO(req);
  if (!io) return;
  io.to('role:admin').emit(event, payload);
  io.to('admin-room').emit(event, payload);
};

exports.createPaymentRequest = async (req, res) => {
  try {
    const { recipientId, amount, currency = 'TZS', note = '', conversationId, paymentMethod = 'mobile_money' } = req.body;
    const userId = req.user._id || req.user.id;
    const username = req.user.username;

    if (!mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ success: false, message: 'Invalid recipient' });
    }
    if (!amount || amount < 1) {
      return res.status(400).json({ success: false, message: 'Amount must be at least 1' });
    }

    const recipient = await User.findById(recipientId).select('username phoneNumber');
    if (!recipient) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const paymentRequest = new PaymentRequest({
      requesterId: userId,
      requesterName: username,
      recipientId,
      recipientName: recipient.username,
      amount,
      currency,
      note: note || '',
      paymentMethod,
      conversationId: conversationId || null,
      requesterPhone: req.user.phoneNumber || '',
      recipientPhone: recipient.phoneNumber || ''
    });

    await paymentRequest.save();

    notifyUser(req, String(recipientId), 'payment_request', {
      _id: paymentRequest._id,
      requesterId: userId,
      requesterName: username,
      amount,
      currency,
      note,
      createdAt: paymentRequest.createdAt
    });

    // Notify admins in real-time about new pending payment
    notifyAdmins(req, 'new_pending_payment', {
      paymentId: paymentRequest._id,
      requesterId: userId,
      requesterName: username,
      recipientId,
      recipientName: recipient.username,
      amount,
      currency,
      method: paymentMethod
    });

    res.status(201).json({ success: true, paymentRequest });
  } catch (error) {
    logger.error('Create payment request failed:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment request' });
  }
};

exports.getPaymentRequests = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const { status } = req.query;

    const filter = {
      $or: [{ requesterId: userId }, { recipientId: userId }]
    };
    if (status) filter.status = status;

    const requests = await PaymentRequest.find(filter)
      .populate('requesterId', 'username')
      .populate('recipientId', 'username')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, requests });
  } catch (error) {
    logger.error('Get payment requests failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment requests' });
  }
};

exports.getPaymentRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment request ID' });
    }

    const request = await PaymentRequest.findById(id)
      .populate('requesterId', 'username phoneNumber')
      .populate('recipientId', 'username phoneNumber');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    if (String(request.requesterId._id) !== String(userId) && String(request.recipientId._id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this payment request' });
    }

    res.json({ success: true, request });
  } catch (error) {
    logger.error('Get payment request failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment request' });
  }
};

exports.payRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment request ID' });
    }

    const request = await PaymentRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    if (String(request.recipientId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the recipient can pay this request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Payment request is ${request.status}` });
    }

    request.status = 'paid';
    request.paidAt = new Date();
    await request.save();

    // Notify the requester that payment was completed
    notifyUser(req, String(request.requesterId), 'payment_paid', {
      _id: request._id,
      amount: request.amount,
      currency: request.currency,
      paidAt: request.paidAt
    });

    // Also emit payment_approved for premium-gating (same event the
    // frontend listens to for instant feature unlock)
    notifyUser(req, String(request.requesterId), 'payment_approved', {
      plan: 'premium',
      paymentId: request._id,
      message: 'Payment confirmed! Premium features unlocked.'
    });

    // IN-APP NOTIFICATION CENTER: persist a notification record
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: request.requesterId,
        type: 'payment_approved',
        data: {
          title: 'Payment Confirmed! 💳',
          body: `Your payment of ${request.amount} ${request.currency} has been confirmed. Premium is now active!`,
          paymentId: String(request._id),
          amount: request.amount,
          currency: request.currency
        }
      });
    } catch (notifErr) { /* non-critical */ }

    // Notify admins about completed P2P payment
    notifyAdmins(req, 'new_pending_payment', {
      paymentId: request._id,
      requesterId: userId,
      recipientId: request.recipientId,
      amount: request.amount,
      currency: request.currency,
      status: 'paid'
    });

    res.json({ success: true, message: 'Payment completed successfully', request });
  } catch (error) {
    logger.error('Pay request failed:', error);
    res.status(500).json({ success: false, message: 'Failed to process payment' });
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid payment request ID' });
    }

    const request = await PaymentRequest.findById(id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Payment request not found' });
    }

    if (String(request.requesterId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the requester can cancel this payment request' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Payment request is ${request.status}` });
    }

    request.status = 'cancelled';
    request.cancelledAt = new Date();
    await request.save();

    notifyUser(req, String(request.recipientId), 'payment_cancelled', {
      _id: request._id,
      amount: request.amount,
      currency: request.currency
    });

    res.json({ success: true, message: 'Payment request cancelled', request });
  } catch (error) {
    logger.error('Cancel request failed:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel payment request' });
  }
};

exports.getPaymentBalance = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const [sent, received] = await Promise.all([
      PaymentRequest.countDocuments({ requesterId: userId, status: 'paid' }),
      PaymentRequest.countDocuments({ recipientId: userId, status: 'paid' })
    ]);

    res.json({ success: true, stats: { sent, received } });
  } catch (error) {
    logger.error('Get payment balance failed:', error);
    res.status(500).json({ success: false, message: 'Failed to get payment stats' });
  }
};
