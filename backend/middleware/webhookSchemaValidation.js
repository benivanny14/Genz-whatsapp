// Webhook schema validation middleware
const { body, validationResult } = require('express-validator');

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

const getMpesaStkCallback = (payload = {}) => payload.Body?.stkCallback || payload.stkCallback;

// M-Pesa webhook schema validation
const validateMpesaWebhook = [
  body().custom((payload = {}) => {
    const stkCallback = getMpesaStkCallback(payload);
    if (stkCallback) {
      if (!hasValue(stkCallback.ResultCode)) {
        throw new Error('ResultCode is required');
      }
      if (!hasValue(stkCallback.MerchantRequestID)) {
        throw new Error('MerchantRequestID is required');
      }
      if (!hasValue(stkCallback.CheckoutRequestID)) {
        throw new Error('CheckoutRequestID is required');
      }
      return true;
    }

    const responseCode = payload.output_ResponseCode || payload.ResultCode;
    const transactionRef = payload.output_TransactionID ||
      payload.input_TransactionID ||
      payload.TransactionID ||
      payload.input_ThirdPartyConversationID ||
      payload.output_ConversationID ||
      payload.ConversationID;

    if (hasValue(responseCode) && hasValue(transactionRef)) {
      return true;
    }

    throw new Error('M-Pesa webhook must include Daraja stkCallback or Vodacom OpenAPI transaction identifiers');
  }),
  
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
