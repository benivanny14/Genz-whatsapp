#!/usr/bin/env node
/**
 * Genz Messenger — Production Readiness Checker
 *
 * Validates that all required environment variables, services, and configurations
 * are in place before deploying to production.
 *
 * Usage:
 *   node scripts/production-readiness-check.js              # local check (reads backend/.env)
 *   node scripts/production-readiness-check.js --remote     # production check (hits /api/health)
 *   node scripts/production-readiness-check.js --fix        # auto-fix what's safe
 *   node scripts/production-readiness-check.js --json       # machine-readable output
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const BACKEND_ENV = path.join(ROOT, 'backend', '.env');

// ── Tiers ──────────────────────────────────────────
const REQUIRED = [
  { key: 'JWT_SECRET', min: 32, desc: 'Access token signing key' },
  { key: 'JWT_REFRESH_SECRET', min: 32, desc: 'Refresh token signing key (must differ from JWT_SECRET)' },
  { key: 'ADMIN_BOOTSTRAP_TOKEN', min: 32, desc: 'Admin panel bootstrap token' },
  { key: 'BACKUP_ENCRYPTION_KEY', min: 32, desc: 'Chat backup encryption key' },
  { key: 'MESSAGE_ENCRYPTION_SECRET', min: 32, desc: 'Message at-rest encryption key' },
  { key: 'FRONTEND_URL', desc: 'Production frontend URL (https://...)' },
  { key: 'PUBLIC_API_URL', desc: 'Production backend URL (https://...)' },
  { key: 'MONGODB_URI', desc: 'MongoDB connection string (not localhost in prod)' },
  { key: 'CLOUDINARY_CLOUD_NAME', desc: 'Cloudinary cloud name for media storage' },
  { key: 'CLOUDINARY_API_KEY', desc: 'Cloudinary API key' },
  { key: 'CLOUDINARY_API_SECRET', desc: 'Cloudinary API secret' },
];

const STRONGLY_RECOMMENDED = [
  { key: 'REDIS_URL', desc: 'Redis URL for scaling + presence' },
  { key: 'SMTP_HOST', desc: 'SMTP host for password reset emails' },
  { key: 'SMTP_USER', desc: 'SMTP username' },
  { key: 'SMTP_PASS', desc: 'SMTP password' },
  { key: 'VAPID_PUBLIC_KEY', desc: 'Web Push VAPID public key' },
  { key: 'VAPID_PRIVATE_KEY', desc: 'Web Push VAPID private key' },
];

const SECURITY_CHECKS = [
  { key: 'ALLOW_ANONYMOUS_DEVICE_AUTH', expected: 'false', desc: 'Must be false in production' },
  { key: 'ALLOW_MOCK_PAYMENTS', expected: 'false', desc: 'Must be false in production' },
  { key: 'PHONE_VERIFICATION_REQUIRED', expected: null, desc: 'Phone OTP verification (false = disabled, true = required)' },
  { key: 'TRUST_PROXY', desc: 'Set to 1 behind reverse proxy' },
];

const DEV_PLACEHOLDERS = [
  'CHANGE_ME', 'your-', 'example.com', 'localhost', 'CHANGEME',
  'TODO', 'FIXME', 'placeholder',
];

// ── Helpers ────────────────────────────────────────
function loadEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
  return env;
}

function isPlaceholder(value) {
  if (!value) return false;
  const lower = value.toLowerCase();
  return DEV_PLACEHOLDERS.some(p => lower.includes(p));
}

function checkHealth(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 5000 }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          resolve({ ok: res.statusCode === 200, data: JSON.parse(body) });
        } catch {
          resolve({ ok: false, data: null });
        }
      });
    });
    req.on('error', () => resolve({ ok: false, data: null }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, data: null }); });
  });
}

// ── Main ───────────────────────────────────────────
async function main() {
  const fixMode = process.argv.includes('--fix');
  const jsonMode = process.argv.includes('--json');
  const env = loadEnv(BACKEND_ENV);
  const results = { required: [], recommended: [], security: [], services: [], overall: 'PASS' };

  const log = jsonMode ? () => {} : console.log;
  const color = (code, text) => jsonMode ? text : `\x1b[${code}m${text}\x1b[0m`;

  log('\n╔══════════════════════════════════════════════════╗');
  log('║  Genz Messenger — Production Readiness Checker  ║');
  log('╚══════════════════════════════════════════════════╝\n');

  // ── 1. Required env vars ──
  log('━━━ REQUIRED Environment Variables ━━━');
  for (const item of REQUIRED) {
    const val = env[item.key] || '';
    let status = 'PASS';
    let detail = '';

    if (!val) {
      status = 'FAIL';
      detail = 'Missing';
    } else if (isPlaceholder(val)) {
      status = 'FAIL';
      detail = 'Contains placeholder value';
    } else if (item.min && val.length < item.min) {
      status = 'FAIL';
      detail = `Too short (${val.length} < ${item.min} chars)`;
    }

    if (item.key === 'MONGODB_URI' && val && val.includes('localhost')) {
      status = 'FAIL';
      detail = 'Points to localhost — use MongoDB Atlas in production';
    }

    if (item.key === 'JWT_REFRESH_SECRET' && val && val === env['JWT_SECRET']) {
      status = 'FAIL';
      detail = 'Must differ from JWT_SECRET';
    }

    const icon = status === 'PASS' ? color('32', '✅') : color('31', '❌');
    log(`  ${icon} ${item.key.padEnd(30)} ${detail || 'OK'}`);
    results.required.push({ key: item.key, status, detail: detail || item.desc });
    if (status === 'FAIL') results.overall = 'FAIL';
  }

  // ── 2. Strongly recommended ──
  log('\n━━━ STRONGLY RECOMMENDED Variables ━━━');
  for (const item of STRONGLY_RECOMMENDED) {
    const val = env[item.key] || '';
    let status = 'PASS';
    let detail = '';

    if (!val) {
      status = 'WARN';
      detail = 'Not set';
    } else if (isPlaceholder(val)) {
      status = 'WARN';
      detail = 'Placeholder value';
    }

    const icon = status === 'PASS' ? color('32', '✅') : color('33', '⚠️ ');
    log(`  ${icon} ${item.key.padEnd(30)} ${detail || 'OK'}`);
    results.recommended.push({ key: item.key, status, detail: detail || item.desc });
  }

  // ── 3. Security checks ──
  log('\n━━━ Security Settings ━━━');
  for (const item of SECURITY_CHECKS) {
    const val = env[item.key] || '';
    let status = 'PASS';
    let detail = '';

    if (item.expected && val && val.toLowerCase() !== item.expected.toLowerCase()) {
      status = 'FAIL';
      detail = `Expected "${item.expected}", got "${val}"`;
    } else if (!val && item.expected) {
      status = 'WARN';
      detail = `Not set (should be "${item.expected}")`;
    }

    const icon = status === 'PASS' ? color('32', '✅') : status === 'FAIL' ? color('31', '❌') : color('33', '⚠️ ');
    log(`  ${icon} ${item.key.padEnd(38)} ${detail || 'OK'}`);
    results.security.push({ key: item.key, status, detail: detail || item.desc });
    if (status === 'FAIL') results.overall = 'FAIL';
  }

  // ── 4. Service checks ──
  log('\n━━━ Service Health ━━━');

  const remoteMode = process.argv.includes('--remote');
  const PRODUCTION_URL = 'https://genz-whatsapp-1.onrender.com';
  const publicApiUrl = env.PUBLIC_API_URL || '';
  const isPlaceholderUrl = !publicApiUrl || publicApiUrl.includes('localhost') || publicApiUrl.includes('CHANGE_ME') || publicApiUrl.includes('example.com');
  const healthUrl = remoteMode
    ? (isPlaceholderUrl ? PRODUCTION_URL : publicApiUrl) + '/api/health'
    : `http://localhost:${env.PORT || 5000}/api/health`;

  log(`  Checking ${healthUrl}...`);
  const health = await checkHealth(healthUrl);

  if (health.ok) {
    const mongo = health.data?.services?.mongo;
    const redis = health.data?.services?.redis;
    const media = health.data?.services?.mediaStorage;

    const mongoIcon = mongo === 'connected' ? color('32', '✅') : color('31', '❌');
    log(`  ${mongoIcon} MongoDB: ${mongo || 'unknown'}`);
    results.services.push({ name: 'MongoDB', status: mongo === 'connected' ? 'PASS' : 'FAIL' });

    const redisIcon = redis === 'connected' ? color('32', '✅') : color('33', '⚠️ ');
    log(`  ${redisIcon} Redis: ${redis || 'not configured'}`);
    results.services.push({ name: 'Redis', status: redis === 'connected' ? 'PASS' : 'WARN' });

    const mediaIcon = media === 'cloudinary' ? color('32', '✅') : color('33', '⚠️ ');
    log(`  ${mediaIcon} Media Storage: ${media || 'unknown'}`);
    results.services.push({ name: 'MediaStorage', status: media === 'cloudinary' ? 'PASS' : 'WARN' });
  } else {
    log(`  ${color('31', '❌')} Backend server not reachable`);
    results.services.push({ name: 'Backend', status: 'FAIL' });
    results.overall = 'FAIL';
  }

  // ── Summary ──
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (remoteMode) log(color('36', '  🌐 REMOTE MODE — checked production health endpoint'));
  if (results.overall === 'PASS') {
    log(color('32', '  ✅ PRODUCTION READY — All required checks passed!'));
  } else {
    log(color('31', '  ❌ NOT READY — Fix the issues above before deploying'));
  }
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2));
  }

  process.exit(results.overall === 'PASS' ? 0 : 1);
}

main().catch((err) => {
  console.error('Readiness check failed:', err.message);
  process.exit(1);
});
