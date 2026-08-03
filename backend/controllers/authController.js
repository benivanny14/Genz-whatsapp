const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const User = require('../models/User');
const { mergeWhatsAppSettings } = require('../utils/whatsappSettings');
const { applyPrivacyFilter } = require('../utils/privacyHelper');
const { resolvePublicBaseUrl } = require('../utils/publicBaseUrl');
const { getRequestDeviceId, registerDevice, isDeviceAllowed } = require('../utils/deviceSession');

// CRITICAL: JWT secrets must be set in environment variables
// System will fail to start if not configured in production
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
  console.warn('[SECURITY] JWT_SECRET not set, using development-only default. DO NOT USE IN PRODUCTION!');
}

const JWT_SECRET = process.env.JWT_SECRET || 'genz-development-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'genz-development-secret-change-me') {
  throw new Error('FATAL: Default JWT secret detected in production. Set JWT_SECRET environment variable.');
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const signToken = (user, deviceId) => {
  const payload = {
    id: user._id.toString(),
    role: user.role || (user.isAdmin ? 'admin' : 'user'),
    typ: 'access'
  };
  if (deviceId) {
    payload.deviceId = String(deviceId);
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const signRefreshToken = (user) => jwt.sign(
  {
    id: user._id.toString(),
    typ: 'refresh'
  },
  JWT_REFRESH_SECRET,
  { expiresIn: JWT_REFRESH_EXPIRES_IN }
);



const safeUser = (user) => (typeof user.toSafeJSON === 'function' ? user.toSafeJSON() : user);

exports.register = async (req, res) => {
  try {
    const { username, phoneNumber, password } = req.body;

    console.log('[Auth] Registration attempt:', { username, phoneNumber });

    if (!username || !password || !phoneNumber) {
      console.warn('[Auth] Registration failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Username, password, and phone number are required'
      });
    }

    if (password.length < 8) {
      console.warn('[Auth] Registration failed: Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }

    // Enforce strong password policy
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
      return res.status(400).json({
        success: false,
        message: 'Password must include uppercase, lowercase, number, and special character'
      });
    }

    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() },
        ...(phoneNumber ? [{ phoneNumber: phoneNumber.trim() }] : [])
      ]
    });

    if (existingUser) {
      console.warn('[Auth] Registration failed: User already exists', {
        username: existingUser.username
      });
      return res.status(409).json({
        success: false,
        message: 'User with this username or phone number already exists'
      });
    }

    const user = new User({
      username: username.trim(),
      phoneNumber: phoneNumber.trim(),
      status: 'offline'
    });

    await user.setPassword(password);
    await user.save();

    const deviceId = getRequestDeviceId(req);
    await registerDevice(req, user._id);

    const token = signToken(user, deviceId);
    const refreshToken = signRefreshToken(user);

    console.log('[Auth] Registration successful:', { userId: user._id, username: user.username });

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: safeUser(user)
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error.message);
    if (error.code === 11000 || error.name === 'MongoServerError') {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      const label = field === 'phoneNumber' ? 'Phone number' : field === 'email' ? 'Email' : field === 'username' ? 'Username' : 'This value';
      return res.status(409).json({ success: false, message: `${label} is already registered. Please login instead.` });
    }
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message).join(', ');
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, phoneNumber, username, password, twoFactorToken } = req.body;
    const loginId = identifier || phoneNumber || username;

    console.log('[Auth] Login attempt:', { loginId });

    if (!loginId || !password) {
      console.warn('[Auth] Login failed: Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Login identifier and password are required'
      });
    }

    // Sanitize: reject objects (NoSQL injection vectors like {$gt: ""})
    if (typeof loginId !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid input format'
      });
    }

    const user = await User.findOne({
      $or: [
        { phoneNumber: loginId.trim() },
        { username: loginId.trim() }
      ]
    });

    // Generic message to prevent user enumeration
    const INVALID_CREDS_MSG = 'Invalid login credentials';

    if (!user) {
      console.warn('[Auth] Login failed: User not found', { loginId });
      return res.status(401).json({ success: false, message: INVALID_CREDS_MSG });
    }

    // Check account lockout
    if (user.isAccountLocked) {
      const lockMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      console.warn('[Auth] Login blocked: Account locked', { userId: user._id, lockMinutes });
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked due to too many failed attempts. Try again in ${lockMinutes} minute(s).`
      });
    }

    if (user.isBlocked) {
      console.warn('[Auth] Login failed: Account blocked', { userId: user._id });
      return res.status(403).json({
        success: false,
        message: 'This account is blocked'
      });
    }

    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      // Increment failed login attempts
      await user.incLoginAttempts();
      const remaining = Math.max(0, 5 - (user.failedLoginAttempts + 1));
      console.warn('[Auth] Login failed: Invalid password', { userId: user._id, failedAttempts: user.failedLoginAttempts + 1 });
      return res.status(401).json({
        success: false,
        message: INVALID_CREDS_MSG,
        ...(remaining <= 2 && remaining > 0 ? { warning: `${remaining} attempt(s) remaining before account lock` } : {})
      });
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorToken) {
        console.log('[Auth] Login requires 2FA:', { userId: user._id });
        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          userId: user._id
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: twoFactorToken,
        window: 1
      });

      if (!verified) {
        console.warn('[Auth] Login failed: Invalid 2FA token', { userId: user._id });
        return res.status(401).json({
          success: false,
          message: 'Invalid two-factor authentication token'
        });
      }
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    user.lastSeen = new Date();
    await user.save();

    const deviceId = getRequestDeviceId(req);
    await registerDevice(req, user._id);

    const token = signToken(user, deviceId);
    const refreshToken = signRefreshToken(user);

    console.log('[Auth] Login successful:', { userId: user._id, username: user.username });

    res.json({
      success: true,
      token,
      refreshToken,
      user: safeUser(user)
    });
  } catch (error) {
    console.error('[Auth] Login error:', {
      error: error.message,
      stack: error.stack
    });
    // Don't leak internal error details to client
    res.status(500).json({ success: false, message: 'An internal error occurred' });
  }
};

exports.getMe = async (req, res) => {
  res.json({
    success: true,
    user: safeUser(req.user)
  });
};

exports.updateProfile = async (req, res) => {
  try {
    const allowedFields = ['username', 'about', 'bio', 'profilePicture', 'phoneNumber'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    });

    if (Object.prototype.hasOwnProperty.call(updates, 'bio') && !Object.prototype.hasOwnProperty.call(updates, 'about')) {
      updates.about = updates.bio;
    }
    if (Object.prototype.hasOwnProperty.call(updates, 'about') && !Object.prototype.hasOwnProperty.call(updates, 'bio')) {
      updates.bio = updates.about;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );
    const safe = safeUser(user);

    const io = req.app.get('io');
    if (io) {
      io.emit('profile:updated', { user: safe });
    }

    res.json({
      success: true,
      user: safe
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file provided' });
    }
    
    const uploadPath = req.file.path || '';
    const profilePictureUrl = /^https?:\/\//i.test(uploadPath)
      ? uploadPath
      : req.file.filename
        ? `${resolvePublicBaseUrl(req)}/uploads/${req.file.filename}`
        : uploadPath;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePicture: profilePictureUrl } },
      { new: true }
    );
    const safe = safeUser(user);
    const io = req.app.get('io');
    if (io) {
      io.emit('profile:updated', { user: safe });
    }
    
    res.json({ success: true, user: safe });
  } catch (error) {
    console.error('Upload profile picture error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = mergeWhatsAppSettings(req.user?.settings || {});

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const incoming = req.body?.settings || req.body || {};
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.settings = mergeWhatsAppSettings(user.settings || {}, incoming);

    if (incoming?.account?.email !== undefined) {
      const normalizedEmail = String(incoming.account.email || '').trim().toLowerCase();
      user.email = normalizedEmail;
      user.settings.account.email = normalizedEmail;
      if (!user.email) {
        user.emailVerified = false;
      }
    }

    if (incoming?.account?.requestAccountInfoAt !== undefined && !user.settings.account.requestAccountInfoAt) {
      user.settings.account.requestAccountInfoAt = new Date().toISOString();
    }

    user.markModified('settings');
    await user.save();

    res.json({
      success: true,
      settings: user.settings,
      user: safeUser(user)
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline: false,
        status: 'offline',
        lastSeen: new Date()
      });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changeNumber = async (req, res) => {
  try {
    const { newPhoneNumber } = req.body;
    if (!newPhoneNumber) {
      return res.status(400).json({ success: false, message: 'New phone number is required' });
    }

    const existingUser = await User.findOne({ phoneNumber: newPhoneNumber });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Phone number already in use' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.phoneNumber = newPhoneNumber;
    await user.save();

    res.status(200).json({ success: true, message: 'Phone number changed successfully', user });
  } catch (error) {
    console.error('Change number error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Mark messages as deleted for this user
    const Message = require('../models/Message');
    await Message.updateMany(
      { sender: userId },
      { deletedForEveryone: true } // Or anonymize
    );

    // Remove user from groups
    const Conversation = require('../models/Conversation');
    await Conversation.updateMany(
      { participants: userId },
      { $pull: { participants: userId, admins: userId } }
    );

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('blockedUsers', 'username phoneNumber email profilePicture about isOnline lastSeen settings contacts');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const filteredBlocked = await Promise.all((user.blockedUsers || []).map(blockedUser => applyPrivacyFilter(blockedUser, req.user._id)));
    res.json({ success: true, blockedUsers: filteredBlocked });
  } catch (error) {
    console.error('Get blocked users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken: bodyRefresh } = req.body;

    if (!bodyRefresh || typeof bodyRefresh !== 'string') {
      console.warn('[Auth] Refresh rejected: missing refreshToken body');
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(bodyRefresh, JWT_REFRESH_SECRET);
    } catch (e) {
      console.error('[Auth] Refresh JWT invalid or expired:', { message: e.message });
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    if (decoded.typ !== 'refresh' || !decoded.id) {
      console.error('[Auth] Refresh rejected: wrong token type', { typ: decoded.typ });
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.isBlocked) {
      console.warn('[Auth] Refresh rejected: user missing or blocked', { id: decoded.id });
      return res.status(401).json({
        success: false,
        message: 'User not authorized'
      });
    }

    const deviceId = getRequestDeviceId(req);
    if (deviceId) {
      const allowed = await isDeviceAllowed({ id: decoded.id, deviceId });
      if (!allowed) {
        console.warn('[Auth] Refresh rejected: device no longer active', { id: decoded.id, deviceId });
        return res.status(401).json({
          success: false,
          message: 'Session has been logged out on this device'
        });
      }
    }
    await registerDevice(req, user._id);

    const token = signToken(user, deviceId);
    const refreshToken = signRefreshToken(user);

    console.log('[Auth] Token refreshed for user:', user._id);

    res.json({
      success: true,
      token,
      refreshToken,
      user: safeUser(user)
    });
  } catch (error) {
    console.error('[Auth] Refresh token handler error:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Business Profile Functions ──

// @desc    Update business profile
// @route   PUT /api/auth/business-profile
// @access  Private
exports.updateBusinessProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { businessName, businessCategory, businessAddress, businessEmail, businessWebsite, businessDescription, businessHours } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isBusinessAccount = true;
    user.businessProfile = {
      businessName: businessName || '',
      businessCategory: businessCategory || 'other',
      businessAddress: businessAddress || '',
      businessEmail: businessEmail || '',
      businessWebsite: businessWebsite || '',
      businessDescription: businessDescription || '',
      businessHours: businessHours || ''
    };

    await user.save();

    res.json({ success: true, user: safeUser(user) });
  } catch (error) {
    console.error('Update business profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add catalog item
// @route   POST /api/auth/catalog
// @access  Private
exports.addCatalogItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, description, price, currency, imageUrl, inStock } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const productId = Date.now().toString();
    user.catalog.push({
      productId,
      name,
      description,
      price,
      currency: currency || 'USD',
      imageUrl,
      inStock: inStock !== undefined ? inStock : true
    });

    await user.save();

    res.json({ success: true, catalog: user.catalog });
  } catch (error) {
    console.error('Add catalog item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove catalog item
// @route   DELETE /api/auth/catalog/:productId
// @access  Private
exports.removeCatalogItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.catalog = user.catalog.filter(item => item.productId !== productId);
    await user.save();

    res.json({ success: true, catalog: user.catalog });
  } catch (error) {
    console.error('Remove catalog item error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add quick reply
// @route   POST /api/auth/quick-replies
// @access  Private
exports.addQuickReply = async (req, res) => {
  try {
    const userId = req.user._id;
    const { message, shortcut } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const id = Date.now().toString();
    user.quickReplies.push({ id, message, shortcut });
    await user.save();

    res.json({ success: true, quickReplies: user.quickReplies });
  } catch (error) {
    console.error('Add quick reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove quick reply
// @route   DELETE /api/auth/quick-replies/:id
// @access  Private
exports.removeQuickReply = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.quickReplies = user.quickReplies.filter(reply => reply.id !== id);
    await user.save();

    res.json({ success: true, quickReplies: user.quickReplies });
  } catch (error) {
    console.error('Remove quick reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update away message
// @route   PUT /api/auth/away-message
// @access  Private
exports.updateAwayMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { enabled, message } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.awayMessage = {
      enabled: enabled !== undefined ? enabled : false,
      message: message || ''
    };

    await user.save();

    res.json({ success: true, awayMessage: user.awayMessage });
  } catch (error) {
    console.error('Update away message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get business analytics
// @route   GET /api/auth/business-analytics
// @access  Private
exports.getBusinessAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const Message = require('../models/Message');
    const Conversation = require('../models/Conversation');

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get basic analytics
    const totalMessages = await Message.countDocuments({ sender: userId });
    const totalConversations = await Conversation.countDocuments({ participants: userId });
    
    // Get catalog stats
    const catalogSize = user.catalog.length;
    const inStockItems = user.catalog.filter(item => item.inStock).length;

    res.json({
      success: true,
      analytics: {
        totalMessages,
        totalConversations,
        catalogSize,
        inStockItems,
        outOfStockItems: catalogSize - inStockItems,
        quickRepliesCount: user.quickReplies.length,
        isBusinessAccount: user.isBusinessAccount
      }
    });
  } catch (error) {
    console.error('Get business analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check if phone/username is available (called before OTP to prevent wasted SMS)
// @route   POST /api/auth/check-availability
// @access  Public
exports.checkAvailability = async (req, res) => {
  try {
    const { phoneNumber, username } = req.body;
    const checks = [];

    if (phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber: phoneNumber.trim() });
      if (phoneExists) {
        return res.status(409).json({
          success: false,
          available: false,
          message: 'Phone number is already registered. Please login instead.'
        });
      }
      checks.push('phone');
    }

    if (username) {
      const usernameExists = await User.findOne({ username: username.trim() });
      if (usernameExists) {
        return res.status(409).json({
          success: false,
          available: false,
          message: 'Username is already taken. Please choose a different one.'
        });
      }
      checks.push('username');
    }

    res.json({ success: true, available: true, checked: checks });
  } catch (error) {
    // Non-critical — client will handle at registration stage
    res.json({ success: true, available: true });
  }
};

// @desc    Get own online history
// @route   GET /api/users/me/online-history
// @access  Private
exports.getMyOnlineHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('onlineHistory lastSeen');
    res.json({ success: true, onlineHistory: user?.onlineHistory || [], lastSeen: user?.lastSeen });
  } catch (e) {
    res.json({ success: true, onlineHistory: [] });
  }
};

// @desc    Get target user online history (for TM ghost mode tracker)
// @route   GET /api/users/:id/online-history
// @access  Private
exports.getUserOnlineHistory = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('onlineHistory lastSeen username');
    // Only return last 50 sessions for privacy
    const history = (user?.onlineHistory || []).slice(-50);
    res.json({ success: true, onlineHistory: history, lastSeen: user?.lastSeen, username: user?.username });
  } catch (e) {
    res.json({ success: true, onlineHistory: [] });
  }
};

// ── OTP Verification Functions ──

// @desc    Send OTP for registration/login
// @route   POST /api/auth/send-otp
// @access  Public
exports.sendOTP = async (req, res) => {
  try {
    const { phoneNumber, email, type } = req.body; // type: 'register' or 'login'
    
    if (!phoneNumber && !email) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required' });
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Find or create user
    let user;
    if (type === 'register') {
      user = await User.findOne({
        $or: [
          { phoneNumber: phoneNumber?.trim() },
          { email: email?.trim()?.toLowerCase() }
        ]
      });

      if (user) {
        return res.status(400).json({ success: false, message: 'User already exists. Please login instead.' });
      }
    } else {
      user = await User.findOne({
        $or: [
          { phoneNumber: phoneNumber?.trim() },
          { email: email?.trim()?.toLowerCase() }
        ]
      });

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
    }

    // Store OTP in user document (in production, use Redis or separate OTP collection)
    const otpData = {
      code: otp,
      expiresAt,
      phoneNumber: phoneNumber || null,
      email: email || null,
      type,
      attempts: 0
    };

    if (user) {
      user.otpData = otpData;
      await user.save();
    } else {
      // For registration, we'll store in session or temp storage
      // For now, we'll just return the OTP (in production, send via SMS/email)
    }

    // In production, send OTP via SMS/email service
    // For demo purposes, we'll log it
    console.log('[OTP] Generated OTP:', { otp, phoneNumber, email, type });

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // In production, don't return the actual OTP
      ...(process.env.NODE_ENV !== 'production' && { otp })
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, email, otp, type } = req.body;

    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }

    if (!phoneNumber && !email) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required' });
    }

    const user = await User.findOne({
      $or: [
        { phoneNumber: phoneNumber?.trim() },
        { email: email?.trim()?.toLowerCase() }
      ]
    });

    if (!user && type === 'login') {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check OTP
    if (user && user.otpData) {
      if (user.otpData.attempts >= 3) {
        return res.status(400).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
      }

      if (new Date() > user.otpData.expiresAt) {
        return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      }

      if (user.otpData.code !== otp) {
        user.otpData.attempts = (user.otpData.attempts || 0) + 1;
        await user.save();
        return res.status(400).json({ success: false, message: 'Invalid OTP' });
      }

      // Clear OTP after successful verification
      user.otpData = null;
      await user.save();

      // Generate token
      const token = signToken(user);
      const refreshToken = signRefreshToken(user);

      res.json({
        success: true,
        message: 'OTP verified successfully',
        token,
        refreshToken,
        user: safeUser(user)
      });
    } else if (type === 'register') {
      // For registration without existing user, return success
      res.json({
        success: true,
        message: 'OTP verified successfully. Please complete registration.',
        verified: true
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOTP = async (req, res) => {
  try {
    const { phoneNumber, email, type } = req.body;

    if (!phoneNumber && !email) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required' });
    }

    // Generate new OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await User.findOne({
      $or: [
        { phoneNumber: phoneNumber?.trim() },
        { email: email?.trim()?.toLowerCase() }
      ]
    });

    if (user) {
      user.otpData = {
        code: otp,
        expiresAt,
        phoneNumber: phoneNumber || null,
        email: email || null,
        type,
        attempts: 0
      };
      await user.save();
    }

    console.log('[OTP] Resent OTP:', { otp, phoneNumber, email, type });

    res.json({
      success: true,
      message: 'OTP resent successfully',
      ...(process.env.NODE_ENV !== 'production' && { otp })
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Passkey (WebAuthn / FIDO2) Functions ──

// @desc    Check if passkey authentication is available for a user
// @route   POST /api/auth/passkey/check
// @access  Public
exports.checkPasskeyAvailable = async (req, res) => {
  try {
    const { phoneNumber, username } = req.body;
    const identifier = phoneNumber || username;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Phone number or username is required' });
    }

    const user = await User.findOne({
      $or: [
        { phoneNumber: identifier.trim() },
        { username: identifier.trim() }
      ]
    }).select('passkeys username phoneNumber');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      hasPasskeys: !!(user.passkeys && user.passkeys.length > 0),
      passkeyCount: user.passkeys ? user.passkeys.length : 0,
      user: {
        username: user.username,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Check passkey error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate WebAuthn registration options (for creating a new passkey)
// @route   POST /api/auth/passkey/register/options
// @access  Private
exports.passkeyRegisterOptions = async (req, res) => {
  try {
    const { deviceName } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { generateRegistrationOptions } = require('@simplewebauthn/server');
    const { resolvePublicBaseUrl } = require('../utils/publicBaseUrl');

    const rpName = 'Genz Messages';
    const rpID = process.env.RP_ID || '';
    const origin = resolvePublicBaseUrl(req);

    const userId = user._id.toString();
    const excludeCredentials = user.passkeys.map(pk => ({
      id: pk.credentialId,
      type: 'public-key',
      transports: ['internal', 'hybrid']
    }));

    const options = generateRegistrationOptions({
      rp: { name: rpName, id: rpID },
      user: {
        id: userId,
        name: user.username,
        displayName: user.username
      },
      challenge: 'challenge-' + crypto.randomBytes(32).toString('base64'),
      excludeCredentials,
      timeout: 60000,
      attestationType: 'none',
      supportedAlgorithmIDs: [-7, -257, -37]
    });

    // Store challenge in session for verification
    const sessionKey = `passkey:register:${user._id}`;
    req.app.set(sessionKey, options.challenge);
    setTimeout(() => req.app.set(sessionKey, null), 5 * 60 * 1000);

    res.json({
      success: true,
      options,
      rpID,
      origin
    });
  } catch (error) {
    console.error('Passkey register options error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify and save a new passkey
// @route   POST /api/auth/passkey/register/verify
// @access  Private
exports.passkeyRegisterVerify = async (req, res) => {
  try {
    const { response, deviceName } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { verifyRegistrationResponse } = require('@simplewebauthn/server');
    const { resolvePublicBaseUrl } = require('../utils/publicBaseUrl');

    const sessionKey = `passkey:register:${user._id}`;
    const expectedChallenge = req.app.get(sessionKey);

    if (!expectedChallenge) {
      return res.status(400).json({ success: false, message: 'Registration challenge expired or missing' });
    }

    const origin = resolvePublicBaseUrl(req);

    const verification = await verifyRegistrationResponse({
      credential: response,
      expectedChallenge,
      origin,
      rpID: process.env.RP_ID || ''
    });

    if (!verification.verified) {
      return res.status(400).json({ success: false, message: 'Passkey verification failed' });
    }

    const { credentialPublicKey, credentialID, counter } = verification.registrationInfo;

    user.passkeys.push({
      credentialId: credentialID.toString('base64'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64'),
      counter: counter || 0,
      deviceName: deviceName || 'Unknown device',
      createdAt: new Date()
    });

    await user.save();

    req.app.set(sessionKey, null);

    res.json({ success: true, message: 'Passkey registered successfully' });
  } catch (error) {
    console.error('Passkey register verify error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate WebAuthn login options (for authenticating with a passkey)
// @route   POST /api/auth/passkey/login/options
// @access  Public
exports.passkeyLoginOptions = async (req, res) => {
  try {
    const { phoneNumber, username, deviceName } = req.body;
    const identifier = phoneNumber || username;

    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Phone number or username is required' });
    }

    const user = await User.findOne({
      $or: [
        { phoneNumber: identifier.trim() },
        { username: identifier.trim() }
      ]
    }).select('passkeys username phoneNumber');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.passkeys || user.passkeys.length === 0) {
      return res.status(400).json({ success: false, message: 'No passkeys registered for this user' });
    }

    const { generateAuthenticationOptions } = require('@simplewebauthn/server');

    const rpID = process.env.RP_ID || '';

    const options = generateAuthenticationOptions({
      rpID,
      allowCredentals: user.passkeys.map(pk => ({
        id: pk.credentialId,
        type: 'public-key',
        transports: ['internal', 'hybrid']
      })),
      userVerification: 'preferred',
      timeout: 60000
    });

    const sessionKey = `passkey:login:${user._id}`;
    req.app.set(sessionKey, { challenge: options.challenge, userId: user._id });
    setTimeout(() => req.app.set(sessionKey, null), 5 * 60 * 1000);

    res.json({
      success: true,
      options,
      rpID,
      user: {
        username: user.username,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Passkey login options error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify passkey authentication and issue token
// @route   POST /api/auth/passkey/login/verify
// @access  Public
exports.passkeyLoginVerify = async (req, res) => {
  try {
    const { response, deviceName } = req.body;
    const userId = req.app.get('passkeyLoginUserId');

    // We need to find the session - this is a simplified approach
    // In production, use proper session management
    const sessionKey = `passkey:login:${req.body.userId}`;
    let session = req.app.get(sessionKey);

    if (!session) {
      // Try to get session from app settings
      const keys = Object.keys(req.app.settings || {}).filter(k => k.startsWith('passkey:login:'));
      for (const key of keys) {
        const s = req.app.get(key);
        if (s && s.userId) {
          session = s;
          break;
        }
      }
    }

    if (!session) {
      return res.status(400).json({ success: false, message: 'Login challenge expired or missing' });
    }

    const { verifyAuthenticationResponse } = require('@simplewebauthn/server');

    const user = await User.findById(session.userId).select('passkeys username phoneNumber isBlocked');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ success: false, message: 'This account is blocked' });
    }

    const { resolvePublicBaseUrl } = require('../utils/publicBaseUrl');
    const origin = resolvePublicBaseUrl(req);

    const credential = user.passkeys.find(pk => pk.credentialId === response.id);
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Passkey not found' });
    }

    const verification = await verifyAuthenticationResponse({
      credential: response,
      expectedChallenge: session.challenge,
      origin,
      rpID: process.env.RP_ID || '',
      authenticator: {
        credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
        counter: credential.counter,
        credentialDeviceType: credential.deviceType || 'singleDevice',
        credentialBackedUp: false,
        transports: ['internal', 'hybrid']
      }
    });

    if (!verification.verified && verification.authenticationInfo?.result !== 'authStatus:passed') {
      return res.status(400).json({ success: false, message: 'Passkey authentication failed' });
    }

    // Update counter
    credential.counter = verification.authenticationInfo.newCounter;

    // Store the device name if updated
    if (deviceName) {
      credential.deviceName = deviceName;
    }

    await user.save();

    // Issue JWT tokens
    const deviceId = crypto.randomUUID();
    const token = signToken(user, deviceId);
    const refreshToken = signRefreshToken(user);

    user.lastSeen = new Date();
    user.isOnline = true;
    await user.save();

    // Clean up session
    req.app.set(sessionKey, null);

    console.log('[Auth] Passkey login successful:', { userId: user._id, username: user.username });

    res.json({
      success: true,
      token,
      refreshToken,
      user: safeUser(user)
    });
  } catch (error) {
    console.error('Passkey login verify error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user's passkeys
// @route   GET /api/auth/passkey/list
// @access  Private
exports.getPasskeys = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('passkeys');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      passkeys: user.passkeys || []
    });
  } catch (error) {
    console.error('Get passkeys error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a passkey
// @route   DELETE /api/auth/passkey/:id
// @access  Private
exports.deletePasskey = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const initialLength = user.passkeys.length;
    user.passkeys = user.passkeys.filter(pk => pk._id.toString() !== id);

    if (user.passkeys.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Passkey not found' });
    }

    await user.save();

    res.json({ success: true, message: 'Passkey deleted successfully' });
  } catch (error) {
    console.error('Delete passkey error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
