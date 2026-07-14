const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const AdminOwner = require('../models/AdminOwner');
const { logAdminAction } = require('../utils/auditLogger');
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

    const admin = await AdminOwner.findOne({ ownerKey: 'PRIMARY_OWNER' });
    if (!admin) {
      // No owner account exists yet — must be bootstrapped via CLI script.
      return res.status(503).json({ success: false, error: 'Admin account is not provisioned on this server' });
    }

    if (admin.isLocked()) {
      await logAdminAction(admin._id.toString(), 'admin_login_locked', { username }, null, null, req);
      return res.status(423).json({ success: false, error: 'Account temporarily locked due to failed attempts. Try again later.' });
    }

    const usernameMatch = crypto.timingSafeEqual(
      Buffer.from(admin.username.padEnd(64, '\0')),
      Buffer.from(String(username).padEnd(64, '\0').slice(0, 64))
    );
    const passwordMatch = await admin.comparePassword(password);

    if (!usernameMatch || !passwordMatch) {
      await admin.registerFailedAttempt();
      await logAdminAction(admin._id.toString(), 'admin_login_failed', { username, ip: clientIp(req) }, null, null, req);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (admin.totpEnabled) {
      const preToken = signPre2FAToken(admin);
      await logAdminAction(admin._id.toString(), 'admin_login_step1_ok', {}, null, null, req);
      return res.json({ success: true, requiresTwoFactor: true, preAuthToken: preToken });
    }

    // Should not normally happen — 2FA is mandatory for owner accounts.
    const accessToken = signAccessToken(admin);
    await admin.registerSuccessfulLogin(req);
    return res.json({ success: true, requiresTwoFactor: false, accessToken });
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
      payload = jwt.verify(preAuthToken, ADMIN_JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Pre-auth session expired, please log in again' });
    }
    if (payload.type !== 'admin_2fa_pending') {
      return res.status(401).json({ success: false, error: 'Invalid session token' });
    }

    const admin = await AdminOwner.findById(payload.sub);
    if (!admin) return res.status(401).json({ success: false, error: 'Admin not found' });
    if (admin.isLocked()) {
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

const refreshSession = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken) return res.status(400).json({ success: false, error: 'refreshToken is required' });

    const admin = await AdminOwner.findOne({ ownerKey: 'PRIMARY_OWNER' });
    if (!admin || !admin.verifyRefreshToken(refreshToken)) {
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
    const admin = await AdminOwner.findOne({ ownerKey: 'PRIMARY_OWNER' });
    if (admin) {
      await admin.clearRefreshToken();
      await logAdminAction(admin._id.toString(), 'admin_logout', {}, null, null, req);
    }
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

module.exports = { loginStep1, loginStep2, refreshSession, logout };
