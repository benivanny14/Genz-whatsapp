const mongoose = require('mongoose');

const viewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now }
});

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const musicSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  file: { type: String, default: '' },
  startTime: { type: Number, default: 0 },
  endTime: { type: Number, default: 15 },
  volume: { type: Number, default: 0.5 }
}, { _id: false });

const statusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  caption: {
    type: String,
    default: '',
    maxlength: 500
  },
  // Text status styling
  textStatus: {
    text: { type: String, default: '' },
    backgroundColor: { type: String, default: '#128C7E' },
    fontColor: { type: String, default: '#FFFFFF' },
    fontStyle: { type: String, default: 'normal' }
  },
  // Music attached to status
  music: musicSchema,
  // Privacy settings
  privacy: {
    type: String,
    enum: ['contacts', 'contacts_except', 'only_share_with', 'nobody'],
    default: 'contacts'
  },
  excludedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  includedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Muted by
  mutedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Archive status
  archived: {
    type: Boolean,
    default: false
  },
  // Views & engagement
  viewCount: { type: Number, default: 0 },
  views: [viewSchema],
  reactions: [reactionSchema],
  // Replies
  replies: [{
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  // Poll support
  poll: {
    question: { type: String },
    options: [{
      id: { type: Number },
      text: { type: String },
      votes: { type: Number, default: 0 }
    }],
    allowMultiple: { type: Boolean, default: false },
    expiresAt: { type: Date },
    totalVotes: { type: Number, default: 0 },
    voters: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      optionIds: [Number],
      votedAt: { type: Date }
    }]
  },
  // Forward support
  forwards: [{
    forwardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contacts: [{ type: mongoose.Schema.Types.ObjectId }],
    groups: [{ type: mongoose.Schema.Types.ObjectId }],
    message: { type: String },
    forwardedAt: { type: Date }
  }],
  forwardCount: { type: Number, default: 0 },
  // Duration in seconds (for video)
  duration: { type: Number, default: 0 },
  // Expiry (auto-delete after 24h)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 }
  },
  createdAt: { type: Date, default: Date.now }
});

// Indexes
statusSchema.index({ userId: 1, createdAt: -1 });
statusSchema.index({ userId: 1, expiresAt: -1 });

module.exports = mongoose.model('Status', statusSchema);
