const mongoose = require('mongoose');

const CallLogSchema = new mongoose.Schema({
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    index: true
  },
  callerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  calleeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  callType: {
    type: String,
    enum: ['voice', 'video'],
    default: 'voice'
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'missed', 'rejected', 'cancelled'],
    default: 'completed'
  },
  duration: {
    type: Number,
    default: 0
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  },
  isGroup: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

CallLogSchema.index({ callerId: 1, createdAt: -1 });
CallLogSchema.index({ calleeId: 1, createdAt: -1 });
CallLogSchema.index({ participants: 1, createdAt: -1 });

module.exports = mongoose.model('CallLog', CallLogSchema);
