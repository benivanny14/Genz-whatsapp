#!/usr/bin/env node
/**
 * import-firebase-service-account.js — weka Firebase service account kwenye
 * backend/.env kwa amri moja.
 *
 * Usage (kutoka repo root):
 *   node scripts/import-firebase-service-account.js /path/to/service-account.json
 *
 * Chanzo cha faili:
 *   Firebase console (https://console.firebase.google.com) → mradi wako →
 *   ⚙️ Project settings → Service accounts → "Generate new private key"
 *   (inashusha faili ya JSON — usiiweke kwenye git!).
 *
 * Script inaandika FIREBASE_* keys kwenye backend/.env (inahifadhi keys
 * zingine zisizogusika). Siri hazijawahi kuchapishwa kwenye terminal.
 */
const fs = require('fs');
const path = require('path');

// Overridable kwa tests (FIREBASE_IMPORT_ENV=/njia/ya/.env) — default backend/.env
const ENV_PATH = process.env.FIREBASE_IMPORT_ENV || path.join(__dirname, '..', 'backend', '.env');

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  console.error(`
📌 Jinsi ya kupata faili ya service account (dakika ~2):
   1. Fungua https://console.firebase.google.com → mradi wako.
   2. ⚙️ Project settings → tab ya "Service accounts".
   3. Bofya "Generate new private key" → faili ya JSON inashuka.
   4. Endesha tena: node scripts/import-firebase-service-account.js /njia/ya/faili.json
`);
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) fail('Haukuweka njia ya faili ya service account (JSON).');

let raw;
try {
  raw = JSON.parse(fs.readFileSync(arg, 'utf8'));
} catch (e) {
  fail(`Haikuweza kusoma JSON: ${e.message}`);
}

if (raw.type !== 'service_account') fail('Faili si service account ya Firebase (type lazima iwe "service_account").');
if (!raw.project_id || !raw.client_email || !raw.private_key) {
  fail('Faili haikamiliki — inahitaji project_id, client_email na private_key.');
}

// Private key: single line, literal \n ndani ya double quotes — dotenv ina-
// convert hii kuwa newlines halisi (kama .env.example inavyofanya).
const privateKeyLine = raw.private_key.replace(/\r?\n/g, '\\n').replace(/"/g, '\\"');

const newValues = {
  FIREBASE_PROJECT_ID: raw.project_id,
  FIREBASE_CLIENT_EMAIL: raw.client_email,
  FIREBASE_PRIVATE_KEY: `"${privateKeyLine}"`,
  FIREBASE_PRIVATE_KEY_ID: raw.private_key_id || '',
  FIREBASE_CLIENT_ID: raw.client_id || ''
};

if (!fs.existsSync(ENV_PATH)) {
  fail(`backend/.env haipo kwenye ${ENV_PATH} — endesha script kutoka repo root.`);
}

const lines = fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/);
const out = [];
const touched = new Set();

for (const line of lines) {
  const match = /^([A-Z0-9_]+)=/.exec(line);
  if (match && newValues[match[1]] !== undefined) {
    out.push(`${match[1]}=${newValues[match[1]]}`);
    touched.add(match[1]);
  } else {
    out.push(line);
  }
}
for (const [key, value] of Object.entries(newValues)) {
  if (!touched.has(key)) out.push(`${key}=${value}`);
}

fs.writeFileSync(ENV_PATH, out.join('\n').replace(/\n+$/, '') + '\n');

console.log('✅ FIREBASE_* zimeingizwa kwenye backend/.env:');
for (const k of Object.keys(newValues)) {
  console.log(`   ${k.padEnd(28)} ${newValues[k] !== '' ? 'imewekwa ✓' : '(tupu)'}`);
}
console.log(`
🧪 Thibitisha kwa kuanzisha server: NODE_ENV=development node backend/server.js
   (unaweza kuiona kwenye logs: "[Firebase] Firebase Admin SDK initialized successfully")
`);
