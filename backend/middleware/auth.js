const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isDeviceAllowed } = require('../utils/deviceSession');
const { clearAuthCookies } = require('../utils/authCookies');
const { JWT_SECRET } = require('../config/secrets');

const DEFAULT_DEVICE_ID = process.env.DEFAULT_DEVICE_ID || 'local-web-device';
const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';

const getBearerToken = (req) => {
  // Prefer the Authorization header: it carries the in-memory token of the
  // user that THIS browser session is currently acting as. The httpOnly cookie
  // is a stale, browser-wide value — if two accounts are used in the same
  // browser, the last login overwrites the cookie for every tab, so relying on
  // it first would leak user B's data into user A's open tab. The cookie is
  // only a fallback for fresh page loads (after reload the in-memory token is
  // gone and the cookie is the persistent session).
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

// Supports real JWT auth while preserving the app's device-based PWA fallback.
const protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    // Helper to reject while also clearing any stale httpOnly cookies. Without
    // this, an expired cookie stays in the browser and every page load (login,
    // register, chat) keeps getting 401 → clearSessionAndRedirect → reload,
    // which looks exactly like the app "closing and reopening by itself".
    const reject = (message, status = 401) => {
      clearAuthCookies(res);
      return res.status(status).json({ success: false, message });
    };

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.typ === 'refresh') {
          console.error('[Auth] Access route received refresh token');
          return reject('Invalid token type');
        }
        const user = await User.findById(decoded.id);

        if (!user) {
          console.error('[Auth] User not found for token:', decoded.id);
          return reject('User not authorized');
        }

        if (user.isBlocked) {
          return reject('User not authorized');
        }

        // Tokens issued before a password change must be rejected, otherwise a
        // stolen token keeps working after the user resets their password.
        // Small tolerance (30s) absorbs clock-skew / iat second-truncation.
        if (user.passwordChangedAt) {
          const changedAt = new Date(user.passwordChangedAt).getTime();
          if (decoded.iat && decoded.iat * 1000 + 30000 < changedAt) {
            console.error('[Auth] Token issued before password change; rejecting');
            return reject('Session expired. Please log in again.');
          }
        }

        // Device-scoped tokens are invalid once their device is deactivated
        // (logout all devices, unlink, admin revoke).
        const deviceAllowed = await isDeviceAllowed(decoded);
        if (!deviceAllowed) {
          console.error('[Auth] Token rejected: device no longer active', { id: decoded.id, deviceId: decoded.deviceId });
          return reject('Session has been logged out on this device');
        }

        req.user = user;
        req.authMode = 'jwt';
        return next();
      } catch (jwtError) {
        console.error('[Auth] JWT verification failed:', {
          error: jwtError.message,
          path: req.path
        });
        return reject('Invalid or expired token');
      }
    }

    console.error('[Auth] No token provided:', { path: req.path });
    return reject('Authentication required');
  } catch (error) {
    console.error('[Auth] Middleware error:', {
      error: error.message,
      stack: error.stack,
      path: req.path,
      method: req.method
    });
    return reject('Authentication failed');
  }
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
  getBearerToken
};
