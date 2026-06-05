const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const { mergeWhatsAppSettings } = require('../utils/whatsappSettings');
const { applyPrivacyFilter } = require('../utils/privacyHelper');

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

const signToken = (user) => jwt.sign(
  {
    id: user._id.toString(),
    role: user.role || (user.isAdmin ? 'admin' : 'user'),
    typ: 'access'
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);

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

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);

    console.log('[Auth] Registration successful:', { userId: user._id, username: user.username });

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: safeUser(user)
    });
  } catch (error) {
    console.error('[Auth] Registration error:', {
      error: error.message,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'An internal error occurred', error: error.message, stack: error.stack });
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

    const token = signToken(user);
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

    res.json({
      success: true,
      user: safeUser(user)
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
    
    // uploadImage middleware usually sets req.file.path to Cloudinary URL or local path
    const profilePictureUrl = req.file.path || `/api/media/upload/file/${req.file.filename}`;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { profilePicture: profilePictureUrl } },
      { new: true }
    );
    
    res.json({ success: true, user: safeUser(user) });
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
      user.email = String(incoming.account.email || '').trim().toLowerCase();
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
    const filteredBlocked = (user.blockedUsers || []).map(blockedUser => applyPrivacyFilter(blockedUser, req.user._id));
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

    const token = signToken(user);
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
