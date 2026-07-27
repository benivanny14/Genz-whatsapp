const mongoose = require('mongoose');

const ticketMessageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['user', 'admin'], required: true },
  senderId: { type: String, default: '' }, // User._id string, or 'owner' for admin
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  readByAdmin: { type: Boolean, default: false },
  readByUser: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const supportTicketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subject: { type: String, required: true, trim: true, maxlength: 150 },
  category: {
    type: String,
    enum: ['general', 'payment', 'account', 'bug', 'abuse_report', 'direct_message'],
    default: 'general'
  },
  status: { type: String, enum: ['open', 'pending', 'resolved', 'closed'], default: 'open', index: true },
  priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
  // 'direct_message' category tickets are opened BY the admin (Admin <-> User
  // Chat) rather than by the user reporting an issue.
  openedBy: { type: String, enum: ['user', 'admin'], default: 'user' },
  conversation: [ticketMessageSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

supportTicketSchema.index({ status: 1, updatedAt: -1 });
supportTicketSchema.index({ userId: 1, updatedAt: -1 });

supportTicketSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
