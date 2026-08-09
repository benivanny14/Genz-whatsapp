/**
 * whatsappCloudApiService.js — production OTP delivery via the official
 * WhatsApp Business Cloud API (Meta Graph API). No phone ban risk like the
 * whatsapp-web.js consumer protocol.
 *
 * You need:
 *   - a Meta developer account + WhatsApp Business app
 *   - WHATSAPP_CLOUD_API_ACCESS_TOKEN    (from your Meta app)
 *   - WHATSAPP_CLOUD_API_PHONE_NUMBER_ID (of your verified sender number)
 *
 * Then set WHATSAPP_OTP_PROVIDER=cloud-api. Messages are billed by Meta
 * (per-conversation pricing; OTP/utility messages are cheap but not free).
 *
 * API reference: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
 */
const axios = require('axios');
const { circuit, isCircuitOpenError } = require('../utils/circuitBreaker');

const GRAPH_VERSION = process.env.WHATSAPP_CLOUD_API_VERSION || 'v21.0';
const ACCESS_TOKEN = process.env.WHATSAPP_CLOUD_API_ACCESS_TOKEN || '';
const PHONE_NUMBER_ID = process.env.WHATSAPP_CLOUD_API_PHONE_NUMBER_ID || '';
const COUNTRY_CODE = (process.env.WHATSAPP_OTP_COUNTRY_CODE || '255').replace(/\D/g, '');
const DEFAULT_MESSAGE = process.env.WHATSAPP_OTP_MESSAGE_TEMPLATE
  || 'Your GENZ WhatsApp OTP is {otp}. It expires in {minutes} minutes. Do not share it with anyone.';

const API_URL = `https://graph.facebook.com/${GRAPH_VERSION}/${PHONE_NUMBER_ID}/messages`;

/**
 * Normalize a raw phone number to plain international digits for the Cloud
 * API "to" field (e.g. "0712345678" -> "255712345678"). No @c.us suffix here —
 * the Cloud API expects digits only.
 */
function toInternationalDigits(rawPhone) {
  let digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (digits.startsWith(COUNTRY_CODE)) return digits;
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `${COUNTRY_CODE}${digits}`;
}

function isConfigured() {
  return Boolean(ACCESS_TOKEN && PHONE_NUMBER_ID);
}

const ERROR_HINTS = {
  190: 'invalid access token',
  131030: 'recipient number has not registered on WhatsApp',
  131047: 'recipient number is not reachable on WhatsApp (test mode whitelist?)',
  131042: 'business cannot be found',
  131056: 'business is not subscribed to WhatsApp API',
  100: 'invalid request or phone number ID',
  10: 'permission denied',
};

/**
 * @param {string} rawPhone e.g. "0712345678"
 * @param {string} otp 6-digit code
 * @param {object} [options] { ttlMinutes, messageTemplate }
 * @returns {Promise<{ to: string }>}
 */
async function sendOtpMessage(rawPhone, otp, options = {}) {
  if (!isConfigured()) {
    throw new Error(
      'WhatsApp Cloud API is not configured. Set WHATSAPP_CLOUD_API_ACCESS_TOKEN and WHATSAPP_CLOUD_API_PHONE_NUMBER_ID in the backend .env file.'
    );
  }

  const minutes = options.ttlMinutes || parseInt(process.env.WHATSAPP_OTP_TTL_MINUTES || '5', 10);
  const body = (options.messageTemplate || DEFAULT_MESSAGE)
    .replace('{otp}', otp)
    .replace('{minutes}', minutes);
  const to = toInternationalDigits(rawPhone);

  try {
    const { data } = await circuit('whatsapp.cloud-api', { failureThreshold: 3, cooldownMs: 60000, timeoutMs: 15000 }, () =>
      axios.post(
        API_URL,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          type: 'text',
          text: { body },
        },
        {
          headers: {
            Authorization: `Bearer ${ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      )
    );
    console.log(`[CloudAPI] OTP sent to ${to} (msg id ${data?.messages?.[0]?.id || 'n/a'})`);
    return { to };
  } catch (error) {
    if (isCircuitOpenError(error)) throw error; // let callers detect fast-fail
    const code = error?.response?.data?.error?.code;
    const rawMessage = error?.response?.data?.error?.message || '';
    const hint = ERROR_HINTS[code] || rawMessage || 'unknown API error';
    throw new Error(`WhatsApp Cloud API send failed (code ${code ?? 'network'}): ${hint}`);
  }
}

module.exports = { isConfigured, toInternationalDigits, sendOtpMessage };
