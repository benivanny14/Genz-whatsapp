const express = require('express');
const router = express.Router();
const {
  requestRegisterOTP,
  verifyRegisterOTP,
  requestLoginOTP,
  verifyLoginOTP,
  resendOTP,
  checkPhoneStatus
} = require('../controllers/otpController');
const rateLimit = require('express-rate-limit');

// Rate limiting for OTP endpoints to prevent abuse
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again later.'
  }
});

// Apply rate limiting to all OTP routes
router.use(otpLimiter);

// Registration flow
router.post('/request-register', requestRegisterOTP);
router.post('/verify-register', verifyRegisterOTP);

// Login flow
router.post('/request-login', requestLoginOTP);
router.post('/verify-login', verifyLoginOTP);

// Resend OTP
router.post('/resend', resendOTP);

// Check phone number status
router.post('/check-phone', checkPhoneStatus);

module.exports = router;