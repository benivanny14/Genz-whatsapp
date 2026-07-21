const mongoose = require('mongoose');
const crypto = require('crypto');

const callLinkSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
    default: () => crypto.randomBytes(9).toString('base64url')
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    default: null
  },
  callType: {
    type: String,
    enum: ['voice', 'video'],
    default: 'voice'
  },
  active: {
    type: Boolean,
    default: true
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  expiresAt: {
    type: Date,
    // Call links behave like WhatsApp's: valid for 24 hours by default
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000)
  }
}, { timestamps: true });

callLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CallLink', callLinkSchema);
