const mongoose = require('mongoose');

const broadcastSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  sender: {
    type: String,
    default: ''
  },
  createdBy: {
    type: String,
    required: true
  },
  recipients: [{
    type: String,
    required: true
  }],
  message: {
    type: String,
    required: true
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient querying
broadcastSchema.index({ createdBy: 1, createdAt: -1 });
broadcastSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Broadcast', broadcastSchema);
