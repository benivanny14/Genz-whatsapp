#!/usr/bin/env node
/**
 * Post-seed verification: confirm the seeded data is actually visible through
 * the app's own API (not just present in MongoDB).
 *
 * It logs in as the seed owner and checks:
 *   1. STATUS  — GET /api/status returns the seeded text statuses.
 *   2. CHAT    — GET /api/chat/conversations returns conversations, and each
 *                conversation's messages load with a populated `sender`
 *                (proves the ObjectId integrity fix — string IDs would come
 *                back unpopulated / invisible).
 *
 * Run after seeding a LOCAL backend:
 *   node scripts/verify-seed-visible.js --password=<admin password>
 *   node scripts/verify-seed-visible.js --token=<jwt>
 *
 * Options:
 *   --base=<url>       API base (default $SMOKE_BASE_URL or http://127.0.0.1:5000)
 *   --username=<name>  seed owner username (default $SEED_VERIFY_USERNAME or "admin")
 *   --password=<pw>    seed owner password (or $SEED_VERIFY_PASSWORD)
 *   --token=<jwt>      skip login and use this bearer token (or $SEED_VERIFY_TOKEN)
 *   --limit=<n>        max conversations to scan (default 10)
 *
 * Exit code is 0 only when the seeded data is visible.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const argValue = (name, fallback) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const BASE = argValue('base', process.env.SMOKE_BASE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const USERNAME = argValue('username', process.env.SEED_VERIFY_USERNAME || 'admin');
const PASSWORD = argValue('password', process.env.SEED_VERIFY_PASSWORD || '');
const MAX_CONVERSATIONS = Number(argValue('limit', '10'));

// Must match scripts/seed-test-data.js and scripts/restore-seed-statuses.js.
const SEED_STATUS_TEXTS = [
  '🎉 Genz Messenger ni app bora zaidi ya messaging!',
  '👻 Ghost mode — tazama status bila kuonekana',
  '🛡️ Anti-delete — hakuna kitu kimefutwa kwako!',
  '⏰ Status 72h — inadumu siku 3 badala ya 1',
];

let token = argValue('token', process.env.SEED_VERIFY_TOKEN || '');
let cookie = '';

async function request(method, path, body) {
  const headers = {};
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') || '' };
}

async function login() {
  if (token) {
    console.log('🔑 Using provided token');
    return;
  }
  if (!PASSWORD) {
    throw new Error(
      'No credentials: pass --password=<pw> (or SEED_VERIFY_PASSWORD) or --token=<jwt>',
    );
  }
  const r = await request('POST', '/api/auth/login', { identifier: USERNAME, password: PASSWORD });
  if (!r.json || !r.json.token) {
    throw new Error(`Login failed (${r.status}): ${JSON.stringify(r.json).slice(0, 150)}`);
  }
  token = r.json.token;
  cookie = r.setCookie;
  console.log(`🔑 Logged in as ${USERNAME}`);
}

const statusTextOf = (status) =>
  status?.textStatus?.text || status?.content || status?.caption || '';

async function checkStatuses() {
  const res = await request('GET', '/api/status');
  const statuses = Array.isArray(res.json?.statuses) ? res.json.statuses : [];
  console.log(`\n[STATUS] GET /api/status → ${statuses.length} status(es)`);

  const present = statuses.map(statusTextOf);
  let found = 0;
  for (const text of SEED_STATUS_TEXTS) {
    const ok = present.includes(text);
    if (ok) found += 1;
    console.log(`  ${ok ? '✅' : '❌'} ${text}`);
  }

  const withPoll = statuses.filter((s) => s && s.poll).length;
  console.log(`  ℹ️  statuses carrying a 'poll' field: ${withPoll}`);
  console.log(`  → ${found}/${SEED_STATUS_TEXTS.length} seeded statuses visible`);

  return found === SEED_STATUS_TEXTS.length;
}

async function checkChat() {
  const res = await request('GET', '/api/chat/conversations');
  const conversations = Array.isArray(res.json?.conversations) ? res.json.conversations : [];
  console.log(`\n[CHAT] GET /api/chat/conversations → ${conversations.length} conversation(s)`);

  let totalMessages = 0;
  let populatedSenders = 0;
  let scanned = 0;

  for (const conv of conversations.slice(0, MAX_CONVERSATIONS)) {
    const convId = conv?._id || conv?.id;
    if (!convId) continue;
    const mres = await request('GET', `/api/chat/conversations/${convId}/messages`);
    const messages = Array.isArray(mres.json?.messages) ? mres.json.messages : [];
    scanned += 1;
    totalMessages += messages.length;
    populatedSenders += messages.filter((m) => m && m.sender && typeof m.sender === 'object').length;
  }

  console.log(`  ℹ️  scanned ${scanned} conversation(s), ${totalMessages} message(s)`);
  console.log(`  ℹ️  messages with a populated sender: ${populatedSenders}`);

  const conversationsOk = conversations.length > 0;
  const messagesOk = totalMessages > 0;
  const sendersOk = totalMessages > 0 && populatedSenders === totalMessages;

  console.log(`  ${conversationsOk ? '✅' : '❌'} conversations visible`);
  console.log(`  ${messagesOk ? '✅' : '❌'} messages visible`);
  console.log(
    `  ${sendersOk ? '✅' : '❌'} every message sender resolves to a user (ObjectId integrity)`,
  );

  return conversationsOk && messagesOk && sendersOk;
}

async function main() {
  console.log(`\n=== SEED VISIBILITY CHECK (${BASE}) ===`);
  await login();

  const statusesOk = await checkStatuses();
  const chatOk = await checkChat();

  const ok = statusesOk && chatOk;
  console.log(`\n${ok ? '✅ SEED IS VISIBLE THROUGH THE API' : '❌ SOME SEEDED DATA IS NOT VISIBLE'}`);
  return ok;
}

if (require.main === module) {
  main()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error('❌ Verification failed:', err.message);
      process.exit(1);
    });
}

module.exports = { main, SEED_STATUS_TEXTS };
