/**
 * whatsappOtpController.js — HTTP endpoints for the WhatsApp OTP flow.
 *   POST /api/auth/send-otp   → generate 6-digit OTP, deliver via WhatsApp
 *   POST /api/auth/verify-otp → check OTP (correct + not expired, 5 min)
 *   GET  /api/auth/whatsapp/status → WhatsApp client status (for debugging)
 */
const otpStore = require('../services/otpStore');
const { deliverOtp } = require('../services/otpDeliveryService');
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

    const delivery = await deliverOtp(digits, otp, 'send-otp');
    if (delivery.delivered !== 'whatsapp') {
      otpStore.clearOtp(key);
      const isSetupIssue = /QR|ready|disabled|not configured|session|token|ban/i.test(delivery.error?.message || '');
      return res.status(isSetupIssue ? 503 : 500).json({
        success: false,
        message: delivery.error?.message || 'Failed to send OTP via WhatsApp',
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

// @desc    Current QR as a PNG data URL (JSON) — for frontend integration
// @route   GET /api/auth/whatsapp/qr
exports.getWhatsAppQr = async (req, res) => {
  try {
    const qr = await whatsappOtp.getQrDataUrl();
    const status = whatsappOtp.getStatus();
    res.status(200).json({ success: Boolean(qr), qr, status });
  } catch (error) {
    console.error('[WhatsAppOTP] getWhatsAppQr error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Hard reset: wipe WhatsApp session and restart client fresh
// @route   POST /api/auth/whatsapp/reset
exports.resetWhatsApp = async (req, res) => {
  try {
    const status = await whatsappOtp.resetClient();
    console.log('[WhatsAppOTP] Client reset — a fresh QR will appear on the display page.');
    res.status(200).json({ success: true, message: 'WhatsApp session reset. Scan the new QR.', status });
  } catch (error) {
    console.error('[WhatsAppOTP] reset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Human-friendly page showing the QR (auto-refreshes) — for operators
// @route   GET /api/auth/whatsapp/qr/display
exports.getWhatsAppQrDisplay = async (req, res) => {
  try {
    const qr = await whatsappOtp.getQrDataUrl();
    const status = whatsappOtp.getStatus();

    let body;
    const qrAgeSeconds = status.lastQrAt
      ? Math.floor((Date.now() - new Date(status.lastQrAt).getTime()) / 1000)
      : null;

    if (status.clientReady) {
      body = '<p style="font-size:18px;color:#25D366">✓ WhatsApp client is READY (linked number: '
        + (status.linkedPhone ? status.linkedPhone : 'n/a')
        + '). OTPs are being sent.</p>'
        + '<button onclick="location.reload()" style="...">Refresh</button>';
    } else if (qr) {
      const stale = qrAgeSeconds !== null && qrAgeSeconds > 45;
      body = (stale
          ? '<p style="font-size:16px;color:#ff5252;font-weight:600">⚠ QR is ' + qrAgeSeconds + 's old — WhatsApp will REFUSE an expired QR. This page refreshes automatically; wait for a fresh one.</p>'
          : '<p style="color:#aaa">QR generated ' + (qrAgeSeconds !== null ? qrAgeSeconds + 's ago' : 'recently') + ' — scan NOW.</p>')
        + '<img src="' + qr + '" alt="WhatsApp QR" style="width:320px;height:320px;image-rendering:pixelated;background:#fff;padding:8px;border-radius:12px" />'
        + '<p style="color:#aaa">Scan this with your phone: WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device.</p>'
        + '<p style="color:#aaa">QR expires after ~1 minute — this page refreshes automatically.</p>';
    } else {
      body = '<p style="font-size:18px;color:#fff">Starting WhatsApp client — generating QR…</p>'
        + '<p style="color:#aaa">If nothing appears in ~15 seconds, request an OTP (register/login) once and come back here.</p>';
    }

    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>WhatsApp OTP — Link device</title>
<style>
  body { background:#0d1f35; color:#fff; font-family:system-ui,sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; }
  .card { background:#182229; border:1px solid rgba(255,255,255,.1); border-radius:20px; padding:32px; text-align:center; max-width:440px; }
  h1 { font-size:20px; margin:0 0 8px; }
  .sub { color:#8696a0; font-size:14px; margin:0 0 24px; }
  .pill { display:inline-block; margin-top:16px; padding:6px 14px; border-radius:999px; font-size:13px; }
  .pill.ok { background:rgba(37,211,102,.15); color:#25D366; }
  .pill.wait { background:rgba(255,193,7,.15); color:#ffc107; }
</style>
</head>
<body>
  <div class="card">
    <h1>WhatsApp OTP — Link a device</h1>
    <p class="sub">GENZ WhatsApp backend</p>
    ${body}
    <div class="pill ${status.clientReady ? 'ok' : 'wait'}">${status.clientReady ? 'READY' : (qr ? 'SCAN THE QR ABOVE' : 'STARTING…')}</div>
  </div>
  <script>setTimeout(function(){ location.reload(); }, 4000);</script>
</body>
</html>`);
  } catch (error) {
    console.error('[WhatsAppOTP] getWhatsAppQrDisplay error:', error);
    res.status(500).send('Error: ' + (error.message || 'unknown'));
  }
};
