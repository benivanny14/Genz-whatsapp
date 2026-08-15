#!/usr/bin/env node
/**
 * Shared Render environment configuration for GENZ WhatsApp.
 *
 * Tiers:
 *  - REQUIRED    : the server fails closed in production without these
 *                  (see backend/utils/validateEnv.js + backend/config/secrets.js).
 *  - RECOMMENDED : strongly advised before onboarding real users (media,
 *                  push notifications, payments, OTP, Redis).
 *  - OPTIONAL    : used only when the corresponding feature is enabled.
 *
 * Every entry supports:
 *  - value     : fixed default applied when nothing is set locally
 *  - generate  : generate a strong random secret when missing/placeholder
 *  - generateVapid : generate a VAPID key pair (both keys together)
 *  - required  : hard error when missing locally (e.g. MONGODB_URI)
 */
const crypto = require('crypto');

const PLACEHOLDER_RE = /change-me|changeme|your_|your-|example\.com/i;

const isPlaceholder = (v) => typeof v === 'string' && PLACEHOLDER_RE.test(v);

const randomSecret = () => crypto.randomBytes(48).toString('hex');

// VAPID key pair in the format web-push expects: EC P-256, public key is the
// 65-byte uncompressed point, private key 32 bytes — both base64url encoded.
function generateVapidKeys() {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  return {
    publicKey: ecdh.getPublicKey().toString('base64url'),
    privateKey: ecdh.getPrivateKey().toString('base64url')
  };
}

const REQUIRED = {
  NODE_ENV: { value: 'production', force: true, desc: 'Environment (must be production)' },
  PORT: { value: '5000', force: true, desc: 'Server port' },
  JWT_EXPIRE: { value: '7d', force: true, desc: 'Access token lifetime' },
  MONGODB_URI: { required: true, desc: 'MongoDB Atlas connection string' },
  JWT_SECRET: { generate: true, desc: 'JWT access token secret' },
  JWT_REFRESH_SECRET: { generate: true, desc: 'JWT refresh token secret (must differ from JWT_SECRET)' },
  ADMIN_JWT_SECRET: { generate: true, desc: 'Admin JWT secret' },
  ADMIN_BOOTSTRAP_TOKEN: { generate: true, desc: 'One-time admin bootstrap token' },
  BACKUP_ENCRYPTION_KEY: { generate: true, desc: 'Backup encryption key' },
  MESSAGE_ENCRYPTION_SECRET: { generate: true, desc: 'Message encryption secret' },
  FRONTEND_URL: { value: 'https://genz-whatsapp-1.onrender.com', desc: 'Frontend origin (CORS/CSRF allowlist)' },
  PUBLIC_API_URL: { value: 'https://genz-whatsapp-1.onrender.com', desc: 'Public API URL (media links, callbacks)' },
  // Cloudinary is REQUIRED in production: without it the server refuses to
  // start (validateEnv fails closed) because media would be stored on the
  // local ephemeral disk and silently LOST on every redeploy.
  CLOUDINARY_CLOUD_NAME: { required: true, desc: 'Cloudinary cloud name (media storage — REQUIRED, server will not start without it)' },
  CLOUDINARY_API_KEY: { required: true, desc: 'Cloudinary API key (REQUIRED)' },
  CLOUDINARY_API_SECRET: { required: true, desc: 'Cloudinary API secret (REQUIRED)' }
};

const RECOMMENDED = {
  VAPID_PUBLIC_KEY: { generateVapid: true, desc: 'Web Push public key' },
  VAPID_PRIVATE_KEY: { generateVapid: true, desc: 'Web Push private key' },
  VAPID_SUBJECT: { value: 'mailto:admin@genz-whatsapp.com', desc: 'Web Push contact' },
  REDIS_URL: { desc: 'Redis URL (distributed sockets + presence)' },
  REDIS_PASSWORD: { desc: 'Redis password (optional)' },
  MANUAL_PAYMENT_RECEIVER_NAME: { desc: 'Mobile-money receiver name shown to users' },
  MANUAL_PAYMENT_RECEIVER_NUMBER: { desc: 'Mobile-money receiver number (do NOT ship the hardcoded default)' },
  // OFF until WhatsApp OTP delivery is configured. Verification ON + no
  // delivery channel = every new registration locked out (OTP never sent).
  PHONE_VERIFICATION_REQUIRED: { value: 'false', desc: 'Require OTP phone verification (keep OFF until WhatsApp OTP delivery is configured)' },
  ALLOW_ANONYMOUS_DEVICE_AUTH: { value: 'false', desc: 'Block anonymous device auth in prod' },
  ALLOW_MOCK_PAYMENTS: { value: 'false', desc: 'Block mock payments in prod' },
  ADMIN_BASE_PATH: { value: '/api/system-gateway-x9k', desc: 'Obscure admin base path' },
  RP_ID: { desc: 'Passkey relying-party domain (e.g. genz-whatsapp-1.onrender.com)' },
  WHATSAPP_OTP_ENABLED: { value: 'false', desc: 'Deliver OTPs via WhatsApp' },
  WHATSAPP_OTP_PROVIDER: { value: 'cloud-api', desc: 'whatsapp-web (risky, ban-prone) or cloud-api (recommended)' },
  WHATSAPP_OTP_COUNTRY_CODE: { value: '255', desc: 'Default country code for OTP numbers' },
  WHATSAPP_CLOUD_API_ACCESS_TOKEN: { desc: 'Meta WhatsApp Business Cloud API token' },
  WHATSAPP_CLOUD_API_PHONE_NUMBER_ID: { desc: 'Meta WhatsApp Business phone number ID' },
  WHATSAPP_CLOUD_API_VERSION: { value: 'v21.0', desc: 'Meta Graph API version' },
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: { generate: true, desc: 'Meta WhatsApp webhook verify token (paste the same value into the Meta dashboard Webhook fields)' }
};

