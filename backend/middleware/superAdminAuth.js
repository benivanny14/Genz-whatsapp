const jwt = require('jsonwebtoken');
const AdminOwner = require('../models/AdminOwner');
const { logAdminAction } = require('../utils/auditLogger');

// Admin tokens are signed with a COMPLETELY SEPARATE secret from regular
// user JWTs (JWT_SECRET). Even if the user-facing secret ever leaked, it
// could never be used to forge an admin session, and vice versa.
if (!process.env.ADMIN_JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: ADMIN_JWT_SECRET environment variable is required in production');
  }
  console.warn('[SECURITY] ADMIN_JWT_SECRET not set — using a dev-only default. DO NOT deploy like this.');
}
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'dev-only-admin-secret-change-me';
const ACCESS_TOKEN_TTL = '15m';
const PRE_2FA_TOKEN_TTL = '2m';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getAllowlist() {
  const raw = process.env.ADMIN_IP_ALLOWLIST || '';
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.connection?.remoteAddress;
}

function checkIpAllowlist(req) {
  const list = getAllowlist();
  if (list.length === 0) return true; // no allowlist configured -> skip this layer
  return list.includes(clientIp(req));
}

function signAccessToken(admin) {
  return jwt.sign(
    { sub: admin._id.toString(), type: 'admin_access' },
    ADMIN_JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signPre2FAToken(admin) {
  return jwt.sign(
    { sub: admin._id.toString(), type: 'admin_2fa_pending' },
    ADMIN_JWT_SECRET,
    { expiresIn: PRE_2FA_TOKEN_TTL }
  );
}

/**
 * Hard gate placed in front of EVERY /api/admin/** route.
 * Regular user JWTs (signed with JWT_SECRET) will NEVER pass this check,
 * because they are verified against a different secret entirely.
 */
const superAdminAuth = async (req, res, next) => {
  try {
    if (!checkIpAllowlist(req)) {
      await logAdminAction(null, 'admin_blocked_ip', { ip: clientIp(req), path: req.originalUrl }, null, null, req);
      return res.status(404).end(); // pretend the route doesn't exist
    }

    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Admin authentication required' });
    }
    const token = header.slice(7).trim();

    let payload;
    try {
      payload = jwt.verify(token, ADMIN_JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired admin session' });
    }

    if (payload.type !== 'admin_access') {
      return res.status(401).json({ success: false, error: 'Invalid admin token type' });
    }

    const admin = await AdminOwner.findById(payload.sub);
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Admin account not found' });
    }

    req.admin = { id: admin._id.toString(), username: admin.username };
    // Backward-compat shim: some older admin-only controllers read req.user._id
    // for audit logging. We provide a minimal, clearly-marked stand-in — this
    // is NOT a real User document and carries no session of its own.
    req.user = { _id: admin._id.toString(), isAdmin: true, isOwnerShim: true };

    // Fire-and-forget audit trail of every authenticated admin action
    logAdminAction(admin._id.toString(), 'admin_request', {
      method: req.method,
      path: req.originalUrl
    }, null, null, req).catch(() => {});

    next();
  } catch (error) {
    console.error('[superAdminAuth] error:', error);
    return res.status(500).json({ success: false, error: 'Admin auth check failed' });
  }
};

module.exports = {
  superAdminAuth,
  signAccessToken,
  signPre2FAToken,
  ADMIN_JWT_SECRET,
  REFRESH_TOKEN_TTL_MS,
  checkIpAllowlist,
  clientIp
};
