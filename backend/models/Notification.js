/**
 * Notification.js — In-app notification model for the Notification Center.
 *
 * Stores every notification that should appear in the bell-icon dropdown:
 * message received, status posted, payment approved, group invite, missed
 * call, etc. The user can browse, mark-read, or dismiss them.
 */

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        'message',
        'status',
        'payment_approved',
        'payment_rejected',
        'group_invite',
        'group_joined',
        'call_missed',
        'system'
      ],
      required: true,
      index: true
    },
    /** Flexible payload — title, body, conversationId, avatar, link, etc. */
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    /** Expiry date for auto-cleanup (default 30 days) */
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
  },
  { timestamps: true }
);

// Compound index for the primary query: unread notifications for a user
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// TTL index — MongoDB auto-deletes expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);
