#!/usr/bin/env node
/**
 * setup-smtp.js — Weka SMTP credentials kwenye backend/.env
 *
 * Script hii inakuongoza kwa hatua za kuweka SMTP ya Gmail
 * (App Password) na kuiandika moja kwa moja kwenye backend/.env.
 *
 * Usage:
 *   node scripts/setup-smtp.js                    # interactive
 *   node scripts/setup-smtp.js --user x --pass y   # non-interactive
 *   node scripts/setup-smtp.js --check             # check kama SMTP iko configured
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const BACKEND_ENV = path.join(__dirname, '..', 'backend', '.env');

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

function writeEnvKey(filePath, key, value) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    content = content.replace(regex, `${key}=${value}`);
  } else {
    // Add before the last empty line or at the end
    content = content.trimEnd() + `\n${key}=${value}\n`;
  }
  fs.writeFileSync(filePath, content);
}

function checkSmtp() {
  const env = readEnv(BACKEND_ENV);
  const host = env.SMTP_HOST || '';
  const user = env.SMTP_USER || '';
  const pass = env.SMTP_PASS || '';
  const port = env.SMTP_PORT || '';
  const from = env.SMTP_FROM || '';

  console.log('\n📧 SMTP Configuration Status:\n');

  const items = [
    ['SMTP_HOST', host, host ? '✅' : '❌'],
    ['SMTP_PORT', port || '(not set)', port ? '✅' : '⚠️ '],
    ['SMTP_USER', user || '(not set)', user ? '✅' : '❌'],
    ['SMTP_PASS', pass ? '***hidden***' : '(not set)', pass ? '✅' : '❌'],
    ['SMTP_FROM', from || '(not set)', from ? '✅' : '⚠️ '],
  ];

  for (const [key, val, icon] of items) {
    console.log(`  ${icon} ${key.padEnd(20)} ${val}`);
  }

  if (host && user && pass) {
    console.log('\n✅ SMTP iko configured! Inaweza kutuma emails za alert.\n');
  } else {
    console.log('\n❌ SMTP haijatengenezwa. Endesha: node scripts/setup-smtp.js\n');
  }
}

async function interactiveSetup() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise((r) => rl.question(q, r));

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Genz Messenger — SMTP (Gmail) Setup            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  console.log('📧 SMTP inatumika kwa: alert emails (stuck releases, errors)\n');

  console.log('HATUA ZA KUWEKA GMAIL APP PASSWORD:\n');
  console.log('  1. Fungua https://myaccount.google.com/security');
  console.log('  2. Hakikisha 2FA (Two-Factor Authentication) imewashwa');
  console.log('  3. Nenda https://myaccount.google.com/apppasswords');
  console.log('  4. Tenga jina (mfano: "Genz Messenger") → Bonyeza "Create"');
  console.log('  5. Nakili password (herufi 16, kama: abcd efgh ijkl mnop)');
  console.log('  6. Bandika chini hapa\n');

  const user = await ask('SMTP_USER (Gmail address, mfano: yourname@gmail.com): ');
  const pass = await ask('SMTP_PASS (App Password, herufi 16, mfano: abcd efgh ijkl mnop): ');

  if (!user.includes('@gmail.com') && !user.includes('@')) {
    console.log('\n⚠️  Warning: Hii sio Gmail address. Ikiwa ni email nyingine, hakikisha SMTP_HOST ni sahihi.\n');
  }

  const from = await ask(`SMTP_FROM (optional, default: ${user}): `);

  rl.close();

  // Write to backend/.env
  writeEnvKey(BACKEND_ENV, 'SMTP_HOST', 'smtp.gmail.com');
  writeEnvKey(BACKEND_ENV, 'SMTP_PORT', '587');
  writeEnvKey(BACKEND_ENV, 'SMTP_USER', user);
  writeEnvKey(BACKEND_ENV, 'SMTP_PASS', pass);
  writeEnvKey(BACKEND_ENV, 'SMTP_FROM', from || user);

  console.log('\n✅ SMTP imewekwa kwenye backend/.env!\n');
  console.log('Kisha: node scripts/setup-render-env.js (kuisync kwenye Render)\n');
}

// ── Main ──
const args = process.argv.slice(2);

if (args.includes('--check')) {
  checkSmtp();
} else if (args.includes('--user') && args.includes('--pass')) {
  const userIdx = args.indexOf('--user') + 1;
  const passIdx = args.indexOf('--pass') + 1;
  const user = args[userIdx];
  const pass = args[passIdx];
  const fromIdx = args.indexOf('--from');
  const from = fromIdx > -1 ? args[fromIdx + 1] : user;

  writeEnvKey(BACKEND_ENV, 'SMTP_HOST', 'smtp.gmail.com');
  writeEnvKey(BACKEND_ENV, 'SMTP_PORT', '587');
  writeEnvKey(BACKEND_ENV, 'SMTP_USER', user);
  writeEnvKey(BACKEND_ENV, 'SMTP_PASS', pass);
  writeEnvKey(BACKEND_ENV, 'SMTP_FROM', from);

  console.log('✅ SMTP configured!');
} else {
  interactiveSetup();
}
