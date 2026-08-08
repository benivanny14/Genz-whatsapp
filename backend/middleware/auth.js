const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isDeviceAllowed } = require('../utils/deviceSession');
const { clearAuthCookies } = require('../utils/authCookies');
const { JWT_SECRET } = require('../config/secrets');

const DEFAULT_DEVICE_ID = process.env.DEFAULT_DEVICE_ID || 'local-web-device';
const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined') {
      return token;
    }
  }
  return req.cookies?.token || null;
};

const createOrFindDeviceUser = async (deviceId) => {
  let user = await User.findOne({ deviceId });
  if (!user) {
    const userData = {
      deviceId,
      username: `GENZ User ${deviceId.substring(0, 8)}`,
      phoneNumber: deviceId,
      status: 'offline'
    };
    if (deviceId === DEFAULT_DEVICE_ID) {
      userData._id = LOCAL_USER_ID;
    }
    user = await User.create(userData);
  }
  return user;
};

// Routes that should NEVER check phone verification (essential auth routes)
const SKIP_PHONE_VERIFY_PATHS = [
  '/auth/me',
  '/auth/refresh',
  '/auth/logout',
  '/auth/verify-phone-otp',
  '/auth/resend-phone-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/passkey'
];

// Helper to reject with optional cookie clearing
const reject = (res, message, status = 401, shouldClearCookies = true) => {
  if (shouldClearCookies) {
    clearAuthCookies(res);
  }
  return res.status(status).json({ success: false, message });
};

const protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        
        if (decoded.typ === 'refresh') {
          console.error('[Auth] Access route received refresh token');
          return reject(res, 'Invalid token type', 401, true);
        }

        const user = await User.findById(decoded.id);
        if (!user) {
          console.error('[Auth] User not found for token:', decoded.id);
          return reject(res, 'User not authorized', 401, true);
        }

        if (user.isBlocked) {
          return reject(res, 'User not authorized', 401, true);
        }

        // Check password change
        if (user.passwordChangedAt) {
          const changedAt = new Date(user.passwordChangedAt).getTime();
          if (decoded.iat && decoded.iat * 1000 + 30000 < changedAt) {
            console.error('[Auth] Token issued before password change; rejecting');
            return reject(res, 'Session expired. Please log in again.', 401, true);
          }
        }

        // Check device
        const deviceAllowed = await isDeviceAllowed(decoded);
        if (!deviceAllowed) {
          console.error('[Auth] Token rejected: device no longer active', { id: decoded.id, deviceId: decoded.deviceId });
          return reject(res, 'Session has been logged out on this device', 401, true);
        }

        // Phone verification check - SKIP for essential auth routes.
        // Use req.originalUrl (full path incl. mount prefix) since req.path is router-stripped.
        const isAuthRoute = SKIP_PHONE_VERIFY_PATHS.some(path => req.originalUrl.includes(path));
        
        if (!isAuthRoute && !user.phoneVerified) {
          console.warn('[Auth] Phone not verified for protected route:', req.path);
          return res.status(403).json({
            success: false,
            message: 'Phone number not verified. Please verify your phone number to continue.',
            requiresPhoneVerification: true
          });
        }

        req.user = user;
        req.authMode = 'jwt';
        return next();
        
      } catch (jwtError) {
        console.error('[Auth] JWT verification failed:', {
          error: jwtError.message,
          path: req.path
        });

        // Token expired - DO NOT clear cookies (allow refresh to work)
        if (jwtError.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        }

        // Other JWT errors - clear cookies
        return reject(res, 'Invalid or expired token', 401, true);
      }
    }

    console.error('[Auth] No token provided:', { path: req.path });
    return reject(res, 'Authentication required', 401, true);
    
  } catch (error) {
    console.error('[Auth] Middleware error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });
    return reject(res, 'Authentication failed', 401, true);
  }
};

// Separate middleware for routes that REQUIRE phone verification
const requirePhoneVerified = async (req, res, next) => {
  if (!req.user?.phoneVerified) {
    return res.status(403).json({
      success: false,
      message: 'Phone number not verified. Please verify your phone number to continue.',
      requiresPhoneVerification: true
    });
  }
  next();
};

const isAdmin = async (req, res, next) => {
  try {
    const role = req.user?.role;
    const isUserAdmin = Boolean(req.user?.isAdmin || role === 'admin');

    if (!isUserAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.isAdmin = true;
    return next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
};

module.exports = {
  protect,
  isAdmin,
  getBearerToken,
  requirePhoneVerified
};
