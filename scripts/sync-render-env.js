#!/usr/bin/env node
/**
 * sync-render-env.js — Sync env kutoka Render Dashboard → backend/.env
 *
 * Script hii inasoma health endpoint ya production na kuonyesha tofauti
 * kati ya local .env na production.
 *
 * Usage:
 *   node scripts/sync-render-env.js                 # angalia tofauti
 *   node scripts/sync-render-env.js --apply          # sync localhost:5000 → local
 *   node scripts/sync-render-env.js --apply --remote # sync production → local
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const BACKEND_ENV = path.join(ROOT, 'backend', '.env');
const PRODUCTION_URL = 'https://genz-whatsapp-1.onrender.com';

function readEnv(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

function fetchHealth(url) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { timeout: 10000 }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function maskSecret(value) {
  if (!value) return '(empty)';
  if (value.length <= 8) return '***';
  return value.slice(0, 4) + '...' + value.slice(-4);
}

async function main() {
  const args = process.argv.slice(2);
  const applyMode = args.includes('--apply');
  const remoteMode = args.includes('--remote');

  const localEnv = readEnv(BACKEND_ENV);
  const healthUrl = remoteMode
    ? `${PRODUCTION_URL}/api/health`
    : `http://localhost:${localEnv.PORT || 5000}/api/health`;

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Genz Messenger — Render Env Sync               ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log(`🌐 Checking: ${healthUrl}`);

  const health = await fetchHealth(healthUrl);

  if (!health) {
    console.log('❌ Health endpoint haijapatikana. Server inaenda?');
    process.exit(1);
  }

  console.log(`✅ Health OK — uptime: ${health.uptime?.toFixed(0)}s\n`);

  // Show service status
  const services = health.services || {};
  console.log('━━━ Service Status (production) ━━━');
  console.log(`  ${services.mongo === 'connected' ? '✅' : '❌'} MongoDB: ${services.mongo || 'unknown'}`);
  console.log(`  ${services.redis === 'connected' ? '✅' : services.redis === 'disabled' ? '⚠️ ' : '❌'} Redis: ${services.redis || 'not configured'}`);
  console.log(`  ${services.mediaStorage === 'cloudinary' ? '✅' : '⚠️ '} Media Storage: ${services.mediaStorage || 'unknown'}`);
  console.log('');

  // Compare critical keys
  const criticalKeys = [
    'MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET',
    'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY',
    'FRONTEND_URL', 'PUBLIC_API_URL',
    'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY',
    'ALLOW_ANONYMOUS_DEVICE_AUTH', 'ALLOW_MOCK_PAYMENTS',
    'PHONE_VERIFICATION_REQUIRED', 'TRUST_PROXY',
    'ADMIN_BASE_PATH', 'RP_ID',
    'SMTP_HOST', 'SMTP_USER',
    'WHATSAPP_OTP_ENABLED', 'WHATSAPP_OTP_PROVIDER',
  ];

  console.log('━━━ Key Comparison (local vs production health) ━━━\n');
  console.log('  Note: Health endpoint only shows service status, not full env.');
  console.log('  For full sync, use Render Dashboard → Environment → Export.\n');

  // The health endpoint doesn't expose individual env values for security,
  // so we check what we CAN verify: service connectivity.
  const checks = [
    {
      key: 'MONGODB_URI',
      local: localEnv.MONGODB_URI?.includes('localhost') ? 'localhost (DEV!)' : 'Atlas (production)',
      prod: services.mongo === 'connected' ? '✅ connected' : '❌ disconnected',
    },
    {
      key: 'CLOUDINARY_*',
      local: localEnv.CLOUDINARY_CLOUD_NAME ? `set (${localEnv.CLOUDINARY_CLOUD_NAME})` : 'NOT SET',
      prod: services.mediaStorage === 'cloudinary' ? '✅ cloudinary' : '⚠️ not cloudinary',
    },
    {
      key: 'REDIS_URL',
      local: localEnv.REDIS_URL ? 'set' : 'NOT SET',
      prod: services.redis === 'connected' ? '✅ connected' : '⚠️ disabled (single-instance OK)',
    },
  ];

  for (const c of checks) {
    const localOk = !c.local.includes('NOT SET') && !c.local.includes('DEV!');
    const prodOk = c.prod.includes('✅');
    const icon = localOk && prodOk ? '✅' : localOk ? '⚠️ ' : '❌';
    console.log(`  ${icon} ${c.key.padEnd(25)} local: ${c.local.padEnd(30)} prod: ${c.prod}`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💡 Full env sync: Render Dashboard → Environment → Export');
  console.log('   Kisha bandika kwenye backend/.env yako ya local');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
