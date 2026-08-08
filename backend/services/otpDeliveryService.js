/**
 * otpDeliveryService.js — shared OTP delivery used by ALL existing OTP flows
 * (register/phone-verification, resend-phone-otp, forgot-password,
 * change-number) plus the standalone /auth/send-otp + /auth/verify-otp pair.
 *
 * Provider selection (WHATSAPP_OTP_PROVIDER):
 *  - "whatsapp-web" (default, free, dev-friendly)  → whatsapp-web.js, QR scan
 *    in terminal. Consumer protocol — fine for personal/low volume, but bulk
 *    OTP traffic risks a ban on the linked number.
 *  - "cloud-api" (production-grade) → official WhatsApp Business Cloud API
 *    (Meta). Needs WHATSAPP_CLOUD_API_ACCESS_TOKEN + PHONE_NUMBER_ID in .env.
 *
 * Behavior:
 *  - WHATSAPP_OTP_ENABLED=true → the OTP is sent to the user's phone via the
 *    selected provider. Returns { delivered: 'whatsapp' } on success.
 *  - otherwise → { delivered: 'none' } and flows keep today's behavior
 *    (dev/test: OTP echoed in the API response; production: not exposed).
 *
 * Delivery failures NEVER break the surrounding flow: the OTP is already
 * stored on the user record, the error is logged, and dev/test builds still
 * expose the code in the response.
 */
const whatsappOtp = require('./whatsappOtpService');
const whatsappCloudApi = require('./whatsappCloudApiService');

const PROVIDER = (process.env.WHATSAPP_OTP_PROVIDER || 'whatsapp-web').toLowerCase();

/**
 * @param {string} phoneNumber raw user phone (e.g. "0712345678", "2557...")
 * @param {string} otp 6-digit code
 * @param {string} purpose short label for logs ("phone-verification", ...)
 * @param {object} [options] { timeoutMs }
 * @returns {Promise<{delivered: 'whatsapp'|'none', error?: Error}>}
 */
async function deliverOtp(phoneNumber, otp, purpose = 'otp', options = {}) {
  if (process.env.WHATSAPP_OTP_ENABLED !== 'true') {
    return { delivered: 'none' };
  }
  try {
    if (PROVIDER === 'cloud-api') {
      const { to } = await whatsappCloudApi.sendOtpMessage(phoneNumber, otp, {
        timeoutMs: options.timeoutMs || 15000,
      });
      console.log(`[OTPDelivery] ${purpose} OTP sent via Cloud API to ${to}`);
    } else {
      const { jid } = await whatsappOtp.sendOtpMessage(phoneNumber, otp, {
        timeoutMs: options.timeoutMs || 15000,
      });
      console.log(`[OTPDelivery] ${purpose} OTP sent via WhatsApp Web to ${jid}`);
    }
    return { delivered: 'whatsapp' };
  } catch (error) {
    console.warn(`[OTPDelivery] ${purpose} OTP could NOT be sent (provider: ${PROVIDER}):`, error?.message || error);
    return { delivered: 'none', error };
  }
}

module.exports = { deliverOtp, PROVIDER };
