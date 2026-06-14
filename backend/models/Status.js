const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const viewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now }
});

const replySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: 'text' },
  mediaUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  userId: { type: String },
  username: { type: String },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'voice', 'audio'],
    required: true
  },
  content: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  caption: { type: String, default: '' },
  backgroundColor: { type: String, default: '#075E54' },
  textColor: { type: String, default: '#ffffff' },
  fontStyle: { type: String, default: 'sans' },
  font: { type: String, default: 'sans-serif' },
  privacy: { type: String, default: 'everyone' },
  collabUserId: { type: String, default: '' },
  collabUsername: { type: String, default: '' },
  viewsCount: { type: Number, default: 0 },
  views: [viewSchema],
  reactions: [reactionSchema],
  replies: [replySchema],
  clientStatusId: { type: String },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // saa 24
  },
  createdAt: { type: Date, default: Date.now },
  timestamp: { type: Date, default: Date.now }
});

// Auto-delete baada ya saa 24
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Status', statusSchema);
