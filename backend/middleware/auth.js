const jwt = require('jsonwebtoken');
const User = require('../models/User');

// CRITICAL: JWT secret must be set in environment variables
// System will fail to start if not configured in production
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production');
  }
  console.warn('[SECURITY] JWT_SECRET not set, using development-only default. DO NOT USE IN PRODUCTION!');
}

const JWT_SECRET = process.env.JWT_SECRET || 'genz-development-secret-change-me';

if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'genz-development-secret-change-me') {
  throw new Error('FATAL: Default JWT secret detected in production. Set JWT_SECRET environment variable.');
}

const DEFAULT_DEVICE_ID = process.env.DEFAULT_DEVICE_ID || 'local-web-device';
const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';

const getBearerToken = (req) => {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return null;
  }

  const token = header.slice(7).trim();
  if (!token || token === 'null' || token === 'undefined') {
    return null;
  }

  return token;
};

const createOrFindDeviceUser = async (deviceId) => {
  let user = await User.findOne({ deviceId });

  if (!user) {
    const safeDeviceId = String(deviceId).toLowerCase().replace(/[^a-z0-9._-]/g, '-');
    const userData = {
      deviceId,
      username: `GENZ User ${deviceId.substring(0, 8)}`,
      phoneNumber: deviceId,
      email: `${safeDeviceId}@device.genz.local`,
      status: 'offline'
    };

    if (deviceId === DEFAULT_DEVICE_ID) {
      userData._id = LOCAL_USER_ID;
    }

    user = await User.create(userData);
  }

  return user;
};

// Supports real JWT auth while preserving the app's device-based PWA fallback.
const protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.typ === 'refresh') {
          console.error('[Auth] Access route received refresh token');
          return res.status(401).json({ success: false, message: 'Invalid token type' });
        }
        const user = await User.findById(decoded.id);

        if (!user) {
          console.error('[Auth] User not found for token:', decoded.id);
          return res.status(401).json({ success: false, message: 'User not authorized' });
        }

        if (user.isBlocked) {
          return res.status(401).json({ success: false, message: 'User not authorized' });
        }

        req.user = user;
        req.authMode = 'jwt';
        return next();
      } catch (jwtError) {
        console.error('[Auth] JWT verification failed:', {
          error: jwtError.message,
          token: token.substring(0, 20) + '...',
          path: req.path
        });
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
    }

    console.error('[Auth] No token provided:', { path: req.path });
    return res.status(401).json({ success: false, message: 'Authentication required' });
  } catch (error) {
    console.error('[Auth] Middleware error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const role = req.user?.role;
    const allowDeviceAdmin =
      process.env.ALLOW_DEVICE_ADMIN === 'true' &&
      req.authMode === 'device' &&
      process.env.NODE_ENV !== 'production';
    const isUserAdmin = Boolean(req.user?.isAdmin || role === 'admin' || allowDeviceAdmin);

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
  getBearerToken
};
