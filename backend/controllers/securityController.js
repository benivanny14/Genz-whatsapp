/**
 * securityController.js
 * ---------------------
 * Consolidated security controller (step 3 of REFACTOR_PLAN.md — merges
 * securityController.js [2FA + account security settings] with
 * securityModsController.js [security MODs]).
 *
 * Both original controllers duplicated getUser/requireUser and
 * mergeSettings scaffolding, and the MODs controller had 10 near-identical
 * toggle handlers. This file keeps every exported handler name and route
 * path intact — only the internal wiring is shared now.
 *
 *   /api/security/...        →  2FA + security settings handlers
 *   /api/security-mods/...   →  security MODs handlers
 */

const QRCode = require('qrcode');
const speakeasy = require('speakeasy');
const User = require('../models/User');
const { createToggleHandler } = require('../services/userScopedService');

// ── Shared helpers (previously duplicated across both controllers) ──────────

const requireUser = async (req, res) => {
  if (!req.user?._id) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'User not found' });
    return null;
  }

  return user;
};

const mergeSettings = (defaults, settings = {}) => ({
  ...defaults,
  ...settings
});

// ── 2FA + account security settings (route prefix /api/security) ────────────

exports.generateTwoFactorSecret = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const secret = speakeasy.generateSecret({
      name: `GENZ (${user.phoneNumber || user.username})`,
      issuer: 'Genz Messenger'
    });

    user.twoFactorSecret = secret.base32;
    user.twoFactorVerified = false;
    await user.save();

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);

    res.status(200).json({
      success: true,
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url,
      qrCode,
      qrCodeDataUrl: qrCode
    });
  } catch (error) {
    console.error('Generate 2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyTwoFactorToken = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    // SECURITY: only verify against the server-issued secret stored on the
    // user (generateTwoFactorSecret saves it). Never accept a client-supplied
    // secret — that would let an attacker bind their own secret to the account.
    const { token } = req.body;
    const twoFactorSecret = user.twoFactorSecret;

    if (!token || !twoFactorSecret) {
      return res.status(400).json({
        success: false,
        message: '2FA token and secret are required'
      });
    }

    const verified = speakeasy.totp.verify({
      secret: twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ success: false, message: 'Invalid 2FA token' });
    }

    user.twoFactorEnabled = true;
    user.twoFactorVerified = true;
    await user.save();

    res.json({
      success: true,
      message: '2FA enabled successfully',
      twoFactorEnabled: true
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.disableTwoFactor = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    if (user.twoFactorEnabled) {
      const { token } = req.body;
      const verified = token && speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 1
      });

      if (!verified) {
        return res.status(400).json({ success: false, message: 'Valid 2FA token is required' });
      }
    }

    user.twoFactorSecret = null;
    user.twoFactorEnabled = false;
    user.twoFactorVerified = false;
    await user.save();

    res.json({
      success: true,
      message: '2FA disabled successfully',
      twoFactorEnabled: false
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyTwoFactorLogin = async (req, res) => {
  try {
    const { userId, token } = req.body;

    if (!token || !userId) {
      return res.status(400).json({
        success: false,
        message: 'User identifier and 2FA token are required'
      });
    }

    const user = await User.findById(userId);

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return res.status(404).json({ success: false, message: '2FA is not enabled for this user' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 1
    });

    res.json({ success: verified, verified });
  } catch (error) {
    console.error('Verify 2FA login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSecuritySettings = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    res.json({
      success: true,
      settings: {
        twoFactorEnabled: user.twoFactorEnabled,
        securitySettings: user.securitySettings,
        passwordChangedAt: user.passwordChangedAt
      }
    });
  } catch (error) {
    console.error('Get security settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSecuritySettings = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const allowed = ['loginAlerts', 'sessionTimeout', 'requireTwoFactorForPayments'];
    allowed.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        user.securitySettings[field] = req.body[field];
      }
    });

    await user.save();

    res.json({
      success: true,
      settings: {
        twoFactorEnabled: user.twoFactorEnabled,
        securitySettings: user.securitySettings
      }
    });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTwoFactorStatus = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    res.json({
      success: true,
      twoFactorEnabled: user.twoFactorEnabled,
      twoFactorVerified: user.twoFactorVerified
    });
  } catch (error) {
    console.error('Get 2FA status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Security MODs (route prefix /api/security-mods) ─────────────────────────

const MODS_DEFAULTS = {
  antiBanProtection: false,
  proxySupport: false,
  ipSpoofing: false,
  deviceSpoofing: false,
  appLockPattern: false,
  appLockPIN: false,
  appLockFingerprint: false,
  appLockFace: false,
  antiScreenshot: false,
  screenRecordingDetection: false,
  vpnMode: false,
  vpnRegion: 'auto'
};

const availableRegions = ['auto', 'usa', 'europe', 'asia', 'africa', 'middle-east'];

// Generic single-field toggle — every security-mods toggle is identical apart
// from the field name and log label.
const toggleModsField = createToggleHandler({
  settingsField: 'securityModsSettings',
  merge: (s) => mergeSettings(MODS_DEFAULTS, s),
  loadUser: requireUser,
});

exports.getSecurityModsSettings = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const settings = mergeSettings(MODS_DEFAULTS, user.securityModsSettings?.toObject?.() || user.securityModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get security MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSecurityModsSettings = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};

    user.securityModsSettings = mergeSettings(MODS_DEFAULTS, { ...existing, ...incoming });
    user.markModified('securityModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.securityModsSettings });
  } catch (error) {
    console.error('Update security MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleAntiBan = (req, res) => toggleModsField(req, res, 'antiBanProtection', 'Toggle anti ban');
exports.toggleProxy = (req, res) => toggleModsField(req, res, 'proxySupport', 'Toggle proxy');
exports.toggleIPSpoofing = (req, res) => toggleModsField(req, res, 'ipSpoofing', 'Toggle IP spoofing');
exports.toggleDeviceSpoofing = (req, res) => toggleModsField(req, res, 'deviceSpoofing', 'Toggle device spoofing');
exports.toggleAppLockPattern = (req, res) => toggleModsField(req, res, 'appLockPattern', 'Toggle app lock pattern');
exports.toggleAppLockPIN = (req, res) => toggleModsField(req, res, 'appLockPIN', 'Toggle app lock PIN');
exports.toggleAppLockFingerprint = (req, res) => toggleModsField(req, res, 'appLockFingerprint', 'Toggle app lock fingerprint');
exports.toggleAppLockFace = (req, res) => toggleModsField(req, res, 'appLockFace', 'Toggle app lock face');
exports.toggleAntiScreenshot = (req, res) => toggleModsField(req, res, 'antiScreenshot', 'Toggle anti screenshot');
exports.toggleScreenRecordingDetection = (req, res) => toggleModsField(req, res, 'screenRecordingDetection', 'Toggle screen recording detection');

exports.toggleVPN = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { enabled, region } = req.body;
    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newEnabled = enabled !== undefined ? enabled : !existing.vpnMode;
    const newRegion = region && availableRegions.includes(region) ? region : (existing.vpnRegion || 'auto');

    user.securityModsSettings = mergeSettings(MODS_DEFAULTS, { ...existing, vpnMode: newEnabled, vpnRegion: newRegion });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, vpnMode: user.securityModsSettings.vpnMode, vpnRegion: user.securityModsSettings.vpnRegion });
  } catch (error) {
    console.error('Toggle VPN error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getVPNStatus = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const settings = mergeSettings(MODS_DEFAULTS, user.securityModsSettings?.toObject?.() || user.securityModsSettings);
    res.json({
      success: true,
      vpn: {
        enabled: settings.vpnMode,
        region: settings.vpnRegion,
        regions: availableRegions,
        simulated: true
      }
    });
  } catch (error) {
    console.error('Get VPN status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
