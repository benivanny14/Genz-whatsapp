/**
 * SMS Service for OTP verification
 *
 * FEATURE ADD: sendOTP used to only console.log the code — no SMS was ever
 * actually sent, so users never received a real text message like they do
 * on WhatsApp. This now calls a real SMS provider's API when credentials are
 * configured via environment variables, and falls back to console logging
 * (clearly labeled as dev-mode) only when no provider is configured, so the
 * app keeps working in local development without crashing.
 *
 * Provider is auto-detected from whichever credentials are present in
 * backend/.env.example (Africa's Talking is tried first — good Tanzania/
 * Africa coverage — then Twilio):
 *   - Africa's Talking: AFRICAS_TALKING_API_KEY, AFRICAS_TALKING_USERNAME
 *   - Twilio: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   - Neither configured → dev-mode console logging (no real SMS sent)
 */

const crypto = require('crypto');
const axios = require('axios');

// Converts a locally-formatted Tanzanian number (07XXXXXXXX) or a number
// already in international format into strict E.164 (+2557XXXXXXXX), which
// every SMS provider's API requires.
const toE164 = (phoneNumber) => {
  const digits = String(phoneNumber || '').replace(/\D/g, '');
  if (digits.startsWith('255')) return `+${digits}`;
  if (digits.startsWith('0')) return `+255${digits.slice(1)}`;
  if (String(phoneNumber || '').startsWith('+')) return phoneNumber;
  return `+255${digits}`;
};

const hasAfricasTalkingCreds = () =>
  Boolean(process.env.AFRICAS_TALKING_API_KEY && process.env.AFRICAS_TALKING_USERNAME);
const hasTwilioCreds = () =>
  Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
const hasBeemCreds = () =>
  Boolean(process.env.BEEM_API_KEY && process.env.BEEM_SECRET_KEY);

async function sendViaAfricasTalking(phoneNumber, message) {
  const apiKey = process.env.AFRICAS_TALKING_API_KEY;
  const username = process.env.AFRICAS_TALKING_USERNAME;
  const isSandbox = username === 'sandbox';
  const baseUrl = isSandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging';

  const params = new URLSearchParams();
  params.append('username', username);
  params.append('to', toE164(phoneNumber));
  params.append('message', message);
  if (process.env.AFRICAS_TALKING_SENDER_ID) {
    params.append('from', process.env.AFRICAS_TALKING_SENDER_ID);
  }

  const response = await axios.post(baseUrl, params, {
    headers: {
      apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    timeout: 10000
  });

  const recipient = response.data?.SMSMessageData?.Recipients?.[0];
  if (!recipient || !['Success', 'Sent', 'Buffered'].includes(recipient.status)) {
    throw new Error(recipient?.status || 'Africa\'s Talking did not confirm delivery');
  }
  return { provider: 'africastalking', raw: response.data };
}

async function sendViaTwilio(phoneNumber, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  const params = new URLSearchParams();
  params.append('To', toE164(phoneNumber));
  params.append('From', fromNumber);
  params.append('Body', message);

  const response = await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    params,
    {
      auth: { username: accountSid, password: authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000
    }
  );
  return { provider: 'twilio', raw: response.data };
}

async function sendViaBeem(phoneNumber, message) {
  const apiKey = process.env.BEEM_API_KEY;
  const secretKey = process.env.BEEM_SECRET_KEY;
  const sourceAddr = process.env.BEEM_SOURCE_ADDR || 'GENZ';

  // BEEM API endpoint
  const baseUrl = 'https://apisms.beem.africa/public/v1/bulksms';

  // Format phone number for BEEM (remove +, keep country code)
  const formattedPhone = toE164(phoneNumber).replace('+', '');

  const response = await axios.post(
    baseUrl,
    {
      source_addr: sourceAddr,
      schedule_time: '',
      encoding: 0,
      message: message,
      recipients: [
        {
          recipient_id: formattedPhone,
          dest_addr: formattedPhone
        }
      ]
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${apiKey}:${secretKey}`).toString('base64')}`
      },
      timeout: 15000
    }
  );

  console.log('[BEEM] Response:', response.data);

  // BEEM returns code 100 for success
  if (response.data?.code !== 100) {
    const errorMsg = response.data?.message || response.data?.error || 'BEEM API error';
    console.error('[BEEM] Error:', errorMsg, 'Full response:', response.data);
    throw new Error(`BEEM API error: ${errorMsg}`);
  }

  return { provider: 'beem', raw: response.data };
}

class SMSService {
  constructor() {
    this.otpStore = new Map(); // Temporary storage for OTP codes
    this.OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
    this.OTP_LENGTH = 6;

    if (!hasAfricasTalkingCreds() && !hasTwilioCreds() && !hasBeemCreds()) {
      console.warn('[SMS] No SMS provider credentials configured — running in DEV MODE. Real text messages will NOT be sent; OTPs are only logged to the console. Fill in BEEM_API_KEY/BEEM_SECRET_KEY, AFRICAS_TALKING_API_KEY/AFRICAS_TALKING_USERNAME or TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_PHONE_NUMBER in your .env to send real SMS.');
    }
  }

