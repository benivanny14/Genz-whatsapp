#!/usr/bin/env node
/**
 * backup-keystore.js — backup ya release keystore ya APK.
 *
 * Usage (kutoka repo root):
 *   node scripts/backup-keystore.js                # → ~/Documents/GENZ-keystore-backup
 *   node scripts/backup-keystore.js /njia/maalum   # → mahali unapotaka
 *
 * Kwa nini: bila genz-release.keystore + keystore.properties huwezi kusaini
 * APK mpya — watumiaji wenye APK ya zamani hawataweza kusakinisha update
 * (signature mismatch). Faili hizi ni gitignored, kwa hiyo backup yako ndiyo
 * pekee. Weka nakala nyingine pia kwenye USB/cloud TOFAUTI na hii.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const SRC_DIR = path.join(__dirname, '..', 'frontend', 'android');
const FILES = ['genz-release.keystore', 'keystore.properties'];
const DEFAULT_DEST = path.join(os.homedir(), 'Documents', 'GENZ-keystore-backup');

const dest = path.resolve(process.argv[2] || DEFAULT_DEST);

const missing = FILES.filter((f) => !fs.existsSync(path.join(SRC_DIR, f)));
if (missing.length) {
  console.error(`\n❌ Hazipo kwenye ${SRC_DIR}: ${missing.join(', ')}`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });

for (const f of FILES) {
  const src = path.join(SRC_DIR, f);
  const dst = path.join(dest, f);
  fs.copyFileSync(src, dst);
  const sha = crypto.createHash('sha256').update(fs.readFileSync(src)).digest('hex');
  const size = fs.statSync(src).size;
  console.log(`✅ ${f}  (${size} bytes)  →  ${dst}`);
  console.log(`   sha256: ${sha}`);
}

const note = `Genz Messenger — backup ya release keystore
Tarehe: ${new Date().toISOString()}
Chanzo: ${SRC_DIR}

Faili hizi mbili (genz-release.keystore + keystore.properties) zinahitajika
kusaini APK mpya. USIZIWEKE KWENYE GIT au kuzituma kwa mtu yeyote.

Kurejesha (restore):
  1. Nakili faili hizi mbili kwenye: frontend/android/
  2. Thibitisha keystore.properties ina: storeFile=genz-release.keystore
  3. Endesha: cd frontend && npm run apk:build

Weka nakala nyingine mahali tofauti (USB / cloud password-protected).
`;
fs.writeFileSync(path.join(dest, 'BACKUP-NOTES.txt'), note);

console.log(`\n📌 Backup iko kwenye: ${dest}`);
console.log('   ⚠️ Weka nakala nyingine mahali tofauti (USB / cloud) — hii ni nakala moja tu.');
console.log('   Usiweke faili hizi kwenye git. Zinalindwa na .gitignore tayari.\n');
