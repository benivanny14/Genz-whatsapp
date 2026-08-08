/**
 * whatsappOtpService.js — WhatsApp OTP delivery via whatsapp-web.js.
 *
 * Lifecycle:
 *  - Lazy-init: the client is only created on the first send request, so the
 *    server keeps booting fast even when WhatsApp OTP is not in use.
 *  - First run: a QR code is printed to the terminal. Scan it once with the
 *    WhatsApp mobile app (WhatsApp > Linked Devices > Link a Device). The
 *    session is persisted with LocalAuth, so later restarts need no QR scan.
 *  - sendOtpMessage() waits for the client to be READY before sending, and
 *    queues messages that arrive while the client is still connecting.
 *
 * Production warning: whatsapp-web.js uses the WhatsApp Web consumer protocol
 * and is intended for personal/low-volume automation. Bulk OTP traffic can
 * get the linked number banned. For production scale, use the WhatsApp
 * Business Cloud API (Twilio/Africastalking) instead — this service can be
 * swapped behind the same interface.
 */
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const ENABLED = process.env.WHATSAPP_OTP_ENABLED === 'true';
const COUNTRY_CODE = (process.env.WHATSAPP_OTP_COUNTRY_CODE || '255').replace(/\D/g, '');
const SESSION_DIR = process.env.WHATSAPP_OTP_SESSION_DIR
  || require('path').join(__dirname, '..', '.wwebjs_auth');
const DEFAULT_MESSAGE = process.env.WHATSAPP_OTP_MESSAGE_TEMPLATE
  || 'Your GENZ WhatsApp OTP is {otp}. It expires in {minutes} minutes. Do not share it with anyone.';

let client = null;
let clientReady = false;
let clientInitializing = false;
let waitingReady = null; // { resolve, reject }
let lastQr = null;
let lastQrAt = null;
let linkedPhone = null;

/**
 * Normalize a raw phone number to WhatsApp's JID format: CCXXXXXXXXX@c.us
 *  - strips spaces, dashes, parentheses, leading '+'
 *  - drops a leading country-code '0'
 *  - if the result has no country code, prepends the configured one (default 255)
 */
function toWhatsAppJid(rawPhone) {
  let digits = String(rawPhone || '').replace(/[^\d]/g, '');
  if (digits.startsWith(COUNTRY_CODE)) {
    return `${digits}@c.us`;
  }
  if (digits.startsWith('0')) digits = digits.slice(1);
  return `${COUNTRY_CODE}${digits}@c.us`;
}

function isEnabled() {
  return ENABLED;
}

function getStatus() {
  return {
    enabled: ENABLED,
    clientReady,
    clientInitializing,
    qrScanned: Boolean(linkedPhone),
    waitingForQr: !clientReady && !linkedPhone,
    linkedPhone,
    lastQrAt,
  };
}

function initClient() {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  client.on('qr', (qr) => {
    lastQr = qr;
    lastQrAt = new Date().toISOString();
    console.log('\n==========================================');
    console.log('[WhatsAppOTP] Scan this QR with your WhatsApp app:');
    console.log('            WhatsApp > Settings > Linked Devices > Link a Device');
    console.log('==========================================');
    qrcode.generate(qr, { small: true });
    console.log('==========================================\n');
  });

  client.on('ready', () => {
    clientReady = true;
    linkedPhone = client.info?.me?.user || null;
    console.log(`[WhatsAppOTP] Client ready — sending OTPs from ${linkedPhone || 'linked number'}.`);
    if (waitingReady) {
      waitingReady.resolve(client);
      waitingReady = null;
    }
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsAppOTP] Auth failed:', msg);
    clientReady = false;
    if (waitingReady) {
      waitingReady.reject(new Error('WhatsApp session invalid. Delete the session folder and re-scan the QR code.'));
      waitingReady = null;
    }
  });

  client.on('disconnected', (reason) => {
    console.warn('[WhatsAppOTP] Client disconnected:', reason || 'unknown');
    clientReady = false;
  });

  client.initialize().catch((err) => {
    console.error('[WhatsAppOTP] Initialize error:', err?.message || err);
    clientReady = false;
  });

  return client;
}

/**
 * Resolve when the WhatsApp client is READY to send messages.
 * @param {number} timeoutMs - how long to wait before giving up.
 */
function ensureReady(timeoutMs = 30000) {
  if (!ENABLED) {
    return Promise.reject(new Error('WhatsApp OTP is disabled. Set WHATSAPP_OTP_ENABLED=true in the backend .env file.'));
  }
  if (clientReady && client) return Promise.resolve(client);

  initClient();

  if (waitingReady) return waitingReady.promise;

  waitingReady = {};
  waitingReady.promise = new Promise((resolve, reject) => {
    waitingReady.resolve = resolve;
    waitingReady.reject = reject;

    const timer = setTimeout(() => {
      if (waitingReady === null) return;
      const state = clientReady ? 'ready' : linkedPhone ? 'reconnecting' : 'waiting_for_qr';
      waitingReady.reject(new Error(
        `WhatsApp client not ready yet (state: ${state}). Check the server terminal for the QR code and scan it with your phone.`
      ));
      waitingReady = null;
    }, timeoutMs);

    if (clientReady && client) {
      clearTimeout(timer);
      resolve(client);
      waitingReady = null;
      return;
    }
  });
  return waitingReady.promise;
}

/**
 * Send an OTP message to a phone number.
 * @param {string} rawPhone - e.g. "0712345678", "255712345678" or "+255 712 345 678"
 * @param {string} otp - the 6-digit code
 * @param {object} [options] - { ttlMinutes, messageTemplate }
 */
async function sendOtpMessage(rawPhone, otp, options = {}) {
  const minutes = options.ttlMinutes || parseInt(process.env.WHATSAPP_OTP_TTL_MINUTES || '5', 10);
  const message = (options.messageTemplate || DEFAULT_MESSAGE)
    .replace('{otp}', otp)
    .replace('{minutes}', minutes);

  const whatsappClient = await ensureReady(options.timeoutMs || 30000);
  const jid = toWhatsAppJid(rawPhone);
  await whatsappClient.sendMessage(jid, message);
  return { jid };
}

module.exports = {
  isEnabled,
  getStatus,
  toWhatsAppJid,
  sendOtpMessage,
  ensureReady,
};
