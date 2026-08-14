/**
 * send-announcement.js — tuma tangazo la ndani ya app kwa watumiaji WOTE
 * kwa amri moja (login → 2FA → announce).
 *
 * Hii inafanya hatua 3 za mwongozo wa docs/ANNOUNCEMENT_v1.1.14.md kiotomatiki:
 *   1. POST /api/system-gateway-x9k/auth/login          (username + password)
 *   2. POST /api/system-gateway-x9k/auth/verify-2fa     (TOTP code)
 *   3. POST /api/admin/broadcasts/announce              (maandishi ya tangazo)
 *
 * Usage (from repo root):
 *   ADMIN_USERNAME=<username> ADMIN_PASSWORD=<password> TOTP_CODE=<6-digit> \
 *     node scripts/send-announcement.js
 *
 * Optional env / flags:
 *   ADMIN_USERNAME / ADMIN_PASSWORD   admin credentials (required)
 *   TOTP_CODE                         kodi ya Google Authenticator (required,
 *                                     inabadilika kila sekunde 30 — jitayarishe
 *                                     kuikimbia mara moja tu)
 *   ANNOUNCEMENT_CONTENT              maandishi ya tangazo (default: draft ya
 *                                     v1.1.14 kutoka docs/ANNOUNCEMENT_v1.1.14.md)
 *   ANNOUNCEMENT_SEGMENT              'all' | 'premium' | 'free' | 'blocked'
 *                                     (default: 'all')
 *   API_BASE                          default https://genz-whatsapp.onrender.com
 *   --verify                          kwanza hakikisha production inaserve
 *                                     v1.1.14 (version.json) kabla ya kutuma
 *   --dry-run                         onyesha maandishi + ufanye login/2FA lakini
 *                                     USITUME tangazo (test ya credentials)
 *
 * Exit codes: 0 = tayari (au dry-run), 1 = kosa (creds au API).
 * Tangazo haliwezi kufutwa kwa kila mtumiaji mmoja mmoja — hakikisha
 * umeridhika na maandishi kabla ya kuendesha (tumia --dry-run kwanza!).
 */
const https = require('https');

const API_BASE = process.env.API_BASE || 'https://genz-whatsapp.onrender.com';
const ADMIN_BASE = '/api/system-gateway-x9k';

const DEFAULT_CONTENT = [
  '📢 UPDATE KUBWA — GENZ v1.1.14 imefika!',
  '',
  'Tumefanya mabadiliko makubwa mawili:',
  '',
  '1. 🚫 VOICE NA VIDEO CALLS ZIMEONDOLWA — GENZ sasa ni app ya pure messaging',
  '   (kama WhatsApp ya zamani kabla ya calls). Ujumbe, picha, video, files,',
  '   voice notes na status — zote zimebaki na zinafanya kazi kama kawaida.',
  '',
  '2. ⚡ APP INAFUNGUKA MARA MOJA — tangu v1.1.14 APK ina-bundle app nzima',
  '   ndani yake, hivyo haitegemei mtandao tena kufunguka. Hata bila internet,',
  '   app inafunguka na unaweza kuona chats zako (kutuma ujumbe bado kunahitaji',
  '   mtandao).',
  '',
  '⚠️ USIFUTE app kabla ya kusakinisha update! Uninstall inafuta mazungumzo',
  'yako. Sakinisha tu juu ya ile ya zamani (data inabaki — v1.1.13 → v1.1.14).',
  '',
  '👉 Pakua update: fungua app → utaona banner ya kijani "Update available —',
  'v1.1.14" → bonyeza Update.',
  'Au pakua hapa: https://genz-whatsapp-1.onrender.com/genz-whatsapp.apk',
  '',
  'Asante kwa kutumia GENZ! 💚'
].join('\n');

function request(method, path, { body, token, timeoutMs = 20000 } = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_BASE + path);
    const req = https.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(body ? { 'Content-Length': Buffer.byteLength(JSON.stringify(body)) } : {})
        },
        timeout: timeoutMs
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try { parsed = JSON.parse(data); } catch { /* non-JSON body */ }
          resolve({ status: res.statusCode, body: parsed, raw: data });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error(`timeout after ${timeoutMs}ms`)));
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);

