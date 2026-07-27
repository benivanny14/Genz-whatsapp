// Environment validation utility.
// Production must fail closed here so insecure defaults never reach runtime.

const PLACEHOLDER_PATTERNS = [
  /^change-this/i,
  /^your-/i,
  /change-me/i,
  /development-secret/i,
  /example\.com/i
];

const isProduction = () => process.env.NODE_ENV === 'production';

const hasValue = (key) => {
  const value = process.env[key];
  return typeof value === 'string' && value.trim() !== '';
};

const isPlaceholder = (value = '') => PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(String(value).trim()));

const validateUrl = (errors, key, { requireHttps = false } = {}) => {
  if (!hasValue(key)) return;

  try {
    const parsed = new URL(process.env[key]);
    if (requireHttps && parsed.protocol !== 'https:') {
      errors.push({ key, description: `${key} must use HTTPS in production` });
    }
  } catch {
    errors.push({ key, description: `${key} must be a valid URL` });
  }
};

const validateSecret = (errors, key, { minLength = 32 } = {}) => {
  if (!hasValue(key)) return;

  const value = process.env[key].trim();
  if (value.length < minLength || isPlaceholder(value)) {
    errors.push({
      key,
      description: `${key} must be a real secret with at least ${minLength} characters`
    });
  }
};

const getProductionRequirements = () => {
  const requirements = [
    ['FRONTEND_URL', 'Frontend origin for CORS'],
    ['PUBLIC_API_URL', 'Public backend URL for generated media/callback URLs'],
    ['ADMIN_BOOTSTRAP_TOKEN', 'One-time token used to create or recover the first admin account'],
    ['JWT_REFRESH_SECRET', 'JWT refresh token secret'],
    ['BACKUP_ENCRYPTION_KEY', 'Backup encryption key'],
    ['MESSAGE_ENCRYPTION_SECRET', 'Legacy message encryption key until all chats use E2EE'],
    ['SMTP_HOST', 'SMTP host for verification/reset emails'],
    ['SMTP_USER', 'SMTP username'],
    ['SMTP_PASS', 'SMTP password']
  ];

  if (process.env.ALLOW_REAL_PAYMENT_PROVIDERS === 'true') {
    requirements.push(
      ['MPESA_CONSUMER_KEY', 'M-Pesa Consumer Key'],
      ['MPESA_CONSUMER_SECRET', 'M-Pesa Consumer Secret'],
      ['MPESA_PASSKEY', 'M-Pesa Passkey'],
      ['MPESA_SHORTCODE', 'M-Pesa Shortcode'],
      ['MPESA_WEBHOOK_SECRET', 'M-Pesa Webhook Secret'],
      ['AIRTEL_CLIENT_ID', 'Airtel Client ID'],
      ['AIRTEL_CLIENT_SECRET', 'Airtel Client Secret'],
      ['AIRTEL_WEBHOOK_SECRET', 'Airtel Webhook Secret'],
      ['YAS_API_KEY', 'Yas API Key'],
      ['YAS_MERCHANT_ID', 'Yas Merchant ID'],
      ['YAS_SECRET_KEY', 'Yas Secret Key'],
      ['YAS_WEBHOOK_SECRET', 'Yas Webhook Secret'],
      ['HALOPESA_API_KEY', 'HaloPesa API Key'],
      ['HALOPESA_MERCHANT_ID', 'HaloPesa Merchant ID'],
      ['HALOPESA_SECRET_KEY', 'HaloPesa Secret Key'],
      ['HALOPESA_WEBHOOK_SECRET', 'HaloPesa Webhook Secret']
    );
  }

  return requirements;
};

