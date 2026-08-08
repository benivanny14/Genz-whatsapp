/**
 * otpDeliveryService.js — shared OTP delivery used by ALL existing OTP flows
 * (register/phone-verification, resend-phone-otp, forgot-password,
 * change-number) plus the standalone /auth/send-otp + /auth/verify-otp pair.
 *
 * Behavior:
 *  - WHATSAPP_OTP_ENABLED=true  → the OTP is sent to the user's phone via
 *    whatsapp-web.js. Returns { delivered: 'whatsapp' } on success.
 *  - otherwise → { delivered: 'none' } and flows keep today's behavior
 *    (dev/test: OTP echoed in the API response; production: not exposed).
 *
 * Delivery failures NEVER break the surrounding flow: the OTP is already
 * stored on the user record, the error is logged, and dev/test builds still
 * expose the code in the response.
 */
const whatsappOtp = require('./whatsappOtpService');

/**
 * @param {string} phoneNumber raw user phone (e.g. "0712345678", "2557...")
 * @param {string} otp 6-digit code
 * @param {string} purpose short label for logs ("phone-verification", ...)
 * @param {object} [options] { timeoutMs }
 * @returns {Promise<{delivered: 'whatsapp'|'none', error?: Error}>}
 */
async function deliverOtp(phoneNumber, otp, purpose = 'otp', options = {}) {
  if (!whatsappOtp.isEnabled()) {
    return { delivered: 'none' };
  }
  try {
    const { jid } = await whatsappOtp.sendOtpMessage(phoneNumber, otp, {
      timeoutMs: options.timeoutMs || 15000,
    });
    console.log(`[OTPDelivery] ${purpose} OTP sent via WhatsApp to ${jid}`);
    return { delivered: 'whatsapp' };
  } catch (error) {
    console.warn(`[OTPDelivery] ${purpose} OTP could NOT be sent via WhatsApp:`, error?.message || error);
    return { delivered: 'none', error };
  }
}

module.exports = { deliverOtp };
