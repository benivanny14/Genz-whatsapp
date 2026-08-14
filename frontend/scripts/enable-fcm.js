#!/usr/bin/env node
/**
 * enable-fcm.js — one-command activation of Firebase push notifications.
 *
 * FCM needs `android/app/google-services.json` from YOUR Firebase console
 * (step-by-step: docs/FCM_SETUP_KISWAHILI.md). This script:
 *   1. checks the file exists and contains a real Firebase project,
 *   2. if missing/invalid → prints exactly what to do and exits 1,
 *   3. if valid → rebuilds the signed APK so __GENZ_FCM_ENABLED__ becomes
 *      true, the google-services Gradle plugin applies, and the app
 *      registers tokens with POST /api/notifications/fcm/register.
 *
 * Usage (from frontend/):
 *   npm run fcm:enable
 *
 * NOTE: frontend/package.json is "type": "module", so this file is ESM.
 */
import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const FILE = path.join(dir, '..', 'android', 'app', 'google-services.json');

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  console.error(`
📌 Unahitaji kuweka file la Firebase yako:
   ${path.relative(process.cwd(), FILE)}

Hatua (dakika ~3):
   1. Fungua https://console.firebase.google.com → mradi wako (au unda mpya).
   2. Project settings (⚙) → General → "Your apps" → Android icon.
   3. Package name lazima iwe: com.benivanny.genzwhatsapp
   4. Bofya "Download google-services.json" → weka kwenye folder hapo juu.
   5. Rudia amri hii — APK mpya yenye push itajengwa otomatiki.
`);
  process.exit(1);
}

if (!existsSync(FILE)) {
  fail(`google-services.json HAIPO kwenye ${path.relative(process.cwd(), FILE)}`);
}

let raw;
try {
  raw = JSON.parse(readFileSync(FILE, 'utf8'));
} catch (e) {
  fail(`google-services.json si JSON sahihi: ${e.message}`);
}

const projectId = raw?.project_info?.project_id;
const client = (raw?.client || []).find(
  (c) => c?.client_info?.android_client_info?.package_name === 'com.benivanny.genzwhatsapp'
);
const apiKey = client?.api_key?.[0]?.current_key;

if (!projectId || !client || !apiKey) {
  fail(
    'google-services.json haifai kwa mradi huu — inahitaji package_name "com.benivanny.genzwhatsapp" na Firebase API key.'
  );
}

console.log('✅ google-services.json ni sahihi:');
console.log(`   project:   ${projectId}`);
console.log(`   package:   com.benivanny.genzwhatsapp`);
console.log(`   api_key:   ${apiKey.slice(0, 8)}…${apiKey.slice(-4)}`);
console.log('\n🔨 Inajenga APK yenye FCM enabled ...\n');

execSync('npm run apk:build', { stdio: 'inherit' });

console.log('\n✅ FCM imewashwa! APK mpya imejengwa.');
console.log('   - App itajiandikisha token kupitia POST /api/notifications/fcm/register');
console.log('   - Tumia Firebase console → Cloud Messaging kutuma push kwa watumiaji.');
