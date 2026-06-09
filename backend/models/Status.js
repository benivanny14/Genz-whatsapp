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

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'voice'],
    required: true
  },
  content: { type: String, default: '' },        // text content au caption
  mediaUrl: { type: String, default: '' },        // image/video/voice URL
  duration: { type: Number, default: 0 },         // video/voice duration
  backgroundColor: { type: String, default: '#075E54' }, // kwa text status
  fontStyle: { type: String, default: 'sans' },
  views: [viewSchema],
  reactions: [reactionSchema],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // saa 24
  },
  createdAt: { type: Date, default: Date.now }
});

// Auto-delete baada ya saa 24
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Status', statusSchema);
