const mongoose = require('mongoose');

/**
 * ManualPayment
 * -----------------------------------------------------------------------
 * Stores a user's manually-submitted mobile money payment (pasted SMS)
 * for subscription verification by an admin. Distinct from the automated
 * gateway `Transaction`/`Subscription` models used elsewhere in the app.
 * -----------------------------------------------------------------------
 */

const adminMessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['admin', 'user'],
    required: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  readByAdmin: { type: Boolean, default: false },
  readByUser: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const approvalHistorySchema = new mongoose.Schema({
  action: { type: String, enum: ['approved', 'rejected', 'marked_duplicate', 'reopened'], required: true },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  byUsername: String,
  reason: String,
  at: { type: Date, default: Date.now }
}, { _id: false });

const manualPaymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  username: { type: String, required: true },
  registeredPhone: { type: String },

  // Raw + parsed payment SMS
  paymentSMS: { type: String, required: true, maxlength: 4000 },
  parsed: {
    operator: { type: String, default: 'Unknown' },
    date: String,
    confidence: { type: String, enum: ['high', 'low'], default: 'low' }
  },
  senderPhone: { type: String },

  transactionId: { type: String, required: true, trim: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'TZS' },

  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Duplicate', 'Expired'],
    default: 'Pending',
    index: true
  },

  // Receiver details (the account users pay into)
  receiverName: { type: String, default: 'ERASTOR GODFREY PAUL' },
  receiverNumber: { type: String, default: '0639533428' },

  submittedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date, default: null },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  rejectedReason: { type: String, default: null },

  subscriptionPlan: { type: String, default: 'Premium' },
  subscriptionDays: { type: Number, default: 30 },
  expiresAt: { type: Date, default: null },

  // Duplicate detection
  duplicateOfPaymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ManualPayment', default: null },

  approvalHistory: [approvalHistorySchema],
  conversation: [adminMessageSchema],

  adminNotes: { type: String, default: '' },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

manualPaymentSchema.index({ status: 1, createdAt: -1 });
manualPaymentSchema.index({ userId: 1, createdAt: -1 });
manualPaymentSchema.index({ transactionId: 1, status: 1 });

manualPaymentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

manualPaymentSchema.methods.getRemainingDays = function () {
  if (!this.expiresAt) return 0;
  const diff = Math.ceil((new Date(this.expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

module.exports = mongoose.model('ManualPayment', manualPaymentSchema);
