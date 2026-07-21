const Subscription = require('../models/Subscription');
const { handleProviderStatusCallback } = require('../services/paymentService');

// @desc    Handle M-Pesa webhook
// @route   POST /api/payment/webhook/mpesa
// @access  Public (webhook)
exports.mpesaWebhook = async (req, res) => {
  try {
    const { Body } = req.body;
    
    // Process webhook payload
    console.log('M-Pesa webhook received:', Body);
    
    // Update subscription status based on webhook
    if (Body && Body.stkCallback) {
      const { MerchantRequestID, ResultCode, CallbackMetadata } = Body.stkCallback;
      
      if (ResultCode === 0) {
        // Payment successful - update subscription
        const subscription = await Subscription.findOne({ transactionId: MerchantRequestID });
        if (subscription) {
          subscription.paymentStatus = 'completed';
          subscription.status = 'active';
          subscription.webhookData = Body.stkCallback;
          await subscription.save();
        }
      } else {
        // Payment failed
        const subscription = await Subscription.findOne({ transactionId: MerchantRequestID });
        if (subscription) {
          subscription.paymentStatus = 'failed';
          subscription.status = 'failed';
          subscription.webhookData = Body.stkCallback;
          await subscription.save();
        }
      }
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('M-Pesa webhook error:', error);
    res.status(200).json({ success: true }); // Always return 200 to webhook
  }
};

// @desc    Handle Airtel webhook
// @route   POST /api/payment/webhook/airtel
// @access  Public (webhook)
exports.airtelWebhook = async (req, res) => {
  try {
    console.log('Airtel webhook received:', req.body);
    
    // Process webhook payload and update subscription
    // Implementation similar to M-Pesa
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Airtel webhook error:', error);
    res.status(200).json({ success: true });
  }
};

// @desc    Handle YAS webhook
// @route   POST /api/payment/webhook/yas
// @access  Public (webhook)
exports.yasWebhook = async (req, res) => {
  try {
    const result = await handleProviderStatusCallback('yas', req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('YAS webhook error:', error);
    res.status(200).json({ success: true });
  }
};

// @desc    Handle Halopesa webhook
// @route   POST /api/payment/webhook/halopesa
// @access  Public (webhook)
exports.halopesaWebhook = async (req, res) => {
  try {
    const result = await handleProviderStatusCallback('halopesa', req.body);
    res.status(200).json(result);
  } catch (error) {
    console.error('Halopesa webhook error:', error);
    res.status(200).json({ success: true });
  }
};

// @desc    Generic webhook handler
// @route   POST /api/payment/webhook
// @access  Public (webhook)
exports.paymentWebhook = async (req, res) => {
  try {
    const provider = req.body.provider || req.query.provider;
    if (['yas', 'halopesa'].includes(provider)) {
      const result = await handleProviderStatusCallback(provider, req.body);
      return res.status(200).json(result);
    }
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Generic webhook error:', error);
    res.status(200).json({ success: true });
  }
};
