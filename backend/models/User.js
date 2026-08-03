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
  onlineHistory: [{
    connectedAt: { type: Date },
    disconnectedAt: { type: Date },
    duration: { type: Number, default: 0 } // seconds
  }],
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
  // Passkeys (WebAuthn / FIDO2 passwordless authentication)
  passkeys: [{
    credentialId: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, default: 0 },
    deviceType: { type: String, default: 'platform' },
    deviceName: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  // Sticker system: which packs the user has "added" (WhatsApp-style, packs
  // live in a shared catalog and each user just keeps a list of pack IDs
  // they've downloaded) and any individual stickers they've favorited.
  downloadedStickerPackIds: {
    type: [String],
    default: []
  },
  favoriteStickers: {
    type: [String],
    default: []
  },
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
  },

  // ── Feature settings/data used by the mod-feature controllers ──
  // Stored as Mixed since each controller manages its own shape and calls
  // markModified() before save(). Without these declared here, mongoose's
  // default strict schema mode silently drops the data on every .save().
  antiBanSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  blockedCallHistory: { type: mongoose.Schema.Types.Mixed, default: [] },
  bulkSenderSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  scheduledBulkMessages: { type: mongoose.Schema.Types.Mixed, default: [] },
  businessAccountSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  cacheCleanerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  cacheData: { type: mongoose.Schema.Types.Mixed, default: {} },
  lastCompressedAt: { type: Date, default: null },
  callBlockerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  callFeaturesSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  chatAnalyzerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  messageCount: { type: mongoose.Schema.Types.Mixed, default: {} },
  chatFilterSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  savedFilterPreferences: { type: mongoose.Schema.Types.Mixed, default: [] },
  chatFolders: { type: mongoose.Schema.Types.Mixed, default: [] },
  chatFoldersSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  chatSearchSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  searchHistory: { type: mongoose.Schema.Types.Mixed, default: [] },
  chatSortSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  collaborativeStatusSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  collaborativeStatuses: { type: mongoose.Schema.Types.Mixed, default: [] },
  dataUsageSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  fakeChatSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  fileManagerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  gifPlayerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  savedGIFs: { type: mongoose.Schema.Types.Mixed, default: [] },
  groupFeaturesSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  liveReactionsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  mediaCompressorSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  mediaEditorSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  editHistory: { type: mongoose.Schema.Types.Mixed, default: [] },
  translatorSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  multiAccountsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  connectedDevices: { type: mongoose.Schema.Types.Mixed, default: [] },
  quickActionsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  closeFriends: { type: mongoose.Schema.Types.Mixed, default: [] },
  statusFeaturesSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  statusHighlights: { type: mongoose.Schema.Types.Mixed, default: [] },
  viewedStatuses: { type: mongoose.Schema.Types.Mixed, default: [] },
  statusReelModeSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  storageManagerSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  storyHighlights: { type: mongoose.Schema.Types.Mixed, default: [] },
  storyHighlightsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  textRepeaterSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  themeEngineSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  favoriteStickers: { type: mongoose.Schema.Types.Mixed, default: [] },
  whatsappWebSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  whatsappWebSessions: { type: mongoose.Schema.Types.Mixed, default: [] },
  suspiciousActivities: { type: mongoose.Schema.Types.Mixed, default: [] },
  warningLevel: { type: String, default: 'none' },
  warningUntil: { type: Date, default: null },
  blockAlerts: { type: mongoose.Schema.Types.Mixed, default: [] },
  messageModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  privacyModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  securityModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  antiRevokeSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  deletedMessagesCache: { type: mongoose.Schema.Types.Mixed, default: [] },
  automationModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  chatListModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  customizationModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  groupModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  mediaModsSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  locationSharingSettings: { type: mongoose.Schema.Types.Mixed, default: {} },
  liveLocations: { type: mongoose.Schema.Types.Mixed, default: [] },
  lastLocation: { type: mongoose.Schema.Types.Mixed, default: null },
  awayMessage: { type: mongoose.Schema.Types.Mixed, default: null },
  businessProfile: { type: mongoose.Schema.Types.Mixed, default: null },
  otpData: { type: mongoose.Schema.Types.Mixed, default: null },
  lastSyncAt: { type: Date, default: null },
  blockedStatusUsers: { type: mongoose.Schema.Types.Mixed, default: [] },
  mutedStatusUsers: { type: mongoose.Schema.Types.Mixed, default: [] },
  savedStatuses: { type: mongoose.Schema.Types.Mixed, default: [] },
  callLinkSettings: { type: mongoose.Schema.Types.Mixed, default: { links: [] } }
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
  delete user.passkeys;
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
