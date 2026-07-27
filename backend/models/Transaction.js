const mongoose = require('mongoose');

/**
 * Transaction Model
 * Stores payment transactions for M-Pesa, Airtel, and other payment providers
 */

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  provider: {
    type: String,
    enum: ['mpesa', 'airtel', 'yas', 'halopesa', 'card'],
    required: true
  },
  type: {
    type: String,
    enum: ['subscription', 'premium', 'topup', 'refund'],
    default: 'subscription'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'TZS'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },
  
  // Provider-specific fields
  transactionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  providerTransactionId: {
    type: String,
    index: true
  },
  merchantRequestID: {
    type: String
  },
  checkoutRequestID: {
    type: String
  },
  
  // Phone number for mobile money
  phoneNumber: {
    type: String
  },
  
  // Reference and description
  reference: {
    type: String
  },
  description: {
    type: String
  },
  
  // Callback data
  callbackData: {
    type: mongoose.Schema.Types.Mixed
  },
  lastWebhookHash: {
    type: String
  },
  webhookEvents: [{
    payloadHash: String,
    status: String,
    reason: String,
    receivedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Receipt information
  receiptNumber: {
    type: String
  },
  transactionDate: {
    type: Date
  },
  
  // Refund information
  refundReason: {
    type: String
  },
  refundedAt: {
    type: Date
  },
  refundTransactionId: {
    type: String
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // Expiration for pending transactions
  expiresAt: {
    type: Date
  }
});

// Index for querying user transactions
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ checkoutRequestID: 1 });
transactionSchema.index({ merchantRequestID: 1 });
transactionSchema.index({ provider: 1, status: 1, createdAt: -1 });

// Update timestamp before saving
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Check if transaction is expired
transactionSchema.methods.isExpired = function() {
  if (!this.expiresAt) {
    return false;
  }
  return new Date() > new Date(this.expiresAt);
};

// Mark transaction as completed
transactionSchema.methods.markCompleted = function(providerTransactionId, receiptNumber, transactionDate) {
  this.status = 'completed';
  this.providerTransactionId = providerTransactionId;
  this.receiptNumber = receiptNumber;
  this.transactionDate = transactionDate;
  this.updatedAt = Date.now();
};

// Mark transaction as failed
transactionSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.description = reason || 'Transaction failed';
  this.updatedAt = Date.now();
};

// Mark transaction as refunded
transactionSchema.methods.markRefunded = function(refundTransactionId, reason) {
  this.status = 'refunded';
  this.refundTransactionId = refundTransactionId;
  this.refundReason = reason;
  this.refundedAt = new Date();
  this.updatedAt = Date.now();
};

module.exports = mongoose.model('Transaction', transactionSchema);
