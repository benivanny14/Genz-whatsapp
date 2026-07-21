const mongoose = require('mongoose');

const profileViewSchema = new mongoose.Schema({
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  viewedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  viewedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// One "latest view" record per (viewer, viewedUser) pair — re-viewing just bumps the date
profileViewSchema.index({ viewer: 1, viewedUser: 1 }, { unique: true });
profileViewSchema.index({ viewedUser: 1, viewedAt: -1 });

module.exports = mongoose.model('ProfileView', profileViewSchema);