const OPTIONAL = {
  SENTRY_DSN: { desc: 'Sentry error tracking DSN' },
  SENTRY_TRACES_SAMPLE_RATE: { value: '0.1', desc: 'Sentry trace sample rate' },
  SENTRY_PROFILES_SAMPLE_RATE: { value: '0.1', desc: 'Sentry profile sample rate' },
  FIREBASE_PROJECT_ID: { desc: 'Firebase project id (FCM push)' },
  FIREBASE_CLIENT_EMAIL: { desc: 'Firebase service account email' },
  FIREBASE_PRIVATE_KEY: { desc: 'Firebase private key' },
  FIREBASE_PRIVATE_KEY_ID: { desc: 'Firebase private key id' },
  FIREBASE_CLIENT_ID: { desc: 'Firebase client id' },
  GIPHY_API_KEY: { desc: 'Giphy API key (GIF search)' },
  MONGO_MAX_POOL_SIZE: { value: '20', desc: 'MongoDB max pool size' },
  MONGO_MIN_POOL_SIZE: { value: '0', desc: 'MongoDB min pool size' },
  LOG_LEVEL: { value: 'info', desc: 'Winston log level' },
  MAX_UPLOAD_BYTES: { value: '104857600', desc: 'Max upload size in bytes' },
  JSON_BODY_LIMIT: { value: '2mb', desc: 'JSON body limit' },
  FORM_BODY_LIMIT: { value: '2mb', desc: 'Form body limit' },
  TRUST_PROXY: { value: '1', desc: 'Express trust proxy' },
  WEBHOOK_IP_WHITELIST: { desc: 'Webhook IP allowlist (comma separated)' },
  ADMIN_IP_ALLOWLIST: { desc: 'Admin panel IP allowlist (comma separated)' },
  JWT_REFRESH_EXPIRES_IN: { value: '30d', desc: 'Refresh token lifetime' },
  SMTP_HOST: { desc: 'SMTP host for alert emails (e.g. smtp.gmail.com)' },
  SMTP_PORT: { value: '587', desc: 'SMTP port' },
  SMTP_USER: { desc: 'SMTP username' },
  SMTP_PASS: { desc: 'SMTP password' },
  SMTP_FROM: { desc: 'SMTP from address' },
  AWS_ACCESS_KEY_ID: { desc: 'AWS access key (S3 backups)' },
  AWS_SECRET_ACCESS_KEY: { desc: 'AWS secret key (S3 backups)' },
  AWS_REGION: { value: 'us-east-1', desc: 'AWS region (S3 backups)' },
  S3_BUCKET_NAME: { desc: 'S3 bucket (backups)' },
  MEDIA_ACCESS_SECRET: { desc: 'Media signed-URL secret (optional; auto-signed fallback exists)' },
  REQUIRE_MEDIA_SIGNATURE: { value: 'false', desc: 'Require signed media URLs' },
  MEDIA_URL_TTL_SECONDS: { value: '3600', desc: 'Signed media URL TTL' },
  BACKUP_SCHEDULE: { value: '0 0 * * *', desc: 'Backup cron schedule' },
  PUSH_MAX_RETRIES: { value: '3', desc: 'Push delivery retries' }
};

/**
 * Build the final env map from a local .env + generation + defaults.
 * Shared by setup-render-env.js and export-render-env.js.
 * Returns { env, generated, warnings, errors }.
 *
 * Options:
 *  - overrideMongodbUri : supply the production Atlas URI explicitly instead
 *    of the local .env value (e.g. when backend/.env has a localhost URI).
 */
