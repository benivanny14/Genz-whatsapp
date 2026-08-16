/**
 * cleanup-verify-users.js
 * -----------------------
 * Deletes throwaway users created by verification scripts (username prefix
 * `va_`, e.g. verify-production-privacy.js). Interactive: asks for the admin
 * username/password, the TOTP code from your authenticator, then lists and
 * deletes every matching user via the admin API.
 *
 * Usage:
 *   node scripts/cleanup-verify-users.js [SERVER_URL] [ADMIN_BASE_PATH]
 * e.g.
 *   node scripts/cleanup-verify-users.js https://genz-whatsapp.onrender.com /api/system-gateway-x9k
 *   node scripts/cleanup-verify-users.js http://localhost:5000 /api/admin
 */
const readline = require('readline');

const SERVER = (process.argv[2] || 'https://genz-whatsapp.onrender.com').replace(/\/+$/, '');
const ADMIN_BASE = (process.argv[3] || '/api/system-gateway-x9k').replace(/\/+$/, '');
const USERNAME_PREFIX = 'va_';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

async function api(path, { method = 'GET', token, body } = {}) {
  const r = await fetch(`${SERVER}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  let data = null;
  try { data = await r.json(); } catch { /* non-JSON */ }
  return { status: r.status, data };
}

(async () => {
  try {
    console.log(`\n🧹 GENZ cleanup — server: ${SERVER}`);
    console.log(`   Admin base path: ${ADMIN_BASE}\n`);

    const username = await ask('Admin username: ');
    const password = await ask('Admin password: ');

    // Step 1 — password
    const step1 = await api(`${ADMIN_BASE}/auth/login`, {
      method: 'POST',
      body: { username, password }
    });
    if (!step1.data || !step1.data.success) {
      console.error(`❌ Login failed (${step1.status}): ${step1.data?.error || 'unknown error'}`);
      process.exit(1);
    }
    let token = step1.data.accessToken;
    if (step1.data.requiresTwoFactor) {
      const code = await ask('TOTP code from your authenticator app: ');
      const step2 = await api(`${ADMIN_BASE}/auth/verify-2fa`, {
        method: 'POST',
        body: { preAuthToken: step1.data.preAuthToken, code }
      });
      if (!step2.data || !step2.data.accessToken) {
        console.error(`❌ 2FA failed (${step2.status}): ${step2.data?.error || 'unknown error'}`);
        process.exit(1);
      }
      token = step2.data.accessToken;
    }
    console.log('✅ Admin authenticated\n');

    // Step 2 — find throwaway users
    let page = 1;
    const found = [];
    for (;;) {
      const { status, data } = await api(`/api/admin/users?search=${USERNAME_PREFIX}&limit=100&page=${page}`, { token });
      if (status !== 200 || !data.success) {
        console.error(`❌ Failed to list users (${status}): ${data?.message || data?.error || 'unknown error'}`);
        process.exit(1);
      }
      found.push(...data.users.filter((u) => u.username && u.username.startsWith(USERNAME_PREFIX)));
      if (page * data.pagination.limit >= data.pagination.total) break;
      page += 1;
    }

    if (found.length === 0) {
      console.log(`✅ Hakuna users wenye prefix "${USERNAME_PREFIX}" — hakuna kitu cha kufuta.`);
      process.exit(0);
    }

    console.log(`Found ${found.length} verification user(s):`);
    found.forEach((u) => console.log(`  - ${u.username} (${u.phoneNumber})`));

    const confirm = await ask('\nDelete ALL of the above? Type "delete" to confirm: ');
    if (confirm.trim().toLowerCase() !== 'delete') {
      console.log('🚫 Cancelled — hakuna kilichofutwa.');
      process.exit(0);
    }

    let ok = 0;
    for (const u of found) {
      const { status, data } = await api(`/api/admin/users/${u._id}`, { method: 'DELETE', token });
      if (status === 200) {
        console.log(`  ✅ Deleted ${u.username}`);
        ok += 1;
      } else {
        console.error(`  ❌ Failed to delete ${u.username} (${status}): ${data?.message || data?.error || 'unknown'}`);
      }
    }
    console.log(`\nDone: ${ok}/${found.length} deleted.`);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
})();
