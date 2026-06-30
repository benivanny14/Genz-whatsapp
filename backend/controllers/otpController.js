const smsService = require('../services/smsService');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'genz-development-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const signToken = (user) => jwt.sign(
  {
    id: user._id.toString(),
    role: user.role || (user.isAdmin ? 'admin' : 'user'),
    typ: 'access'
  },
  JWT_SECRET,
  { expiresIn: JWT_EXPIRES_IN }
);

/**
 * Request OTP for registration
 * POST /api/otp/request-register
 * Body: { phoneNumber }
 */
exports.requestRegisterOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Validate phone number format (Tanzanian format)
    const phoneRegex = /^(\+255|255|0)?[67][5-9]\d{7}$/;
    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    
    if (!phoneRegex.test(normalizedPhone) && !phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use format like: 07XX XXX XXX or +255 7XX XXX XXX'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ phoneNumber: normalizedPhone });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered. Please login instead.'
      });
    }

    // Generate and send OTP
    const otp = smsService.generateOTP();
    await smsService.sendOTP(normalizedPhone, otp);
    smsService.storeOTP(normalizedPhone, otp);

    console.log(`[OTP] Registration OTP sent to ${normalizedPhone}`);

    res.json({
      success: true,
      message: 'OTP sent successfully. Please enter the code to complete registration.',
      phoneNumber: normalizedPhone
    });
  } catch (error) {
    console.error('[OTP] Request register OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

/**
 * Verify OTP for registration and create account
 * POST /api/otp/verify-register
 * Body: { phoneNumber, otp, username, password }
 */
exports.verifyRegisterOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, username, password } = req.body;

    if (!phoneNumber || !otp || !username || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: phoneNumber, otp, username, password'
      });
    }

    // Verify OTP first
    const verificationResult = await smsService.verifyOTP(phoneNumber, otp);
    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // Check if user already exists (race condition protection)
    const existingUser = await User.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'This phone number is already registered. Please login instead.'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Create new user
    const user = new User({
      username: username.trim(),
      phoneNumber: phoneNumber,
      status: 'offline'
    });

    await user.setPassword(password);
    await user.save();

    // Generate JWT token
    const token = signToken(user);

    console.log(`[OTP] User registered successfully: ${user._id}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error('[OTP] Verify register OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
};

/**
 * Request OTP for login
 * POST /api/otp/request-login
 * Body: { phoneNumber }
 */
exports.requestLoginOTP = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    // Check if user exists
    const user = await User.findOne({ phoneNumber: normalizedPhone });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'This account is blocked. Please contact support.'
      });
    }

    // Generate and send OTP
    const otp = smsService.generateOTP();
    await smsService.sendOTP(normalizedPhone, otp);
    smsService.storeOTP(normalizedPhone, otp);

    console.log(`[OTP] Login OTP sent to ${normalizedPhone}`);

    res.json({
      success: true,
      message: 'OTP sent successfully. Please enter the code to login.',
      phoneNumber: normalizedPhone
    });
  } catch (error) {
    console.error('[OTP] Request login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send OTP. Please try again.'
    });
  }
};

/**
 * Verify OTP for login
 * POST /api/otp/verify-login
 * Body: { phoneNumber, otp, password }
 */
exports.verifyLoginOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, password } = req.body;

    if (!phoneNumber || !otp || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: phoneNumber, otp, password'
      });
    }

    // Find user
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check account lockout
    if (user.isAccountLocked) {
      const lockMinutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account temporarily locked. Try again in ${lockMinutes} minute(s).`
      });
    }

    // Verify password first
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      await user.incLoginAttempts();
      const remaining = Math.max(0, 5 - (user.failedLoginAttempts + 1));
      
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
        ...(remaining <= 2 && remaining > 0 ? { warning: `${remaining} attempt(s) remaining` } : {})
      });
    }

    // Verify OTP
    const verificationResult = await smsService.verifyOTP(phoneNumber, otp);
    if (!verificationResult.success) {
      return res.status(400).json(verificationResult);
    }

    // Reset login attempts
    if (user.failedLoginAttempts > 0) {
      await user.resetLoginAttempts();
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate JWT token
    const token = signToken(user);

    console.log(`[OTP] User logged in successfully: ${user._id}`);

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: user.toSafeJSON()
    });
  } catch (error) {
    console.error('[OTP] Verify login OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed. Please try again.'
    });
  }
};

/**
 * Resend OTP
 * POST /api/otp/resend
 * Body: { phoneNumber, type: 'register' | 'login' }
 */
exports.resendOTP = async (req, res) => {
  try {
    const { phoneNumber, type } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    if (type === 'register') {
      // Check if user already exists
      const existingUser = await User.findOne({ phoneNumber });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'This phone number is already registered. Please login instead.'
        });
      }
    } else if (type === 'login') {
      // Check if user exists
      const user = await User.findOne({ phoneNumber });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found. Please register first.'
        });
      }
    }

    const result = await smsService.resendOTP(phoneNumber);
    
    res.json(result);
  } catch (error) {
    console.error('[OTP] Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP. Please try again.'
    });
  }
};

/**
 * Check phone number status
 * POST /api/otp/check-phone
 * Body: { phoneNumber }
 */
exports.checkPhoneStatus = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, '');
    const user = await User.findOne({ phoneNumber: normalizedPhone });

    res.json({
      success: true,
      exists: !!user,
      message: user ? 'Phone number is registered' : 'Phone number is not registered'
    });
  } catch (error) {
    console.error('[OTP] Check phone status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check phone number'
    });
  }
};