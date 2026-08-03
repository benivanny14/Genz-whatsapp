const QRCode = require('qrcode');
const speakeasy = require('speakeasy');
const User = require('../models/User');

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

exports.generateTwoFactorSecret = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const secret = speakeasy.generateSecret({
      name: `GENZ (${user.phoneNumber || user.username})`,
      issuer: 'GENZ WhatsApp'
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

    const { token, secret } = req.body;
    const twoFactorSecret = secret || user.twoFactorSecret;

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

    user.twoFactorSecret = twoFactorSecret;
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
