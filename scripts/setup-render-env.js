#!/usr/bin/env node
/**
 * Sync backend/.env variables to a Render web service.
 *
 * Usage:
 *   set RENDER_API_KEY=rnd_xxx
 *   node scripts/setup-render-env.js --service-id srv-xxx
 *   node scripts/setup-render-env.js --service-name genz-whatsapp
 */
const fs = require('fs');
const path = require('path');

const API = 'https://api.render.com/v1';
const ROOT = path.join(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'backend', '.env');

const RENDER_KEYS = [
  'NODE_ENV', 'PORT', 'MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_EXPIRE',
  'FRONTEND_URL', 'PUBLIC_API_URL', 'ADMIN_BOOTSTRAP_TOKEN', 'BACKUP_ENCRYPTION_KEY',
  'MESSAGE_ENCRYPTION_SECRET', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
  'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT',
  'ALLOW_ANONYMOUS_DEVICE_AUTH', 'ALLOW_SOCKET_WITHOUT_AUTH', 'ALLOW_MOCK_PAYMENTS',
  'REDIS_URL', 'TURN_SERVER_URL', 'TURN_USERNAME', 'TURN_CREDENTIAL'
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing ${filePath}`);
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

function getArg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

async function api(pathname, { method = 'GET', body } = {}) {
  const key = process.env.RENDER_API_KEY;
  if (!key) throw new Error('Set RENDER_API_KEY (Render Dashboard → Account Settings → API Keys)');
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.message || `Render API ${res.status}: ${text}`);
  return data;
}

async function resolveServiceId() {
  const id = getArg('--service-id');
  if (id) return id;
  const name = getArg('--service-name') || 'genz-whatsapp';
  let cursor;
  do {
    const q = cursor ? `?cursor=${cursor}` : '';
    const page = await api(`/services?limit=100${q.replace('?', '&')}`);
    const match = (page || []).find((s) => s.service?.name === name || s.name === name);
    if (match) return match.service?.id || match.id;
    cursor = page?.length ? page[page.length - 1]?.cursor : null;
  } while (cursor);
  throw new Error(`Service not found: ${name}`);
}

async function main() {
  const local = parseEnvFile(ENV_PATH);
  const serviceId = await resolveServiceId();
  const productionDefaults = {
    NODE_ENV: 'production',
    PORT: '5000',
    FRONTEND_URL: 'https://genz-whatsapp-1.onrender.com',
    PUBLIC_API_URL: 'https://genz-whatsapp.onrender.com',
    ALLOW_ANONYMOUS_DEVICE_AUTH: 'false',
    ALLOW_SOCKET_WITHOUT_AUTH: 'false',
    ALLOW_MOCK_PAYMENTS: 'false'
  };

  const payload = { ...productionDefaults };
  for (const key of RENDER_KEYS) {
    if (local[key]) payload[key] = local[key];
  }
  if (!payload.JWT_REFRESH_SECRET && payload.JWT_SECRET) {
    payload.JWT_REFRESH_SECRET = `${payload.JWT_SECRET}-refresh`;
  }
  if (!payload.FRONTEND_URL) payload.FRONTEND_URL = 'https://genz-whatsapp-1.onrender.com';
  if (!payload.PUBLIC_API_URL) payload.PUBLIC_API_URL = 'https://genz-whatsapp.onrender.com';
  if (!payload.FRONTEND_URL) payload.FRONTEND_URL = payload.PUBLIC_API_URL;

  console.log(`Updating ${Object.keys(payload).length} env vars on service ${serviceId}...`);
  for (const [key, value] of Object.entries(payload)) {
    await api(`/services/${serviceId}/env-vars`, {
      method: 'POST',
      body: { envVar: { key, value } }
    });
    console.log(`  ✓ ${key}`);
  }
  console.log('\nDone. Trigger redeploy from Render dashboard if needed.');
}

main().catch((e) => {
  console.error('Failed:', e.message);
  process.exit(1);
});
