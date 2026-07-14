const crypto = require('crypto');
const { promisify } = require('util');
const mongoose = require('mongoose');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SCRYPT_N = 16384;

/**
 * AdminOwner
 * -----------
 * This collection is INTENTIONALLY separate from the `User` collection.
 * It is designed to hold exactly ONE document: the system owner's credentials.
 *
 * There is NO public HTTP endpoint that can create or modify this document.
 * The only way to create/reset it is via the CLI script:
 *   backend/scripts/bootstrapAdminOwner.js
 * which must be run directly on the server (SSH / hosting console access only).
 *
 * This guarantees that regular users and remote attackers have no code path
 * that leads to admin-account creation, even if the web app has a bug.
 */
const adminOwnerSchema = new mongoose.Schema({
  ownerKey: {
    type: String,
    default: 'PRIMARY_OWNER',
    unique: true // enforces the singleton at the DB level
  },
  username: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true },

  totpSecret: { type: String, required: true }, // base32 secret for speakeasy
  totpEnabled: { type: Boolean, default: true },

  // Optional hard IP allowlist (in addition to ADMIN_IP_ALLOWLIST env var)
  allowedIps: [{ type: String }],

  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },

  refreshTokenHash: { type: String, default: null },
  refreshTokenExpiresAt: { type: Date, default: null },

  lastLoginAt: { type: Date, default: null },
  lastLoginIp: { type: String, default: null },
  lastLoginUserAgent: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

adminOwnerSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

adminOwnerSchema.methods.setPassword = async function (password) {
  if (!password || password.length < 12) {
    throw new Error('Admin password must be at least 12 characters long');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, { N: SCRYPT_N });
  this.passwordHash = `${salt}:${derivedKey.toString('hex')}:${SCRYPT_N}`;
};

adminOwnerSchema.methods.comparePassword = async function (password) {
  if (!password || !this.passwordHash || !this.passwordHash.includes(':')) return false;
  const [salt, storedHash, nStr] = this.passwordHash.split(':');
  const N = parseInt(nStr, 10) || SCRYPT_N;
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, { N });
  const storedBuffer = Buffer.from(storedHash, 'hex');
  if (storedBuffer.length !== derivedKey.length) return false;
  return crypto.timingSafeEqual(storedBuffer, derivedKey);
};

adminOwnerSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

adminOwnerSchema.methods.registerFailedAttempt = async function () {
  this.failedLoginAttempts += 1;
  // Progressive lockout: 5 fails -> 15 min, 10 fails -> 1 hour
  if (this.failedLoginAttempts >= 10) {
    this.lockUntil = new Date(Date.now() + 60 * 60 * 1000);
  } else if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  await this.save();
};

adminOwnerSchema.methods.registerSuccessfulLogin = async function (req) {
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  this.lastLoginAt = new Date();
  this.lastLoginIp = req?.ip || null;
  this.lastLoginUserAgent = req?.headers?.['user-agent'] || null;
  await this.save();
};

adminOwnerSchema.methods.setRefreshToken = async function (rawToken, ttlMs) {
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.refreshTokenHash = hash;
  this.refreshTokenExpiresAt = new Date(Date.now() + ttlMs);
  await this.save();
};

adminOwnerSchema.methods.verifyRefreshToken = function (rawToken) {
  if (!this.refreshTokenHash || !this.refreshTokenExpiresAt) return false;
  if (this.refreshTokenExpiresAt < new Date()) return false;
  const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const a = Buffer.from(hash);
  const b = Buffer.from(this.refreshTokenHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

adminOwnerSchema.methods.clearRefreshToken = async function () {
  this.refreshTokenHash = null;
  this.refreshTokenExpiresAt = null;
  await this.save();
};

module.exports = mongoose.model('AdminOwner', adminOwnerSchema);
