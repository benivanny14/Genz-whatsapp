const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const AdminOwner = require('../models/AdminOwner');
const { logAdminAction } = require('../utils/auditLogger');
const { recordIpLockout } = require('../middleware/adminLoginLimiter');
const {
  signAccessToken,
  signPre2FAToken,
  ADMIN_JWT_SECRET,
  REFRESH_TOKEN_TTL_MS,
  clientIp
} = require('../middleware/superAdminAuth');

// STEP 1: username + password
const loginStep1 = async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }

    // Normalize once and use the SAME trimmed value for the query and the
    // constant-time comparison below (a trailing space used to find the owner
    // in the query but then fail the compare — a self-lockout footgun).
    const normalizedUsername = String(username).trim();

    // Look the owner up by username (the singleton `ownerKey` was hard-wired
    // here, which forced a single owner account). This still resolves the
    // bootstrapped PRIMARY_OWNER — and lets e2e/prep provision additional
    // owner identities with fully independent credentials and lockout state.
    const admin = await AdminOwner.findOne({ username: normalizedUsername });
    if (!admin) {
      // Distinguish "no owner provisioned at all" (503 — must bootstrap) from
      // "unknown username" (401 — same response as a bad password) so an
      // attacker cannot enumerate which usernames exist.
      const anyOwner = await AdminOwner.exists({});
      if (!anyOwner) {
        return res.status(503).json({ success: false, error: 'Admin account is not provisioned on this server' });
      }
      // Burn the same scrypt cost as a real password check so response
      // TIMING does not reveal whether the username exists (a known-username
      // wrong password takes ~100ms in comparePassword; an unknown username
      // would otherwise return instantly).
      const dummy = new AdminOwner({ username: 'dummy-owner', totpSecret: 'DUMMYSECRET' });
      dummy.passwordHash = '00:00:16384'; // syntactically valid, never matches
      await dummy.comparePassword(String(password));
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (admin.isLocked()) {
      recordIpLockout(req);
      await logAdminAction(admin._id.toString(), 'admin_login_locked', { username }, null, null, req);
      return res.status(423).json({ success: false, error: 'Account temporarily locked due to failed attempts. Try again later.' });
    }

    const usernameMatch = crypto.timingSafeEqual(
      Buffer.from(admin.username.padEnd(64, '\0')),
      Buffer.from(normalizedUsername.padEnd(64, '\0').slice(0, 64))
    );
    const passwordMatch = await admin.comparePassword(password);

    if (!usernameMatch || !passwordMatch) {
      await admin.registerFailedAttempt();
      // If this attempt pushed the account into lockout, escalate the per-IP block
      if (admin.failedLoginAttempts >= 5) recordIpLockout(req);
      await logAdminAction(admin._id.toString(), 'admin_login_failed', { username, ip: clientIp(req) }, null, null, req);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // 2FA is enforced for owner accounts. Step 1 only returns a short-lived
    // pre-auth token; the real access/refresh tokens are issued in loginStep2
    // ONLY after a valid TOTP code has been presented. This prevents the
    // "password alone unlocks the dashboard" bypass.
    if (admin.totpEnabled) {
      const preAuthToken = signPre2FAToken(admin);
      return res.json({
        success: true,
        requiresTwoFactor: true,
        preAuthToken
      });
    }

    const accessToken = signAccessToken(admin);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    await admin.setRefreshToken(refreshToken, REFRESH_TOKEN_TTL_MS);
    await admin.registerSuccessfulLogin(req);
    await logAdminAction(admin._id.toString(), 'admin_login_success', { ip: clientIp(req) }, null, null, req);

    return res.json({
      success: true,
      requiresTwoFactor: false,
      accessToken,
      refreshToken,
      admin: { username: admin.username, lastLoginAt: admin.lastLoginAt }
    });
  } catch (error) {
    console.error('[adminAuthController.loginStep1]', error);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
};

// STEP 2: TOTP code
const loginStep2 = async (req, res) => {
  try {
    const { preAuthToken, code } = req.body || {};
    if (!preAuthToken || !code) {
      return res.status(400).json({ success: false, error: 'preAuthToken and code are required' });
    }

    let payload;
    try {
      payload = jwt.verify(preAuthToken, ADMIN_JWT_SECRET, { algorithms: ['HS256'] });
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Pre-auth session expired, please log in again' });
    }
    if (payload.type !== 'admin_2fa_pending') {
      return res.status(401).json({ success: false, error: 'Invalid session token' });
    }

    const admin = await AdminOwner.findById(payload.sub);
    if (!admin) return res.status(401).json({ success: false, error: 'Admin not found' });
    if (admin.isLocked()) {
      recordIpLockout(req);
      return res.status(423).json({ success: false, error: 'Account temporarily locked. Try again later.' });
    }

    const verified = speakeasy.totp.verify({
      secret: admin.totpSecret,
      encoding: 'base32',
      token: String(code).trim(),
      window: 1 // allow ~30s clock drift
    });

    if (!verified) {
      await admin.registerFailedAttempt();
      if (admin.failedLoginAttempts >= 5) recordIpLockout(req);
      await logAdminAction(admin._id.toString(), 'admin_2fa_failed', {}, null, null, req);
      return res.status(401).json({ success: false, error: 'Invalid authentication code' });
    }

    const accessToken = signAccessToken(admin);
    const refreshToken = crypto.randomBytes(48).toString('hex');
    await admin.setRefreshToken(refreshToken, REFRESH_TOKEN_TTL_MS);
    await admin.registerSuccessfulLogin(req);
    await logAdminAction(admin._id.toString(), 'admin_login_success', { ip: clientIp(req) }, null, null, req);

    return res.json({
      success: true,
      accessToken,
      refreshToken,
      admin: { username: admin.username, lastLoginAt: admin.lastLoginAt }
    });
  } catch (error) {
    console.error('[adminAuthController.loginStep2]', error);
    return res.status(500).json({ success: false, error: '2FA verification failed' });
  }
};

/**
 * Resolve the AdminOwner that holds a given refresh token. The token is 48
 * random bytes (384 bits), so scanning the (tiny) set of owners that carry a
 * refresh-token hash is safe: only the owner that was issued the token can
 * match, via the constant-time per-doc verify. This replaces the old
 * hard-coded PRIMARY_OWNER lookup so additional owner identities (per-spec
 * e2e owners) get working refresh/logout too.
 */
async function findOwnerByRefreshToken(refreshToken) {
  const candidates = await AdminOwner.find({ refreshTokenHash: { $ne: null } });
  for (const admin of candidates) {
    if (await admin.verifyRefreshToken(refreshToken)) return admin;
  }
  return null;
}

const refreshSession = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ success: false, error: 'refreshToken is required' });

    const admin = await findOwnerByRefreshToken(refreshToken);
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
    }

    const accessToken = signAccessToken(admin);
    const newRefreshToken = crypto.randomBytes(48).toString('hex');
    await admin.setRefreshToken(newRefreshToken, REFRESH_TOKEN_TTL_MS); // rotate

    return res.json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    console.error('[adminAuthController.refreshSession]', error);
    return res.status(500).json({ success: false, error: 'Session refresh failed' });
  }
};

const logout = async (req, res) => {
  try {
    // A refresh token is REQUIRED: logout must target the session it actually
    // revokes. There is deliberately no PRIMARY_OWNER fallback anymore — an
    // unauthenticated POST must not be able to clear the owner's session.
    const { refreshToken } = req.body || {};
    if (!refreshToken || typeof refreshToken !== 'string') {
      return res.status(400).json({ success: false, error: 'refreshToken is required' });
    }

    const admin = await findOwnerByRefreshToken(refreshToken);
    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }
    await admin.clearRefreshToken();
    await logAdminAction(admin._id.toString(), 'admin_logout', {}, null, null, req);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

module.exports = { loginStep1, loginStep2, refreshSession, logout };
