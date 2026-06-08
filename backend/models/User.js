const crypto = require('crypto');
const { promisify } = require('util');
const mongoose = require('mongoose');
const { createDefaultWhatsAppSettings } = require('../utils/whatsappSettings');

const scrypt = promisify(crypto.scrypt);
const PASSWORD_KEY_LENGTH = 64;

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: ''
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpiresAt: {
    type: Date,
    default: null
  },

  passwordHash: {
    type: String,
    default: ''
  },
  deviceId: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },

  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpiresAt: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: null
  },
  twoFactorSecret: {
    type: String,
    default: null
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorVerified: {
    type: Boolean,
    default: false
  },
  fcmTokens: [{
    type: String,
    default: []
  }],
  encryptionKeys: {
    publicKey: String,
    privateKey: String,
    signaturePublicKey: String,
    signaturePrivateKey: String
  },
  encryptionKeyHistory: [{
    publicKey: String,
    signaturePublicKey: String,
    rotatedAt: Date
  }],
  securitySettings: {
    loginAlerts: {
      type: Boolean,
      default: true
    },
    sessionTimeout: {
      type: Number,
      default: 30
    },
    requireTwoFactorForPayments: {
      type: Boolean,
      default: false
    }
  },
  backupSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    interval: {
      type: String,
      enum: ['hourly', 'daily', 'weekly', 'monthly'],
      default: 'daily'
    },
    lastBackupAt: {
      type: Date,
      default: null
    }
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: createDefaultWhatsAppSettings
  },
  profilePicture: {
    type: String,
    default: null
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  premium: {
    type: Boolean,
    default: false
  },
  subscriptionExpiresAt: {
    type: Date,
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  about: {
    type: String,
    default: 'Hey there! I am using GENZ WhatsApp'
  },
  bio: {
    type: String,
    default: ''
  },
  contacts: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    savedName: { type: String, required: true }
  }],
  profileVisitors: [{
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    visitorName: { type: String, default: 'Someone' },
    visitorPicture: { type: String, default: null },
    timestamp: { type: Date, default: Date.now }
  }],
  blockedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  autoReplyEnabled: {
    type: Boolean,
    default: false
  },
  autoReplyMessage: {
    type: String,
    default: ''
  },
  genzMods: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Business account fields
  isBusinessAccount: {
    type: Boolean,
    default: false
  },
  businessProfile: {
    businessName: {
      type: String,
      default: ''
    },
    businessCategory: {
      type: String,
      enum: ['retail', 'services', 'food', 'technology', 'healthcare', 'education', 'entertainment', 'other'],
      default: 'other'
    },
    businessAddress: {
      type: String,
      default: ''
    },
    businessEmail: {
      type: String,
      default: ''
    },
    businessWebsite: {
      type: String,
      default: ''
    },
    businessDescription: {
      type: String,
      default: ''
    },
    businessHours: {
      type: String,
      default: ''
    }
  },
  // Business catalog
  catalog: [{
    productId: String,
    name: String,
    description: String,
    price: Number,
    currency: {
      type: String,
      default: 'USD'
    },
    imageUrl: String,
    inStock: {
      type: Boolean,
      default: true
    }
  }],
  // Quick replies for business
  quickReplies: [{
    id: String,
    message: String,
    shortcut: String
  }],
  // Away message for business
  awayMessage: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: ''
    }
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  lastFailedLoginAt: {
    type: Date,
    default: null
  },
  activeSessions: [{
    token: String,
    device: String,
    ip: String,
    userAgent: String,
    createdAt: { type: Date, default: Date.now },
    lastActiveAt: { type: Date, default: Date.now }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update last seen before saving
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

userSchema.methods.setPassword = async function(password) {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  this.passwordHash = `${salt}:${derivedKey.toString('hex')}`;
  this.passwordChangedAt = new Date();
};

userSchema.methods.comparePassword = async function(password) {
  if (!password || !this.passwordHash || !this.passwordHash.includes(':')) {
    return false;
  }

  const [salt, storedHash] = this.passwordHash.split(':');
  const derivedKey = await scrypt(password, salt, PASSWORD_KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (storedBuffer.length !== derivedKey.length) {
    return false;
  }

  return crypto.timingSafeEqual(storedBuffer, derivedKey);
};

userSchema.methods.toSafeJSON = function() {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.twoFactorSecret;
  delete user.passwordResetToken;
  delete user.failedLoginAttempts;
  delete user.lockUntil;
  delete user.lastFailedLoginAt;
  delete user.activeSessions;
  delete user.emailVerificationToken;
  return user;
};

// Account lockout constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 30 * 60 * 1000; // 30 minutes

// Virtual to check if account is currently locked
userSchema.virtual('isAccountLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > new Date());
});

// Increment failed login attempts, lock account if threshold exceeded
userSchema.methods.incLoginAttempts = async function() {
  // If there was a previous lock that has expired, reset
  if (this.lockUntil && this.lockUntil < new Date()) {
    return this.updateOne({
      $set: { failedLoginAttempts: 1, lastFailedLoginAt: new Date() },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = {
    $inc: { failedLoginAttempts: 1 },
    $set: { lastFailedLoginAt: new Date() }
  };

  // Lock account if reaching max attempts
  if (this.failedLoginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isAccountLocked) {
    updates.$set.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
  }

  return this.updateOne(updates);
};

// Reset failed login attempts on successful login
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { failedLoginAttempts: 0 },
    $unset: { lockUntil: 1, lastFailedLoginAt: 1 }
  });
};

// Check if user has active premium
userSchema.methods.hasActivePremium = function() {
  if (!this.premium || !this.subscriptionExpiresAt) {
    return false;
  }
  return new Date() <= new Date(this.subscriptionExpiresAt);
};

// Get subscription status
userSchema.methods.getSubscriptionStatus = function() {
  if (!this.premium) {
    return 'free';
  }
  if (this.hasActivePremium()) {
    return 'active';
  }
  return 'expired';
};

module.exports = mongoose.model('User', userSchema);
