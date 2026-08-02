const mongoose = require('mongoose');

const paymentRequestSchema = new mongoose.Schema({
  requesterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requesterName: { type: String, required: true },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recipientName: { type: String, required: true },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },
  amount: { type: Number, required: true, min: 1 },
  currency: { type: String, default: 'TZS' },
  note: { type: String, maxlength: 500, default: '' },
  status: {
    type: String,
    enum: ['pending', 'paid', 'cancelled', 'expired'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['mobile_money', 'card', 'bank_transfer', 'cash'],
    default: 'mobile_money'
  },
  dueAt: { type: Date, default: null },
  paidAt: { type: Date, default: null },
  cancelledAt: { type: Date, default: null },
  requesterPhone: { type: String, default: '' },
  recipientPhone: { type: String, default: '' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

paymentRequestSchema.index({ requesterId: 1, createdAt: -1 });
paymentRequestSchema.index({ recipientId: 1, status: 1, createdAt: -1 });
paymentRequestSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentRequest', paymentRequestSchema);
