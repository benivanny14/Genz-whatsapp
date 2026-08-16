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
    required: false,
    trim: true,
    default: ''
  },
  isMassMessage: {
    type: Boolean,
    default: false
  },
  // Optional text that travels alongside a non-text message (e.g. a sticker
  // sent together with a typed reply, TikTok-style: text on top, sticker
  // below, both inside the same bubble). Kept separate from `content` so a
  // sticker message's `content` can stay the sticker URL/id.
  caption: {
    type: String,
    default: '',
    trim: true
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
      'poll',
      'structured' // New type for structured TikTok-style messages
    ],
    default: 'text'
  },
  structuredContent: [{
    type: {
      type: String,
      enum: ['text', 'sticker', 'gif', 'image', 'video']
    },
    value: String,
    font: String,
    meta: mongoose.Schema.Types.Mixed
  }],
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
  // Location message fields (used when messageType === 'location').
  // Kept as flat fields (not nested) to match the style of mediaUrl/fileName above.
  latitude: {
    type: Number,
    default: null
  },
  longitude: {
    type: Number,
    default: null
  },
  isLiveLocation: {
    type: Boolean,
    default: false
  },
  liveLocationExpiresAt: {
    type: Date,
    default: null
  },
  liveLocationStoppedAt: {
    type: Date,
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
  deletedByAdmin: {
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
  // Fake chat (simulated conversations)
  isFake: {
    type: Boolean,
    default: false
  },
  fakeSenderName: {
    type: String,
    default: ''
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
  // Per-message font chosen from the composer font picker (e.g. 'georgia')
  font: {
    type: String,
    default: null
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
  // Edit history for "edited" label tap
  editHistory: [{
    content: { type: String, required: true },
    caption: { type: String, default: '' },
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
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
  isVideoNote: {
    type: Boolean,
    default: false
  },
  isConsumed: {
    type: Boolean,
    default: false
  },
  // When a receiver first revealed the view-once content (audit trail; the
  // sender can see the message was opened even before it is marked consumed).
  revealedAt: {
    type: Date,
    default: null
  },
  // Every receiver who revealed the content — each gets exactly one reveal,
  // without blocking other group members from their own single view.
  revealedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isSelfDestruct: {
    type: Boolean,
    default: false
  },
  // Keep in chat for disappearing messages
  keptBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    keptAt: { type: Date, default: Date.now }
  }],

  quotedStatus: {
    statusId: { type: String, default: null },
    ownerName: { type: String, default: null },
    preview: { type: String, default: null },
    type: { type: String, default: 'text' },
    mediaUrl: { type: String, default: null }
  },
  // How many times this message (chain) has been forwarded. Used to enforce
  // forwarding limits like WhatsApp ("forwarded many times" -> single chat).
  forwardCount: { type: Number, default: 0 },
  isForwarded: {
    type: Boolean,
    default: false
  },
  forwardedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  originalMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  clientMessageId: {
    type: String,
    default: undefined
  },
  // Anti-screenshot tracking
  allowScreenshot: {
    type: Boolean,
    default: true
  },
  screenshotAttempts: [{
    attemptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    attemptedAt: {
      type: Date,
      default: Date.now
    }
  }],
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
// SECURITY (1.6): speed up the 30-day hard-delete sweep.
messageSchema.index({ deletedForEveryone: 1, deletedAt: 1 });
messageSchema.index({ 'mentions.user': 1, createdAt: -1 });
// Deduplication: clientMessageId prevents the same message being saved twice on reconnect
// Compound unique (sender+conversation) stops attackers reserving another user's clientMessageId,
// and the partial filter excludes empty strings so messages sent without an id never collide.
messageSchema.index(
  { sender: 1, conversationId: 1, clientMessageId: 1 },
  { unique: true, partialFilterExpression: { clientMessageId: { $type: 'string', $ne: '' } } }
);
// Speed up "unread in this conversation for this user" queries
messageSchema.index({ conversationId: 1, 'readBy.user': 1 });
// TTL index for disappearing messages - MongoDB will delete documents when disappearAt is reached
messageSchema.index({ disappearAt: 1 }, { expireAfterSeconds: 0, partialFilterExpression: { disappearAt: { $exists: true, $ne: null } } });

module.exports = mongoose.model('Message', messageSchema);