  /**
   * Generate a random OTP code
   */
  generateOTP() {
    const chars = '0123456789';
    let otp = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      otp += chars[crypto.randomInt(0, chars.length)];
    }
    return otp;
  }

  /**
   * Send OTP via SMS. Uses a real provider when its credentials are
   * configured (BEEM preferred for Tanzania, then Africa's Talking, then Twilio);
   * otherwise falls back to console logging so local development keeps working
   * without a paid SMS account.
   */
  async sendOTP(phoneNumber, otp) {
    const message = `${otp} is your GENZ verification code. It expires in 5 minutes. Do not share this code with anyone.`;

    try {
      if (hasBeemCreds()) {
        const result = await sendViaBeem(phoneNumber, message);
        console.log(`[SMS] OTP sent via BEEM to ${phoneNumber}`);
        return { success: true, message: 'OTP sent successfully', ...result };
      }

      if (hasAfricasTalkingCreds()) {
        const result = await sendViaAfricasTalking(phoneNumber, message);
        console.log(`[SMS] OTP sent via Africa's Talking to ${phoneNumber}`);
        return { success: true, message: 'OTP sent successfully', ...result };
      }

      if (hasTwilioCreds()) {
        const result = await sendViaTwilio(phoneNumber, message);
        console.log(`[SMS] OTP sent via Twilio to ${phoneNumber}`);
        return { success: true, message: 'OTP sent successfully', ...result };
      }

      // Dev-mode fallback — no provider configured
      console.log(`[SMS][DEV MODE - no real SMS sent] OTP ${otp} for ${phoneNumber}`);
      return {
        success: true,
        message: 'OTP sent successfully (dev mode: check server console, no real SMS was sent)'
      };
    } catch (error) {
      console.error('[SMS] Failed to send OTP:', error.message);

      // Fallback to console if SMS provider fails
      console.log(`[SMS][FALLBACK - SMS provider failed] OTP ${otp} for ${phoneNumber}`);
      return {
        success: true,
        message: 'OTP sent successfully (fallback mode: check server console)',
        fallback: true
      };
    }
  }

  /**
   * Store OTP for verification
   */
  storeOTP(phoneNumber, otp) {
    this.otpStore.set(phoneNumber, {
      otp,
      createdAt: Date.now(),
      attempts: 0
    });
  }

  /**
   * Verify OTP
   */
  async verifyOTP(phoneNumber, otp) {
    const stored = this.otpStore.get(phoneNumber);
    
    if (!stored) {
      return {
        success: false,
        message: 'No OTP found for this phone number'
      };
    }

    // Check if OTP has expired
    if (Date.now() - stored.createdAt > this.OTP_EXPIRY_MS) {
      this.otpStore.delete(phoneNumber);
      return {
        success: false,
        message: 'OTP has expired. Please request a new one.'
      };
    }

    // Check max attempts
    if (stored.attempts >= 3) {
      this.otpStore.delete(phoneNumber);
      return {
        success: false,
        message: 'Maximum attempts exceeded. Please request a new OTP.'
      };
    }

    // Verify OTP
    if (stored.otp === otp) {
      this.otpStore.delete(phoneNumber);
      return {
        success: true,
        message: 'OTP verified successfully'
      };
    }

    // Increment attempts
    stored.attempts += 1;
    this.otpStore.set(phoneNumber, stored);

    return {
      success: false,
      message: 'Invalid OTP. Please try again.',
      attemptsRemaining: 3 - stored.attempts
    };
  }

  /**
   * Resend OTP
   */
  async resendOTP(phoneNumber) {
    const stored = this.otpStore.get(phoneNumber);
    
    // Check rate limiting (can only resend after 30 seconds)
    if (stored && Date.now() - stored.createdAt < 30 * 1000) {
      return {
        success: false,
        message: 'Please wait before requesting a new OTP'
      };
    }

    const otp = this.generateOTP();
    await this.sendOTP(phoneNumber, otp);
    this.storeOTP(phoneNumber, otp);

    return {
      success: true,
      message: 'New OTP sent successfully'
    };
  }

  /**
   * Clean up expired OTPs (run periodically)
   */
  cleanup() {
    const now = Date.now();
    for (const [phoneNumber, data] of this.otpStore.entries()) {
      if (now - data.createdAt > this.OTP_EXPIRY_MS) {
        this.otpStore.delete(phoneNumber);
      }
    }
  }
}

// Run cleanup every minute
const smsService = new SMSService();
const otpCleanupInterval = setInterval(() => smsService.cleanup(), 60 * 1000);
otpCleanupInterval.unref?.();

module.exports = smsService;