const validateEnv = () => {
  const missingRequired = [];
  const invalidValues = [];
  const warnings = [];

  const requiredEnvVars = [
    ['PORT', 'Server port'],
    ['MONGODB_URI', 'MongoDB connection string'],
    ['JWT_SECRET', 'JWT access token secret'],
    ['JWT_EXPIRE', 'JWT access token expiration'],
    ['NODE_ENV', 'Node environment']
  ];

  if (isProduction()) {
    requiredEnvVars.push(...getProductionRequirements());
  } else if (process.env.NODE_ENV !== 'test') {
    [
      'FRONTEND_URL',
      'PUBLIC_API_URL',
      'JWT_REFRESH_SECRET',
      'SMTP_HOST',
      'VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
      'CLOUDINARY_CLOUD_NAME'
    ].forEach((key) => {
      if (!hasValue(key)) warnings.push({ key, description: `${key} is not configured` });
    });
  }

  for (const [key, description] of requiredEnvVars) {
    if (!hasValue(key)) {
      missingRequired.push({ key, description });
    }
  }

  const validEnvironments = ['development', 'production', 'test'];
  if (process.env.NODE_ENV && !validEnvironments.includes(process.env.NODE_ENV)) {
    invalidValues.push({
      key: 'NODE_ENV',
      description: `NODE_ENV must be one of: ${validEnvironments.join(', ')}`
    });
  }

  if (hasValue('PORT')) {
    const port = Number(process.env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      invalidValues.push({ key: 'PORT', description: 'PORT must be a number between 1 and 65535' });
    }
  }

  validateSecret(invalidValues, 'JWT_SECRET', { minLength: isProduction() ? 32 : 16 });
  if (hasValue('JWT_REFRESH_SECRET')) {
    validateSecret(invalidValues, 'JWT_REFRESH_SECRET', { minLength: isProduction() ? 32 : 16 });
  }
  if (hasValue('ADMIN_BOOTSTRAP_TOKEN')) {
    validateSecret(invalidValues, 'ADMIN_BOOTSTRAP_TOKEN', { minLength: isProduction() ? 32 : 16 });
  }
  if (hasValue('MESSAGE_ENCRYPTION_SECRET')) {
    validateSecret(invalidValues, 'MESSAGE_ENCRYPTION_SECRET', { minLength: isProduction() ? 32 : 16 });
  }
  if (
    isProduction() &&
    hasValue('JWT_SECRET') &&
    hasValue('JWT_REFRESH_SECRET') &&
    process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET
  ) {
    invalidValues.push({
      key: 'JWT_REFRESH_SECRET',
      description: 'JWT_REFRESH_SECRET must be different from JWT_SECRET in production'
    });
  }

  validateUrl(invalidValues, 'FRONTEND_URL', { requireHttps: isProduction() });
  validateUrl(invalidValues, 'PUBLIC_API_URL', { requireHttps: isProduction() });

  if (isProduction() && process.env.ALLOW_ANONYMOUS_DEVICE_AUTH === 'true') {
    warnings.push({
      key: 'ALLOW_ANONYMOUS_DEVICE_AUTH',
      description: 'Anonymous device auth is enabled in production; disable it before real users'
    });
  }

  if (isProduction() && !hasValue('TURN_SERVER_URL')) {
    warnings.push({
      key: 'TURN_SERVER_URL',
      description: 'TURN server is not configured; voice/video calls may fail behind NAT/firewalls'
    });
  } else if (isProduction() && hasValue('TURN_SERVER_URL')) {
    const { validateTurnConfig } = require('../config/webrtc');
    const turnCheck = validateTurnConfig();
    turnCheck.errors.forEach((message) => {
      warnings.push({ key: 'TURN_SERVER_URL', description: message });
    });
  }

  if (isProduction() && process.env.ALLOW_MOCK_PAYMENTS === 'true') {
    invalidValues.push({
      key: 'ALLOW_MOCK_PAYMENTS',
      description: 'Mock payments cannot be enabled in production'
    });
  }

  if (missingRequired.length > 0 || invalidValues.length > 0) {
    console.error('\nCRITICAL: Environment validation failed:\n');
    [...missingRequired, ...invalidValues].forEach(({ key, description }) => {
      console.error(`  - ${key}: ${description}`);
    });
    console.error('\nFix the environment before starting the server.\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('\nWARNING: Optional production capability checks:\n');
    warnings.forEach(({ key, description }) => {
      console.warn(`  - ${key}: ${description}`);
    });
    console.warn('');
  }

  console.log(`Environment validation passed (${process.env.NODE_ENV || 'development'})\n`);

  return {
    missingRequired,
    invalidValues,
    warnings
  };
};

module.exports = validateEnv;
