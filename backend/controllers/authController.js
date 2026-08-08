const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const User = require('../models/User');
const { mergeWhatsAppSettings } = require('../utils/whatsappSettings');
const { applyPrivacyFilter } = require('../utils/privacyHelper');
const { checkPrivacyPermission } = require('../middleware/privacy');
const { resolvePublicBaseUrl } = require('../utils/publicBaseUrl');
const { getRequestDeviceId, registerDevice, isDeviceAllowed } = require('../utils/deviceSession');
const { JWT_SECRET, JWT_REFRESH_SECRET } = require('../config/secrets');
const { setAuthCookies, clearAuthCookies } = require('../utils/authCookies');
const { deliverOtp } = require('../services/otpDeliveryService');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// Normalize a phone number so it matches regardless of leading +, spaces,
// dashes or parentheses (e.g. "+255 712-345-678" -> "+255712345678").
const normalizePhone = (input) => {
  if (typeof input !== 'string') return '';
  const s = input.trim();
  if (!s) return '';
  const hasPlus = s.startsWith('+');
  const digits = s.replace(/[^\d]/g, '');
  if (!digits) return '';
  return (hasPlus ? '+' : '') + digits;
};

const phoneCandidates = (input) => {
  const candidates = [];
  const normalized = normalizePhone(input);
  if (normalized) candidates.push(normalized);
  const digits = String(input || '').replace(/[^\d]/g, '');
  if (digits) {
    const tz = '+255' + digits.replace(/^0+/, '');
    if (!candidates.includes(tz)) candidates.push(tz);
    const local = digits.replace(/^0+/, '');
    if (!candidates.includes(local)) candidates.push(local);
  }
  return candidates;
};

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

    console.log('[Auth] Registration attempt:', { hasUsername: Boolean(username), hasPhone: Boolean(phoneNumber) });

    if (!username || !password || !phoneNumber) {
      console.warn('[Auth] Registration failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Username, password, and phone number are required'
      });
    }

    if (password.length < 6) {
      console.warn('[Auth] Registration failed: Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Optional: Warn about weak password but allow registration
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
      console.warn('[Auth] Registration: Weak password accepted', { userId: username });
      // Allow registration but could add warning in response
    }

    const existingUser = await User.findOne({
      $or: [
        { username: username.trim() },
        ...(phoneNumber ? [{ phoneNumber: normalizePhone(phoneNumber) }] : [])
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
      phoneNumber: normalizePhone(phoneNumber),
      status: 'offline',
      phoneVerified: false
    });

    await user.setPassword(password);
    await user.save();

    // Generate phone verification OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.phoneVerificationOTP = otp;
    user.phoneVerificationOTPExpiry = expiry;
    await user.save();

    // Deliver the OTP via WhatsApp when enabled (failure is non-fatal — the
    // code is still stored on the user and echoed in dev/test responses).
    await deliverOtp(user.phoneNumber, otp, 'phone-verification');

    const deviceId = getRequestDeviceId(req);
    await registerDevice(req, user._id);

    const token = signToken(user, deviceId);
    const refreshToken = signRefreshToken(user);

    console.log('[Auth] Registration successful:', { userId: user._id, username: user.username });

    setAuthCookies(res, { token, refreshToken });

    res.status(201).json({
      success: true,
      token,
      refreshToken,
      user: safeUser(user),
      phoneVerified: false,
      requiresPhoneVerification: true,
      ...(process.env.NODE_ENV !== 'production' ? { phoneVerificationOTP: otp } : {})
    });
  } catch (error) {
    console.error('[Auth] Registration error:', error.message);
    if (error.code === 11000 || error.name === 'MongoServerError') {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      const label = field === 'phoneNumber' ? 'Phone number' : field === 'username' ? 'Username' : 'This value';
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

    const hasLoginId = Boolean(loginId);
    const loginIdHint = typeof loginId === 'string'
      ? loginId.slice(0, 3) + '***'
      : hasLoginId ? '***' : '';
    console.log('[Auth] Login attempt:', { loginIdHint });

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

    const trimmedId = loginId.trim();
    let user = await User.findOne({
      $or: [
        { phoneNumber: trimmedId },
        { username: trimmedId }
      ]
    });

    // Fallback: retry as a normalized phone number so "+255 712-345-678"
    // and "255712345678" both match the stored value.
    if (!user) {
      const normPhone = normalizePhone(trimmedId);
      if (normPhone && normPhone !== trimmedId) {
        user = await User.findOne({ phoneNumber: normPhone });
      }
    }

    // Generic message to prevent user enumeration
    const INVALID_CREDS_MSG = 'Invalid login credentials';

    if (!user) {
      console.warn('[Auth] Login failed: User not found', { hasLoginId: Boolean(loginId) });
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
        await user.incLoginAttempts();
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

    setAuthCookies(res, { token, refreshToken });

    // Check if phone needs verification
    if (!user.phoneVerified) {
      return res.json({
        success: true,
        token,
        refreshToken,
        user: safeUser(user),
        phoneVerified: false,
        requiresPhoneVerification: true
      });
    }

    res.json({
      success: true,
      token,
      refreshToken,
      user: safeUser(user),
      phoneVerified: true
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

      // Revoke this device's session so its tokens stop working. Device-scoped
      // JWTs are checked by isDeviceAllowed() in the auth middleware, so
      // marking the device inactive invalidates the token even if it is still
      // present in another tab / copy of the browser.
      const deviceId = getRequestDeviceId(req);
      if (deviceId) {
        const Device = require('../models/Device');
        await Device.updateOne(
          { localUserId: String(req.user._id), deviceId },
          { $set: { isActive: false } }
        );
      }
    }

    clearAuthCookies(res);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.changeNumber = async (req, res) => {
  try {
    const { newPhoneNumber, otp, verifyOtp } = req.body;
    if (!newPhoneNumber) {
      return res.status(400).json({ success: false, message: 'New phone number is required' });
    }

    const existingUser = await User.findOne({ phoneNumber: newPhoneNumber });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Phone number already in use' });
    }

    // Step 1 — request OTP on the new number. When no OTP is supplied yet we
    // generate and (in dev/mock) return it so the client can complete verify.
    if (!otp && !verifyOtp) {
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 5 * 60 * 1000);
      req.app?.locals?.changeNumberOtps?.set(newPhoneNumber, {
        otp: generatedOtp, expires: expiry, oldUserId: req.user._id, newPhoneNumber
      });
      if (!req.app?.locals?.changeNumberOtps) {
        req.app.locals.changeNumberOtps = new Map();
        req.app.locals.changeNumberOtps.set(newPhoneNumber, {
          otp: generatedOtp, expires: expiry, oldUserId: req.user._id, newPhoneNumber
        });
      }
      // WhatsApp delivery when enabled (non-fatal on failure).
      await deliverOtp(newPhoneNumber, generatedOtp, 'change-number');
      return res.status(200).json({
        success: true,
        requiresOtp: true,
        message: 'OTP sent to the new number. Verification required.',
        // In tests/dev only — production should send via SMS provider.
        ...(process.env.NODE_ENV !== 'production' ? { otp: generatedOtp } : {})
      });
    }

    // Step 2 — verify the OTP before mutating the stored phone number.
    const stored = req.app?.locals?.changeNumberOtps?.get(newPhoneNumber);
    if (!stored || new Date() > new Date(stored.expires)) {
      return res.status(400).json({ success: false, message: 'OTP expired or not requested' });
    }
    if (String(stored.otp) !== String(verifyOtp || otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    if (String(stored.oldUserId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'OTP was issued for another user' });
    }

    req.app?.locals?.changeNumberOtps?.delete(newPhoneNumber);
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

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password must be different from the current password' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    await user.setPassword(newPassword);
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
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
    const user = await User.findById(req.user._id).populate('blockedUsers', 'username phoneNumber profilePicture about isOnline lastSeen');
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
    const cookieRefresh = req.cookies && req.cookies.refreshToken;
    const presentedToken = bodyRefresh || cookieRefresh;

    if (!presentedToken || typeof presentedToken !== 'string') {
      console.warn('[Auth] Refresh rejected: missing refresh token (body or cookie)');
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(presentedToken, JWT_REFRESH_SECRET, { algorithms: ['HS256'] });
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

    setAuthCookies(res, { token, refreshToken });

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
    const { businessName, businessCategory, businessAddress, businessWebsite, businessDescription, businessHours } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isBusinessAccount = true;
    user.businessProfile = {
      businessName: businessName || '',
      businessCategory: businessCategory || 'other',
      businessAddress: businessAddress || '',
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

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Respect the owner's last_seen privacy setting before exposing their
    // online history to any other user.
    const canView = checkPrivacyPermission(user, req.user._id, 'last_seen');
    if (!canView) {
      return res.status(403).json({ success: false, message: 'Cannot view online history' });
    }

    // Only return last 50 sessions for privacy
    const history = (user?.onlineHistory || []).slice(-50);
    res.json({ success: true, onlineHistory: history, lastSeen: user?.lastSeen, username: user?.username });
  } catch (e) {
    res.json({ success: true, onlineHistory: [] });
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

    setAuthCookies(res, { token, refreshToken });

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

// ── Password reset (forgot password) ─────────────────────────────────
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,}$/;

function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!PASSWORD_STRENGTH_REGEX.test(password)) {
    return 'Password must include uppercase, lowercase, number, and special character';
  }
  return null;
}

exports.forgotPassword = async (req, res) => {
  try {
    const { emailOrPhone } = req.body;
    if (!emailOrPhone || typeof emailOrPhone !== 'string' || !emailOrPhone.trim()) {
      return res.status(400).json({ success: false, message: 'Email or phone number is required' });
    }

    const normalized = normalizePhone(emailOrPhone);
    const user = await User.findOne({
      $or: [{ username: emailOrPhone.toLowerCase() }, { phoneNumber: normalized }]
    });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for that email/phone, an OTP has been sent.',
        ...(process.env.NODE_ENV !== 'production' ? { otp: '000000' } : {})
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.resetOTP = otp;
    user.resetOTPExpiry = expiry;
    await user.save();

    // WhatsApp delivery when enabled (non-fatal on failure — dev/test still
    // echo the code below).
    await deliverOtp(normalized, otp, 'password-reset');

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        success: true,
        message: 'If an account exists for that email/phone, an OTP has been sent.',
        otp // dev/test only
      });
    }

    res.status(200).json({
      success: true,
      message: 'If an account exists for that email/phone, an OTP has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { emailOrPhone, otp, newPassword } = req.body;
    if (!emailOrPhone || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email/phone, OTP, and new password are required' });
    }

    const strengthErr = validatePasswordStrength(newPassword);
    if (strengthErr) {
      return res.status(400).json({ success: false, message: strengthErr });
    }

    if (String(otp).length !== 6 || !/^\d{6}$/.test(String(otp))) {
      return res.status(400).json({ success: false, message: 'Invalid OTP format' });
    }

    const normalized = normalizePhone(emailOrPhone);
    const user = await User.findOne({
      $or: [{ email: emailOrPhone.toLowerCase() }, { phoneNumber: normalized }]
    });

    if (!user || !user.resetOTP || !user.resetOTPExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const now = new Date();
    if (now > user.resetOTPExpiry) {
      user.resetOTP = null;
      user.resetOTPExpiry = null;
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP has expired, please request a new one' });
    }

    if (!crypto.timingSafeEqual(Buffer.from(String(user.resetOTP)), Buffer.from(String(otp)))) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.setPassword(newPassword);
    user.resetOTP = null;
    user.resetOTPExpiry = null;
    user.refreshToken = null;
    user.fcmTokens = [];
    user.passwordChangedAt = new Date();
    await user.save();

    res.status(200).json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp) {
      return res.status(400).json({ success: false, message: 'Phone number and OTP are required' });
    }

    const candidates = phoneCandidates(phoneNumber);
    const user = await User.findOne({ phoneNumber: { $in: candidates } });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (req.user && !candidates.includes(req.user.phoneNumber)) {
      console.warn('[Auth] Phone verification: submitted phone does not match session', { userId: user._id });
      return res.status(403).json({ success: false, message: 'Phone number does not match the current session' });
    }

    if (!user.phoneVerificationOTP || !user.phoneVerificationOTPExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const now = new Date();
    if (now > user.phoneVerificationOTPExpiry) {
      user.phoneVerificationOTP = null;
      user.phoneVerificationOTPExpiry = null;
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP has expired, please request a new one' });
    }

    if (!crypto.timingSafeEqual(Buffer.from(String(user.phoneVerificationOTP)), Buffer.from(String(otp)))) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.phoneVerified = true;
    user.phoneVerificationOTP = null;
    user.phoneVerificationOTPExpiry = null;
    await user.save();

    res.status(200).json({ success: true, message: 'Phone number verified successfully' });
  } catch (error) {
    console.error('Verify phone OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resendPhoneOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const candidates = phoneCandidates(phoneNumber);
    const user = await User.findOne({ phoneNumber: { $in: candidates } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (req.user && !candidates.includes(req.user.phoneNumber)) {
      console.warn('[Auth] OTP resend: submitted phone does not match session', { userId: user._id });
      return res.status(403).json({ success: false, message: 'Phone number does not match the current session' });
    }

    if (user.phoneVerified) {
      return res.status(400).json({ success: false, message: 'Phone number already verified' });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.phoneVerificationOTP = otp;
    user.phoneVerificationOTPExpiry = expiry;
    await user.save();

    // WhatsApp delivery when enabled (non-fatal on failure).
    await deliverOtp(user.phoneNumber, otp, 'phone-verification-resend');

    if (process.env.NODE_ENV !== 'production') {
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        otp // dev/test only
      });
    }

    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Resend phone OTP error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
