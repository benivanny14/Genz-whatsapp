/**
 * SMS Service for OTP verification
 * In production, integrate with actual SMS providers like:
 * - Twilio
 * - Africa's Talking
 * - Nexmo/Vonage
 * - Local Tanzanian providers
 */

const crypto = require('crypto');

class SMSService {
  constructor() {
    this.otpStore = new Map(); // Temporary storage for OTP codes
    this.OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
    this.OTP_LENGTH = 6;
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
   * Send OTP via SMS
   * In production, replace this with actual SMS API calls
   */
  async sendOTP(phoneNumber, otp) {
    console.log(`[SMS] Sending OTP ${otp} to ${phoneNumber}`);
    
    // In production, integrate with SMS provider:
    // - Africa's Talking: https://africastalking.com/
    // - Twilio: https://twilio.com/
    // - Local providers
    
    // For development, we'll log the OTP
    // In production, this would make an API call to SMS provider
    
    return {
      success: true,
      message: 'OTP sent successfully (check console in development)'
    };
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
setInterval(() => smsService.cleanup(), 60 * 1000);

module.exports = smsService;