/**
 * whatsappOtpController.js — HTTP endpoints for the WhatsApp OTP flow.
 *   POST /api/auth/send-otp   → generate 6-digit OTP, deliver via WhatsApp
 *   POST /api/auth/verify-otp → check OTP (correct + not expired, 5 min)
 *   GET  /api/auth/whatsapp/status → WhatsApp client status (for debugging)
 */
const otpStore = require('../services/otpStore');
const whatsappOtp = require('../services/whatsappOtpService');

const RETURN_OTP_IN_RESPONSE = process.env.WHATSAPP_OTP_RETURN_IN_RESPONSE === 'true';

function normalizePhone(rawPhone) {
  return String(rawPhone || '').replace(/[^\d]/g, '');
}

// @desc    Send a 6-digit OTP via WhatsApp
// @route   POST /api/auth/send-otp
// @access  Public (rate-limited)
exports.sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body || {};
    const digits = normalizePhone(phoneNumber);

    if (digits.length < 7 || digits.length > 15) {
      return res.status(400).json({ success: false, message: 'Invalid phone number. Provide an international format number, e.g. 255712345678.' });
    }

    const otp = otpStore.generateOtp();
    const key = digits;
    otpStore.storeOtp(key, otp);

    try {
      const { jid } = await whatsappOtp.sendOtpMessage(digits, otp);
      console.log(`[WhatsAppOTP] OTP sent to ${jid}`);
    } catch (sendError) {
      otpStore.clearOtp(key);
      const isSetupIssue = /QR|ready|disabled|session/i.test(sendError?.message || '');
      return res.status(isSetupIssue ? 503 : 500).json({
        success: false,
        message: sendError?.message || 'Failed to send OTP via WhatsApp',
        ...(RETURN_OTP_IN_RESPONSE || process.env.NODE_ENV !== 'production'
          ? { devOtp: otp, whatsappStatus: whatsappOtp.getStatus() }
          : {}),
      });
    }

    res.status(200).json({
      success: true,
      message: 'OTP sent via WhatsApp',
      expiresInMinutes: otpStore.TTL_MINUTES,
      // Dev/test only: with WHATSAPP_OTP_RETURN_IN_RESPONSE=true (or NODE_ENV!=production)
      // the code is echoed so you can test without a real WhatsApp send.
      ...(RETURN_OTP_IN_RESPONSE || process.env.NODE_ENV !== 'production'
        ? { devOtp: otp, whatsappStatus: whatsappOtp.getStatus() }
        : {}),
    });
  } catch (error) {
    console.error('[WhatsAppOTP] sendOtp error:', error);
    res.status(500).json({ success: false, message: 'Server error while sending OTP' });
  }
};

// @desc    Verify an OTP (correct + within 5 minutes)
// @route   POST /api/auth/verify-otp
// @access  Public (rate-limited)
exports.verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body || {};
    const digits = normalizePhone(phoneNumber);

    if (!digits) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!otp) {
      return res.status(400).json({ success: false, message: 'OTP is required' });
    }

    const result = otpStore.verifyOtp(digits, otp);
    if (!result.success) {
      const message = result.reason === 'expired'
        ? 'OTP has expired, please request a new one'
        : result.reason === 'max_attempts'
          ? 'Too many failed attempts. Request a new OTP'
          : 'Invalid OTP';
      return res.status(400).json({ success: false, message });
    }

    res.status(200).json({ success: true, message: 'OTP verified successfully' });
  } catch (error) {
    console.error('[WhatsAppOTP] verifyOtp error:', error);
    res.status(500).json({ success: false, message: 'Server error while verifying OTP' });
  }
};

// @desc    WhatsApp client status (connected? waiting for QR?)
// @route   GET /api/auth/whatsapp/status
exports.getWhatsAppStatus = async (req, res) => {
  res.status(200).json({ success: true, status: whatsappOtp.getStatus() });
};
