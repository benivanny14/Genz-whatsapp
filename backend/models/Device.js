const mongoose = require('mongoose');

const DeviceSchema = new mongoose.Schema({
  // User that owns this linked device.
  localUserId: {
    type: String,
    required: true,
    index: true
  },
  
  // Device unique identifier
  deviceId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Device name (user-defined)
  deviceName: {
    type: String,
    default: 'Unknown Device'
  },
  
  // Device type (mobile, desktop, web)
  deviceType: {
    type: String,
    enum: ['mobile', 'desktop', 'web', 'tablet'],
    default: 'web'
  },
  
  // Device platform/browser info
  platform: {
    type: String
  },
  
  browser: {
    type: String
  },
  
  // QR pairing token (temporary)
  pairingToken: {
    type: String,
    index: { expires: 300 } // Expires after 5 minutes
  },
  
  // Device status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Last active timestamp
  lastActive: {
    type: Date,
    default: Date.now
  },
  
  // IP address tracking
  ipAddress: {
    type: String
  },
  
  // Device capabilities
  capabilities: {
    notifications: { type: Boolean, default: false },
    calls: { type: Boolean, default: true },
    screenShare: { type: Boolean, default: true },
    recording: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Index for faster queries
DeviceSchema.index({ localUserId: 1, isActive: 1 });
DeviceSchema.index({ localUserId: 1, lastActive: -1 });

// Update last active on save
DeviceSchema.pre('save', function(next) {
  if (this.isModified('isActive') && this.isActive) {
    this.lastActive = Date.now();
  }
  next();
});

module.exports = mongoose.model('Device', DeviceSchema);
