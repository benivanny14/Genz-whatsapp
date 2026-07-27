const mongoose = require('mongoose');

const abuseReportSchema = new mongoose.Schema({
  reporterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedContentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false
  },
  contentType: {
    type: String,
    enum: ['message', 'conversation', 'group', 'channel', 'channel_post', 'status', 'user_profile', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['spam', 'harassment', 'inappropriate_content', 'fake_account', 'scam', 'violence', 'hate_speech', 'other'],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'under_review', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    maxlength: 2000
  },
  actionTaken: {
    type: String,
    enum: ['none', 'warning_sent', 'content_removed', 'user_suspended', 'user_banned', 'other'],
    default: 'none'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  screenshots: [{
    type: String
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminOwner'
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better query performance
abuseReportSchema.index({ status: 1, createdAt: -1 });
abuseReportSchema.index({ reportedUserId: 1, status: 1 });
abuseReportSchema.index({ category: 1, status: 1 });
abuseReportSchema.index({ priority: 1, status: 1 });

module.exports = mongoose.model('AbuseReport', abuseReportSchema);