function buildEnv(envPath, options = {}) {
  const fs = require('fs');

  const parseEnvFile = (filePath) => {
    const out = {};
    if (!fs.existsSync(filePath)) return out;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
    return out;
  };

  const local = parseEnvFile(envPath);
  const env = {};
  const generated = [];
  const warnings = [];
  const errors = [];
  let vapidPair = null;

  // Dev-host guard: production must never inherit localhost/dev URLs or a
  // local MongoDB URI from the developer's .env.
  const isDevHost = (v) => /localhost|127\.0\.0\.1/.test(String(v || ''));

  const pick = (key, cfg) => {
    const localValue = local[key];

    // --override-mongodb-uri: explicitly supply the production URI instead of
    // the local value (or a missing one). Refuse dev hosts here too — the
    // point of the flag is to push a REAL Atlas connection string.
    if (key === 'MONGODB_URI' && options.overrideMongodbUri) {
      if (isDevHost(options.overrideMongodbUri)) {
        errors.push(`MONGODB_URI: --override-mongodb-uri points to a dev host (${options.overrideMongodbUri}) — refusing`);
        return;
      }
      env[key] = options.overrideMongodbUri;
      if (localValue && localValue !== options.overrideMongodbUri) {
        warnings.push(`MONGODB_URI: overriding local value (${localValue}) with --override-mongodb-uri`);
      }
      return;
    }

    // Production constants — never take dev values for these.
    if (cfg.force) {
      env[key] = cfg.value;
      return;
    }

    // URL keys with a production default: reject localhost dev values.
    if (cfg.value !== undefined && localValue && isDevHost(localValue)) {
      warnings.push(`${key}: local .env uses a dev host (${localValue}) — using production default ${cfg.value}`);
      env[key] = cfg.value;
      return;
    }

    if (localValue && !isPlaceholder(localValue)) {
      if (cfg.required && isDevHost(localValue)) {
        errors.push(`${key}: points to a local/dev MongoDB (${localValue}) — set your Atlas connection string`);
        return;
      }
      env[key] = localValue;
      return;
    }
    if (localValue && isPlaceholder(localValue)) {
      warnings.push(`${key}: local .env value looks like a placeholder — overriding with a generated/default value`);
    }
    if (cfg.generate) {
      const secret = randomSecret();
      env[key] = secret;
      generated.push([key, secret]);
      return;
    }
    if (cfg.generateVapid) {
      if (!vapidPair) vapidPair = generateVapidKeys();
      const part = key === 'VAPID_PUBLIC_KEY' ? 'publicKey' : 'privateKey';
      env[key] = vapidPair[part];
      if (key === 'VAPID_PUBLIC_KEY') {
        generated.push(['VAPID_PUBLIC_KEY', vapidPair.publicKey], ['VAPID_PRIVATE_KEY', vapidPair.privateKey]);
      }
      return;
    }
    if (cfg.value !== undefined) {
      env[key] = cfg.value;
      return;
    }
    if (cfg.required) {
      errors.push(`${key}: REQUIRED but missing locally — set it in backend/.env first`);
      return;
    }
    if (RECOMMENDED[key]) {
      warnings.push(`${key}: not set — ${cfg.desc}`);
    }
  };

  for (const [key, cfg] of Object.entries(REQUIRED)) pick(key, cfg);
  for (const [key, cfg] of Object.entries(RECOMMENDED)) pick(key, cfg);
  for (const [key, cfg] of Object.entries(OPTIONAL)) {
    const localValue = local[key];
    if (localValue && !isPlaceholder(localValue)) env[key] = localValue;
    else if (cfg.value !== undefined) env[key] = cfg.value;
  }

  if (env.JWT_REFRESH_SECRET && env.JWT_SECRET && env.JWT_REFRESH_SECRET === env.JWT_SECRET) {
    errors.push('JWT_REFRESH_SECRET must differ from JWT_SECRET in production');
  }

  // Fail closed: phone verification ON with no OTP delivery channel silently
  // locks every new registration out (OTP is stored but never sent, and is
  // not echoed in production responses). Only WHATSAPP_OTP_RETURN_IN_RESPONSE
  // is an (insecure, dev-only) escape hatch.
  if (
    env.PHONE_VERIFICATION_REQUIRED === 'true' &&
    env.WHATSAPP_OTP_ENABLED !== 'true' &&
    env.WHATSAPP_OTP_RETURN_IN_RESPONSE !== 'true'
  ) {
    errors.push(
      'PHONE_VERIFICATION_REQUIRED=true needs an OTP delivery channel: set WHATSAPP_OTP_ENABLED=true (with WHATSAPP_CLOUD_API_* credentials) or set PHONE_VERIFICATION_REQUIRED=false'
    );
  } else if (
    env.PHONE_VERIFICATION_REQUIRED === 'true' &&
    env.WHATSAPP_OTP_RETURN_IN_RESPONSE === 'true' &&
    env.WHATSAPP_OTP_ENABLED !== 'true'
  ) {
    warnings.push(
      'PHONE_VERIFICATION_REQUIRED=true is served by WHATSAPP_OTP_RETURN_IN_RESPONSE — OTPs are exposed in API responses; configure real WhatsApp delivery before launch'
    );
  }
  for (const [key, value] of Object.entries(env)) {
    if (isPlaceholder(value)) {
      errors.push(`${key}: placeholder value would be pushed to production — fix backend/.env first`);
    }
  }

  return { env, generated, warnings, errors };
}

module.exports = {
  REQUIRED,
  RECOMMENDED,
  OPTIONAL,
  ALL_KEYS: { ...REQUIRED, ...RECOMMENDED, ...OPTIONAL },
  randomSecret,
  generateVapidKeys,
  isPlaceholder,
  buildEnv
};
