const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  normalizeRelativePath,
  verifyMediaSignature,
  isMediaSignatureRequired
} = require('../utils/mediaAccess');

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

const getBearerToken = (req) => {
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
