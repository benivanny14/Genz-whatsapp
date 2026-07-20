const mongoose = require('mongoose');

const scheduledMessageSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  messageType: {
    type: String,
    default: 'text',
    enum: ['text', 'image', 'video', 'audio', 'document']
  },
  mediaUrl: {
    type: String,
    default: ''
  },
  fileName: {
    type: String,
    default: ''
  },
  fileSize: {
    type: Number,
    default: 0
  },
  sendAt: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending'
  },
  sentAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: ''
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  }
}, {
  timestamps: true
});

// Index for efficient querying of pending messages
scheduledMessageSchema.index({ sendAt: 1, status: 1 });
scheduledMessageSchema.index({ sender: 1, status: 1 });
scheduledMessageSchema.index({ conversationId: 1, status: 1 });

module.exports = mongoose.model('ScheduledMessage', scheduledMessageSchema);
