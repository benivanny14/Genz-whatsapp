const mongoose = require('mongoose');

// A single post/update inside a Channel's feed — this is the piece that
// was missing from the Channels feature: Channel.js + channelRoutes.js
// only ever supported discover/create/follow/unfollow, with no way for
// the owner to actually post an update or for followers to see one.
const channelPostSchema = new mongoose.Schema({
  channel: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: true, index: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, maxlength: 4000, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, enum: ['none', 'image', 'video', 'audio', 'document'], default: 'none' },
  viewsCount: { type: Number, default: 0 },
  viewedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    emoji: { type: String, default: '❤️' }
  }],
  isPinned: { type: Boolean, default: false },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

channelPostSchema.index({ channel: 1, createdAt: -1 });
channelPostSchema.index({ channel: 1, isPinned: -1, createdAt: -1 });

module.exports = mongoose.model('ChannelPost', channelPostSchema);
