const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'pending', 'failed'],
    default: 'expired'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['airtel', 'airtel-money', 'yas', 'mpesa', 'halopesa', 'card', 'mock'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    default: 10000,
    required: true
  },
  currency: {
    type: String,
    default: 'TSH'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    required: true
  },
  merchantTransactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  receiverNumber: {
    type: String,
    default: '0639533428'
  },
  paymentGatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  webhookReceived: {
    type: Boolean,
    default: false
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed
  },
  processedTransactionIds: [{
    type: String,
    index: true
  }],
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  paymentHistory: [{
    transactionId: String,
    amount: Number,
    paymentMethod: String,
    status: String,
    paymentDate: Date,
    expiryDate: Date
  }],
  autoLocked: {
    type: Boolean,
    default: false
  },
  lockReason: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Set expiry to exactly 60 days from start date
subscriptionSchema.pre('save', function(next) {
  if (this.isModified('startDate') || this.isNew) {
    const expiryDate = new Date(this.startDate);
    expiryDate.setDate(expiryDate.getDate() + 60); // Exactly 60 days
    this.expiryDate = expiryDate;
  }
  this.updatedAt = Date.now();
  next();
});

// Check if subscription is active
subscriptionSchema.methods.isActive = function() {
  if (this.status !== 'active') return false;
  return new Date() <= this.expiryDate;
};

// Get remaining days
subscriptionSchema.methods.getRemainingDays = function() {
  if (!this.expiryDate) return 0;
  const now = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// Add to payment history
subscriptionSchema.methods.addToPaymentHistory = function(paymentData) {
  this.paymentHistory.push({
    transactionId: paymentData.transactionId,
    amount: paymentData.amount,
    paymentMethod: paymentData.paymentMethod,
    status: paymentData.status,
    paymentDate: paymentData.paymentDate || new Date(),
    expiryDate: paymentData.expiryDate
  });
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
