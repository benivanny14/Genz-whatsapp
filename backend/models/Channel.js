const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 50 },
  description: { type: String, maxlength: 200, default: '' },
  category: { type: String, default: 'General',
    enum: ['General','News','Sports','Entertainment','Technology','Business','Health','Education','Other'] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  avatar: { type: String, default: '' },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followersCount: { type: Number, default: 0 },
  verified: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: true },
}, { timestamps: true });

channelSchema.index({ name: 'text', description: 'text' });
channelSchema.index({ followersCount: -1 });

module.exports = mongoose.model('Channel', channelSchema);
