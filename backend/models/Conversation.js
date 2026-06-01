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

module.exports = mongoose.model('Conversation', conversationSchema);
