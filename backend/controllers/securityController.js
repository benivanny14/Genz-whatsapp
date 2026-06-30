const crypto = require('crypto');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const speakeasy = require('speakeasy');
const User = require('../models/User');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const normalizeEmail = (email) => (email ? email.trim().toLowerCase() : null);
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const publicTokenPayload = (key, token) => {
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST) {
    return {};
  }
  return { [key]: token };
};

const getMailer = () => {
  if (!process.env.SMTP_HOST) {
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASS ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : undefined
  });
};

const sendMail = async ({ to, subject, text, html }) => {
  const mailer = getMailer();
  if (!mailer) {
    return { sent: false, reason: 'SMTP not configured' };
  }

  await mailer.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@genz.local',
    to,
    subject,
    text,
    html
  });

  return { sent: true };
};

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
      name: `GENZ (${user.email || user.phoneNumber || user.username})`,
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
    const { userId, email, token } = req.body;

    if (!token || (!userId && !email)) {
      return res.status(400).json({
        success: false,
        message: 'User identifier and 2FA token are required'
      });
    }

    const user = userId
      ? await User.findById(userId)
      : await User.findOne({ email: normalizeEmail(email) });

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

exports.sendEmailVerification = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const email = normalizeEmail(req.body.email || user.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    user.email = email;
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = hashToken(rawToken);
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${rawToken}`;
    const mailResult = await sendMail({
      to: email,
      subject: 'Verify your GENZ email',
      text: `Verify your email: ${verificationUrl}`,
      html: `<p>Verify your GENZ email:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p>`
    });

    res.status(200).json({
      success: true,
      message: mailResult.sent ? 'Verification email sent' : 'Verification token generated',
      email,
      mail: mailResult,
      ...publicTokenPayload('verificationToken', rawToken)
    });
  } catch (error) {
    console.error('Send email verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }

    const user = await User.findOne({
      emailVerificationToken: hashToken(token),
      emailVerificationExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.emailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resendEmailVerification = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    req.user = user;
    return exports.sendEmailVerification(req, res);
  } catch (error) {
    console.error('Resend email verification error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.sendPasswordReset = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ email });
    let rawToken = null;
    let mailResult = { sent: false, reason: 'User not found' };

    if (user) {
      rawToken = crypto.randomBytes(32).toString('hex');
      user.passwordResetToken = hashToken(rawToken);
      user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();

      const resetUrl = `${FRONTEND_URL}/reset-password?token=${rawToken}`;
      mailResult = await sendMail({
        to: email,
        subject: 'Reset your GENZ password',
        text: `Reset your password: ${resetUrl}`,
        html: `<p>Reset your GENZ password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
      });
    }

    res.status(200).json({
      success: true,
      message: 'If this email exists, a password reset link has been generated',
      mail: mailResult,
      ...(rawToken ? publicTokenPayload('resetToken', rawToken) : {})
    });
  } catch (error) {
    console.error('Send password reset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword, password } = req.body;
    const nextPassword = newPassword || password;

    if (!token || !nextPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token and new password are required'
      });
    }

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpiresAt: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    await user.setPassword(nextPassword);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
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
        emailVerified: user.emailVerified,
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
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        securitySettings: user.securitySettings
      }
    });
  } catch (error) {
    console.error('Update security settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getEmailStatus = async (req, res) => {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    res.json({
      success: true,
      email: user.email,
      emailVerified: user.emailVerified
    });
  } catch (error) {
    console.error('Get email status error:', error);
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
