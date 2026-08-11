import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Abuse-report flow (security 2.7):
 *   1. prep: provision a known AdminOwner via backend/scripts/e2e-admin-prep.js
 *   2. reporter registers, creates a conversation, sends a message
 *   3. reporter POSTs /api/chat/messages/:id/report → AbuseReport persisted
 *   4. admin logs in (username → TOTP), lists reports, resolves the report
 *
 * Requires the single-origin stack (backend serves UI + API + admin gateway)
 * and MONGODB_URI (or MONGO_URI) pointing at the backend's database so the
 * prep script can provision the AdminOwner.
 */
// Per-spec credentials: this spec provisions its OWN AdminOwner identity so
// parallel workers never share login state with admin-crash-panel.spec.js.
// Must match the E2E_ADMIN_* env passed to e2e-admin-prep.js below.
const TOTP_SECRET = 'JBSWY3DPEHPK3PXB';
const ADMIN_USERNAME = 'e2e_admin_abuse';
const ADMIN_PASSWORD = 'AbuseReportE2E@2026!';
const ADMIN_OWNER_KEY = 'E2E_OWNER_ABUSE_REPORT';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(encoded) {
  const bits = [];
  for (const ch of encoded.toUpperCase().replace(/=+$/, '')) {
    const value = BASE32_ALPHABET.indexOf(ch);
    if (value === -1) continue;
    for (let b = 4; b >= 0; b--) bits.push((value >> b) & 1);
  }
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8 && i + b < bits.length; b++) byte = (byte << 1) | bits[i + b];
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

function totp(secret, time = Date.now()) {
  const key = base32Decode(secret);
  const counter = Math.floor(time / 30000);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3]
  ) % 1000000;
  return String(code).padStart(6, '0');
}

let base;
let reporterToken;
let reportedUserId;
let messageId;

const PASSWORD = 'GenzTest@2026!';

const register = async (request, prefix) => {
  const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const user = {
    username: `${prefix}_${ts}`,
    phoneNumber: `255749${String(Date.now() + Math.floor(Math.random() * 100000)).slice(-6)}7`,
    password: PASSWORD
  };
  const res = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await res.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  return { id: data.user?._id || data.user?.id, token: data.token, ...user };
};

test.beforeAll(async ({ request }) => {
  base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';

  // Provision the AdminOwner against the same DB the backend uses.
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) must be set to prep the admin account');
  const repoRoot = path.resolve(process.cwd(), '..');
  execFileSync('node', ['backend/scripts/e2e-admin-prep.js'], {
    cwd: repoRoot,
    env: {
      ...process.env,
      MONGODB_URI: uri,
      E2E_ADMIN_USERNAME: ADMIN_USERNAME,
      E2E_ADMIN_PASSWORD: ADMIN_PASSWORD,
      E2E_ADMIN_TOTP_SECRET: TOTP_SECRET,
      E2E_ADMIN_OWNER_KEY: ADMIN_OWNER_KEY
    },
    stdio: 'pipe'
  });

  // Reporter + target user, conversation, message.
  const reporter = await register(request, 'abuser');
  reporterToken = reporter.token;
  const reported = await register(request, 'abusetgt');
  reportedUserId = reported.id;

  const conv = await request.post(`${base}/api/chat/conversation`, {
    headers: { Authorization: `Bearer ${reporterToken}` },
    data: { userId: reportedUserId }
  });
  expect(conv.status()).toBe(200);

  const msg = await request.post(`${base}/api/chat/messages`, {
    headers: { Authorization: `Bearer ${reporterToken}` },
    data: { content: 'this is a test message to report', conversationId: (await conv.json()).conversation?._id || (await conv.json()).conversation?.id }
  });
  expect(msg.status()).toBe(201);
  messageId = (await msg.json()).message?._id || (await msg.json()).message?.id;
});

test('abuse report: user reports a message → report persisted', async ({ request }) => {
  const res = await request.post(`${base}/api/chat/messages/${messageId}/report`, {
    headers: { Authorization: `Bearer ${reporterToken}` },
    data: { reason: 'harassment', details: 'e2e abuse report test' }
  });
  expect(res.status()).toBe(201);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.reportId).toBeTruthy();
});

test('abuse report: admin lists and resolves the report', async ({ request }) => {
  // Admin login step 1 (username + password → preAuthToken).
  const step1 = await request.post(`${base}/api/system-gateway-x9k/auth/login`, {
    data: { username: ADMIN_USERNAME, password: ADMIN_PASSWORD }
  });
  expect(step1.status()).toBe(200);
  const step1Body = await step1.json();
  expect(step1Body.requiresTwoFactor).toBe(true);
  const preAuthToken = step1Body.preAuthToken;
  expect(preAuthToken).toBeTruthy();

  // Step 2 (TOTP → access token).
  const step2 = await request.post(`${base}/api/system-gateway-x9k/auth/verify-2fa`, {
    data: { preAuthToken, code: totp(TOTP_SECRET) }
  });
  expect(step2.status()).toBe(200);
  const step2Body = await step2.json();
  expect(step2Body.accessToken).toBeTruthy();
  const adminToken = step2Body.accessToken;

  // The report shows up in the admin abuse-reports list.
  const list = await request.get(`${base}/api/admin/abuse-reports`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  expect(list.status()).toBe(200);
  const listBody = await list.json();
  const reports = listBody.reports || [];
  const ours = reports.find((r) => String(r.reportedContentId) === String(messageId));
  expect(ours).toBeTruthy();
  expect(ours.category).toBe('harassment');
  expect(ours.status).toBe('pending');

  // Admin resolves it.
  const resolve = await request.patch(`${base}/api/admin/abuse-reports/${ours._id}/status`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    data: { status: 'resolved', adminNotes: 'e2e: verified and resolved', actionTaken: 'warning_sent' }
  });
  expect(resolve.status()).toBe(200);
  const resolveBody = await resolve.json();
  expect(resolveBody.report.status).toBe('resolved');
  expect(resolveBody.report.resolvedBy).toBeTruthy();
});
