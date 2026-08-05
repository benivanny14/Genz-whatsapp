const { body, validationResult } = require('express-validator');

// Consistent error response for express-validator failures
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

const PHONE_RE = /^[+\d][\d\s()-]{6,20}$/;
const USERNAME_RE = /^[A-Za-z0-9_.-]{3,30}$/;
const PASSWORD_STRENGTH_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const registerValidators = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(USERNAME_RE).withMessage('Username may only contain letters, numbers, dots, dashes and underscores'),
  body('phoneNumber')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(PHONE_RE).withMessage('Invalid phone number format'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(PASSWORD_STRENGTH_RE).withMessage('Password must include uppercase, lowercase, number, and special character'),
  handleValidationErrors
];

const loginValidators = [
  body('password')
    .isString().withMessage('Invalid password format')
    .notEmpty().withMessage('Password is required'),
  body('identifier')
    .optional({ nullable: true })
    .isString().withMessage('Invalid login identifier'),
  body('phoneNumber')
    .optional({ nullable: true })
    .isString().withMessage('Invalid phone number'),
  body('username')
    .optional({ nullable: true })
    .isString().withMessage('Invalid username'),
  body('twoFactorToken')
    .optional({ nullable: true })
    .isString().withMessage('Invalid 2FA token'),
  (req, res, next) => {
    const { identifier, phoneNumber, username } = req.body;
    if (!identifier && !phoneNumber && !username) {
      return res.status(400).json({ success: false, message: 'Login identifier and password are required' });
    }
    next();
  }
];

const checkAvailabilityValidators = [
  body('phoneNumber')
    .optional({ nullable: true })
    .trim()
    .isString().withMessage('Invalid phone number')
    .matches(PHONE_RE).withMessage('Invalid phone number format'),
  body('username')
    .optional({ nullable: true })
    .trim()
    .matches(USERNAME_RE).withMessage('Username must be 3-30 characters (letters, numbers, dots, dashes, underscores)'),
  (req, res, next) => {
    if (!req.body.phoneNumber && !req.body.username) {
      return res.status(400).json({ success: false, message: 'Provide a username or phone number to check' });
    }
    next();
  }
];

module.exports = {
  registerValidators,
  loginValidators,
  checkAvailabilityValidators,
  handleValidationErrors
};
