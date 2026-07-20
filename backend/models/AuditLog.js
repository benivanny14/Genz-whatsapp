const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  action: {
    type: String,
    required: true,
    trim: true
  },
  targetUserId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  targetSubscriptionId: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetUserId: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