const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;
const totpCode = process.env.TOTP_CODE;
const content = process.env.ANNOUNCEMENT_CONTENT || DEFAULT_CONTENT;
const segment = process.env.ANNOUNCEMENT_SEGMENT || 'all';
const verifyFirst = hasFlag('--verify');
const dryRun = hasFlag('--dry-run');

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  console.error('Usage:');
  console.error('  ADMIN_USERNAME=<username> ADMIN_PASSWORD=<password> TOTP_CODE=<6-digit> \\');
  console.error('    node scripts/send-announcement.js [--verify] [--dry-run]');
  console.error('');
  console.error('TOTP_CODE ni kodi ya Google Authenticator yako (inabadilika kila sekunde 30).');
  console.error('Kama huna creds, tafadhali tuma username/password/TOTP kwa msimamizi wa repo.');
  process.exit(1);
}

(async () => {
  if (!username || !password) {
    fail('ADMIN_USERNAME na ADMIN_PASSWORD zinahitajika (env vars).');
  }
  if (!totpCode || !/^\d{6}$/.test(String(totpCode))) {
    fail('TOTP_CODE inahitajika — nambari 6 za Google Authenticator.');
  }

  console.log(`🎯 API: ${API_BASE}`);

  // Step 0 (optional): verify production serves the release we're announcing
  if (verifyFirst) {
    console.log('\n1/4 — Kuverify production version.json ...');
    const v = await request('GET', '/version.json', { timeoutMs: 15000 }).catch((e) => {
      fail(`Haiwezi kufikia ${API_BASE}/version.json (${e.message}). Hakikisha API_BASE ni sahihi.`);
    });
    const ver = v.body || {};
    const ok = String(ver.version || '').startsWith('1.1.14') || ver.versionCode === 16;
    console.log(`   → version: ${ver.version || '?'}, code: ${ver.versionCode ?? '?'} ${ok ? '✓' : '⚠️ tofauti na v1.1.14'}`);
    if (!ok) fail('Production HAISERVE v1.1.14 bado — usitangaze update ambayo haijafika!');
  }

  // Step 1: login
  console.log('\n1/4 — Login (username + password) ...');
  const step1 = await request('POST', `${ADMIN_BASE}/auth/login`, {
    body: { username, password }
  }).catch((e) => fail(`Login imeshindwa (${e.message})`));
  if (step1.status === 401 || step1.status === 423) {
    fail(`Login imekataliwa (${step1.status}): ${step1.body?.error || step1.raw}`);
  }
  if (step1.status === 503) {
    fail('Admin account haijaprovisioned kwenye server hii (503).');
  }
  if (step1.status !== 200 || !step1.body?.success) {
    fail(`Login imeshindwa (${step1.status}): ${step1.body?.error || step1.raw}`);
  }
  const preAuthToken = step1.body.preAuthToken;
  if (!preAuthToken) fail('Login haikurudisha preAuthToken.');
  console.log('   → preAuthToken ✓');

  // Step 2: 2FA
  console.log('2/4 — Kuverify TOTP code ...');
  const step2 = await request('POST', `${ADMIN_BASE}/auth/verify-2fa`, {
    body: { preAuthToken, code: String(totpCode) }
  }).catch((e) => fail(`2FA imeshindwa (${e.message})`));
  if (step2.status !== 200 || !step2.body?.accessToken) {
    fail(`2FA imekataliwa (${step2.status}): ${step2.body?.error || step2.raw} — jaribu TOTP mpya (code inabadilika kila sekunde 30).`);
  }
  const accessToken = step2.body.accessToken;
  console.log('   → accessToken ✓');

  // Step 3: dry-run stops here
  if (dryRun) {
    console.log('\n✅ DRY-RUN imefanikiwa — creds ni sahihi, hakuna kitu kilitumwa.');
    console.log('Maandishi ya tangazo (uliyotuma):');
    console.log('-----------------------------------');
    console.log(content);
    console.log('-----------------------------------');
    console.log('Kutuma kweli: ondoa --dry-run na ukimbie tena.');
    process.exit(0);
  }

  // Step 4: announce
  console.log('3/4 — Kutuma tangazo kwa watumiaji wote ...');
  const announce = await request('POST', '/api/admin/broadcasts/announce', {
    body: { content, segment },
    token: accessToken,
    timeoutMs: 120000
  }).catch((e) => fail(`Tangazo limeshindwa (${e.message})`));
  if (announce.status !== 200) {
    fail(`Tangazo limekataliwa (${announce.status}): ${announce.body?.error || announce.body?.message || announce.raw}`);
  }
  console.log(`   → ${announce.body?.message || 'Tangazo limetumwa'} ✓`);

  console.log(`\n✅ TAYARI — tangazo limeenda kwa watumiaji (segment: ${segment}).`);
})().catch((e) => {
  console.error('❌ Kosa lisilotarajiwa:', e.message);
  process.exit(1);
});
