const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/secrets');
const {
  normalizeRelativePath,
  verifyMediaSignature,
  isMediaSignatureRequired
} = require('../utils/mediaAccess');

const getBearerToken = (req) => {
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token || token === 'null' || token === 'undefined') return null;
  return token;
};

const verifyJwtAccess = async (req) => {
  const token = getBearerToken(req);
  if (!token) return false;

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.typ === 'refresh') return false;
    const user = await User.findById(decoded.id).select('_id isBlocked');
    if (!user || user.isBlocked) return false;
    req.mediaAccessUser = user;
    return true;
  } catch {
    return false;
  }
};

/**
 * Protects /uploads static files with HMAC signed query params (or JWT in production).
 */
const secureUploads = async (req, res, next) => {
  if (!isMediaSignatureRequired()) {
    return next();
  }

  if (req.method === 'OPTIONS') {
    return next();
  }

  let cleanPath = req.path;
  const socketIdMatch = cleanPath.match(/-user-[a-zA-Z0-9]+$/);
  if (socketIdMatch) {
    cleanPath = cleanPath.replace(/-user-[a-zA-Z0-9]+$/, '');
  }

  const relativePath = normalizeRelativePath(cleanPath);
  const { expires, sig } = req.query;

  if (verifyMediaSignature(relativePath, expires, sig)) {
    return next();
  }

  if (await verifyJwtAccess(req)) {
    return next();
  }

  return res.status(401).json({
    success: false,
    error: 'Valid media signature or authentication required'
  });
};

module.exports = secureUploads;
