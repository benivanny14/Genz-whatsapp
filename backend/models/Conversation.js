const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isGroup: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    default: ''
  },
  groupPhoto: {
    type: String,
    default: ''
  },
  groupDescription: {
    type: String,
    default: ''
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  groupInviteCode: {
    type: String,
    default: '',
    select: false
  },
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  typingUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isArchived: {
    type: Map,
    of: Boolean,
    default: {}
  },
  isPinned: {
    type: Map,
    of: Boolean,
    default: {}
  },
  pinnedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  lockedBy: {
    type: Map,
    of: Boolean,
    default: {}
  },
  lockPins: {
    type: Map,
    of: String,
    default: {}
  },
  adminOnlyMessaging: {
    type: Boolean,
    default: false
  },
  canSendMedia: {
    type: Boolean,
    default: true
  },
  canCreatePolls: {
    type: Boolean,
    default: true
  },
  canChangeGroupInfo: {
    type: Boolean,
    default: true
  },
  // "Add members" permission — mirrors real WhatsApp's group setting that
  // lets admins choose whether ALL participants or only admins can add
  // new members. Defaults to admin-only (matches previous hardcoded behavior).
  canAddMembers: {
    type: Boolean,
    default: false
  },
  customRoles: [{
    name: String,
    permissions: {
      type: [String],
      default: []
    }
  }],
  mutedUntil: {
    type: Map,
    of: Date,
    default: {}
  },
  disappearingMessages: {
    enabled: {
      type: Boolean,
      default: false
    },
    duration: {
      type: String,
      default: '24h'
    },
    timer: {
      type: Number,
      default: 24
    }
  },
  participantRoles: {
    type: Map,
    of: String,
    default: {}
  },
  // Group join-request queue (approve/reject flow)
  pendingJoinRequests: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date, default: Date.now },
    inviteCode: String,
  }],
  // Require admin approval before joining via link
  requireJoinApproval: {
    type: Boolean,
    default: false,
  },
  // Banned members (kicked and cannot rejoin)
  bannedMembers: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bannedAt: { type: Date, default: Date.now },
    reason: { type: String, default: '' },
  }],
  // Anti-spam settings
  antiSpam: {
    enabled: { type: Boolean, default: false },
    maxMessagesPerMinute: { type: Number, default: 20 },
    slowModeSeconds: { type: Number, default: 0 },
  },
  // Group owner (creator who can transfer ownership)
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  // Group events
  events: [{
    title: String,
    description: String,
    startTime: Date,
    endTime: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    rsvp: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status: { type: String, enum: ['going', 'maybe', 'notgoing'], default: 'going' },
    }],
  }],
  // Message spam tracking (per-user last message timestamps)
  spamTracker: {
    type: Map,
    of: [Date],
    default: {},
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

conversationSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.participants && Array.isArray(ret.participants)) {
      ret.participants = ret.participants.map(p => {
        if (p && typeof p === 'object' && p._id) {
          const userIdStr = p._id.toString();
          let role = 'member';
          if (ret.admins && ret.admins.some(adminId => adminId.toString() === userIdStr)) {
            role = 'admin';
          } else if (ret.participantRoles) {
            // Mongoose Map might be serialised to a plain object or map depending on configuration
            const val = ret.participantRoles instanceof Map ? ret.participantRoles.get(userIdStr) : ret.participantRoles[userIdStr];
            if (val) {
              role = val;
            }
          }
          p.role = role;
        }
        return p;
      });
    }
    return ret;
  }
});

conversationSchema.set('toObject', {
  virtuals: true,
  transform: function(doc, ret) {
    if (ret.participants && Array.isArray(ret.participants)) {
      ret.participants = ret.participants.map(p => {
        if (p && typeof p === 'object' && p._id) {
          const userIdStr = p._id.toString();
          let role = 'member';
          if (ret.admins && ret.admins.some(adminId => adminId.toString() === userIdStr)) {
            role = 'admin';
          } else if (ret.participantRoles) {
            const val = ret.participantRoles instanceof Map ? ret.participantRoles.get(userIdStr) : ret.participantRoles[userIdStr];
            if (val) {
              role = val;
            }
          }
          p.role = role;
        }
        return p;
      });
    }
    return ret;
  }
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

// Indexes for performance optimization
conversationSchema.index({ participants: 1, updatedAt: -1 });
conversationSchema.index({ 'participants.$': 1 });
conversationSchema.index({ isGroup: 1 });
conversationSchema.index({ isArchived: 1, updatedAt: -1 });
conversationSchema.index({ isPinned: 1 });
// Fast invite-code lookups (join via link)
conversationSchema.index({ groupInviteCode: 1 }, { sparse: true });
// Partial index for active groups only (saves index space)
conversationSchema.index({ isGroup: 1, updatedAt: -1 }, { partialFilterExpression: { isGroup: true } });
conversationSchema.index({ 'bannedMembers.user': 1 }, { sparse: true });
conversationSchema.index({ owner: 1 }, { sparse: true });
conversationSchema.index({ requireJoinApproval: 1 }, { sparse: true });

module.exports = mongoose.model('Conversation', conversationSchema);
