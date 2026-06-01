const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
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
    required: true,
    trim: true
  },
  isClientE2EE: {
    type: Boolean,
    default: false
  },
  messageType: {
    type: String,
    enum: [
      'text',
      'image',
      'video',
      'audio',
      'file',
      'document',
      'voice',
      'gif',
      'sticker',
      'location',
      'contact',
      'system',
      'poll'
    ],
    default: 'text'
  },
  poll: {
    question: String,
    options: [{
      text: String,
      votes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }]
    }]
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
  duration: {
    type: Number,
    default: 0
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  mentions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      default: ''
    },
    displayName: {
      type: String,
      default: ''
    }
  }],
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  deletedForEveryone: {
    type: Boolean,
    default: false
  },
  // Anti-delete tracking
  wasDeletedBySender: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  },
  originalContent: {
    type: String,
    default: ''
  },
  // Voice effects
  voiceEffect: {
    type: String,
    enum: ['none', 'robot', 'chipmunk', 'deep', 'echo', 'reverse'],
    default: 'none'
  },
  // GENZ Mods flags
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date,
    default: null
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  isScheduled: {
    type: Boolean,
    default: false
  },
  disappearAt: {
    type: Date,
    default: null
  },
  isViewOnce: {
    type: Boolean,
    default: false
  },
  translation: {
    originalLanguage: String,
    translatedText: String,
    targetLanguage: String
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  quotedStatus: {
    statusId: { type: String, default: null },
    ownerName: { type: String, default: null },
    preview: { type: String, default: null },
    type: { type: String, default: 'text' },
    mediaUrl: { type: String, default: null }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for performance optimization
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ isStarred: 1 });
messageSchema.index({ deletedForEveryone: 1 });
messageSchema.index({ 'mentions.user': 1, createdAt: -1 });
// TTL index for disappearing messages - MongoDB will delete documents when disappearAt is reached
messageSchema.index({ disappearAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { disappearAt: { $exists: true, $ne: null } } });

module.exports = mongoose.model('Message', messageSchema);
