#!/usr/bin/env node
/**
 * Export backend/.env as Render-ready KEY=VALUE lines (for dashboard paste).
 * Output: scripts/render-env-export.txt (gitignored)
 */
const fs = require('fs');
const path = require('path');

const ENV_PATH = path.join(__dirname, '../backend/.env');
const OUT_PATH = path.join(__dirname, 'render-env-export.txt');

const PRODUCTION_OVERRIDES = {
  NODE_ENV: 'production',
  PORT: '5000',
  FRONTEND_URL: 'https://genz-whatsapp.onrender.com',
  PUBLIC_API_URL: 'https://genz-whatsapp.onrender.com',
  ALLOW_ANONYMOUS_DEVICE_AUTH: 'false',
  ALLOW_SOCKET_WITHOUT_AUTH: 'false',
  ALLOW_MOCK_PAYMENTS: 'false'
};

function parse(file) {
  const out = { ...PRODUCTION_OVERRIDES };
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  if (!out.JWT_REFRESH_SECRET && out.JWT_SECRET) {
    out.JWT_REFRESH_SECRET = `${out.JWT_SECRET}-refresh`;
  }
  return out;
}

const env = parse(ENV_PATH);
const lines = Object.entries(env)
  .filter(([, v]) => v && !String(v).startsWith('your_'))
  .map(([k, v]) => `${k}=${v}`);

fs.writeFileSync(OUT_PATH, lines.join('\n') + '\n');
console.log(`Exported ${lines.length} variables → ${OUT_PATH}`);
console.log('Paste each line in Render Dashboard → genz-whatsapp → Environment');
