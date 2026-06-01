// Webhook schema validation middleware
const { body, validationResult } = require('express-validator');

// M-Pesa webhook schema validation
const validateMpesaWebhook = [
  body('Body').exists().withMessage('Body is required'),
  body('Body.stkCallback').exists().withMessage('stkCallback is required'),
  body('Body.stkCallback.ResultCode').exists().isInt().withMessage('ResultCode must be an integer'),
  body('Body.stkCallback.MerchantRequestID').exists().withMessage('MerchantRequestID is required'),
  body('Body.stkCallback.CheckoutRequestID').exists().withMessage('CheckoutRequestID is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('M-Pesa webhook validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid webhook payload',
        errors: errors.array() 
      });
    }
    next();
  }
];

// Airtel Money webhook schema validation
const validateAirtelWebhook = [
  body().custom((payload) => {
    const transaction = payload.transaction || {};
    const transactionId = payload.transaction_id || payload.external_id || transaction.transaction_id || transaction.external_id;
    if (!transactionId) {
      throw new Error('Airtel transaction_id or external_id is required');
    }
    return true;
  }),
  body().custom((payload) => {
    const status = payload.status || payload.transaction?.status;
    if (!status || typeof status !== 'string') {
      throw new Error('Airtel status is required');
    }
    return true;
  }),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Airtel webhook validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid webhook payload',
        errors: errors.array() 
      });
    }
    next();
  }
];

// Yas webhook schema validation
const validateYasWebhook = [
  body('status').exists().isString().withMessage('status must be a string'),
  body('transaction_id').exists().withMessage('transaction_id is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Yas webhook validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid webhook payload',
        errors: errors.array() 
      });
    }
    next();
  }
];

// HaloPesa webhook schema validation
const validateHalopesaWebhook = [
  body('status').exists().isString().withMessage('status must be a string'),
  body('transaction_id').exists().withMessage('transaction_id is required'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('HaloPesa webhook validation errors:', errors.array());
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid webhook payload',
        errors: errors.array() 
      });
    }
    next();
  }
];

module.exports = {
  validateMpesaWebhook,
  validateAirtelWebhook,
  validateYasWebhook,
  validateHalopesaWebhook
};
