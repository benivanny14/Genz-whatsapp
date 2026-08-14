#!/usr/bin/env node
/**
 * test-smtp.js — tuma barua pepe ya mtihani kupitia SMTP ya backend/.env.
 *
 * Usage (kutoka repo root):
 *   node scripts/test-smtp.js                    # inatumia ALERT_EMAIL_TO / SMTP_USER
 *   node scripts/test-smtp.js mimi@example.com   # au barua pepe maalum
 *
 * Kabla ya kuendesha, jaza kwenye backend/.env (au env ya Render):
 *   SMTP_HOST=smtp.example.com
 *   SMTP_PORT=587            (465 kwa SSL — weka SMTP_SECURE=true)
 *   SMTP_USER=you@example.com
 *   SMTP_PASS=app-password   (kwa Gmail: "App password" — SI password ya akaunti)
 *   SMTP_FROM=noreply@genz-whatsapp.com
 *   ALERT_EMAIL_TO=wehe@example.com   (anwani ya kupokea alerts)
 *
 * Kwa Gmail: https://myaccount.google.com/apppasswords (2FA lazima iwe ON).
 */
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

function readEnv(file) {
  const vals = {};
  if (!fs.existsSync(file)) return vals;
  for (const l of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!l.trim() || l.trim().startsWith('#')) continue;
    const i = l.indexOf('=');
    if (i < 0) continue;
    vals[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  return vals;
}

const env = { ...process.env, ...readEnv(path.join(__dirname, '..', 'backend', '.env')) };
const to = process.argv[2] || env.ALERT_EMAIL_TO || env.SMTP_USER;

if (!env.SMTP_HOST || !env.SMTP_USER) {
  console.error('❌ SMTP_HOST / SMTP_USER hazijawekwa kwenye backend/.env.');
  process.exit(1);
}
if (!to) {
  console.error('❌ Anwani ya kupokea haipo — weka ALERT_EMAIL_TO kwenye .env au toa kama argument.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT || 587),
  secure: env.SMTP_SECURE === 'true',
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS || '' }
});

(async () => {
  console.log(`📧 Inatuma barua pepe ya mtihani kutoka ${env.SMTP_USER} → ${to} (${env.SMTP_HOST}:${env.SMTP_PORT})...`);
  try {
    const info = await transporter.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to,
      subject: 'GENZ WhatsApp — SMTP test OK',
      text: 'Hii ni barua pepe ya mtihani. Ikiwa umeiona, SMTP imesanidiwa vizuri ✅'
    });
    console.log('✅ Imetumwa! messageId:', info.messageId);
    console.log('   (Angalia folder ya spam kama haifiki Inbox.)');
  } catch (e) {
    console.error('❌ Imeshindikana:', e.message);
    process.exit(1);
  }
})();
