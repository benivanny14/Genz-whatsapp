import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';

/**
 * E2EE key-fingerprint flow (security):
 *   1. alice + bob register; both register client-generated ECDH P-256 public
 *      keys via POST /api/encryption/keys/public
 *   2. bob sends a genuine E2EE envelope through POST /api/chat/messages
 *   3. the server stamps it: e2eeKeyFingerprint (SHA-256 of the envelope's
 *      senderPublicKey) + e2eeKeyStatus ('current'), served back via the
 *      messages API
 *   4. alice logs in via the UI, opens the conversation → the decrypted text
 *      renders with the key badge; after marking bob verified, the badge
 *      shows "✓ verified" with the fingerprint.
 *
 * Requires the single-origin stack (backend serves UI + API) and
 * MONGODB_URI (or MONGO_URI) pointing at the backend's database.
 */

const PASSWORD = 'GenzTest@2026!';
let base;
let alice;
let bob;
let aliceKeys;
let bobKeys;
let conversationId;
let fingerprint;

const subtle = crypto.webcrypto.subtle;

const register = async (request, prefix) => {
  const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const user = {
    username: `${prefix}_${ts}`,
    phoneNumber: `255746${String(Date.now() + Math.floor(Math.random() * 100000)).slice(-6)}7`,
    password: PASSWORD
  };
  const res = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await res.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  return { id: data.user?._id || data.user?.id, token: data.token, ...user };
};

const makeKeyPair = async () => {
  const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  return {
    pair,
    publicJwk: await subtle.exportKey('jwk', pair.publicKey),
    privateJwk: await subtle.exportKey('jwk', pair.privateKey)
  };
};

// Same envelope shape as frontend/src/services/encryptionService.js.
const buildEnvelope = async (senderKeys, recipientPublicJwk, text) => {
  const iv = crypto.webcrypto.getRandomValues(new Uint8Array(12));
  const recipientKey = await subtle.importKey(
    'jwk',
    recipientPublicJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
  const shared = await subtle.deriveKey(
    { name: 'ECDH', public: recipientKey },
    senderKeys.pair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
  const ciphertext = await subtle.encrypt(
    { name: 'AES-GCM', iv },
    shared,
    new TextEncoder().encode(text)
  );
  return JSON.stringify({
    version: 1,
    algorithm: 'ECDH-P256+AES-256-GCM',
    iv: Buffer.from(iv).toString('base64'),
    ciphertext: Buffer.from(ciphertext).toString('base64'),
    senderPublicKey: senderKeys.publicJwk,
    createdAt: new Date().toISOString()
  });
};

test.beforeAll(async ({ request }) => {
  base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';

  alice = await register(request, 'e2eealice');
  bob = await register(request, 'e2eebob');

  aliceKeys = await makeKeyPair();
  bobKeys = await makeKeyPair();

  const registerKeys = async (token, keys) => {
    const res = await request.post(`${base}/api/encryption/keys/public`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { publicKey: keys.publicJwk }
    });
    expect(res.status()).toBe(200);
  };
  await registerKeys(alice.token, aliceKeys);
  await registerKeys(bob.token, bobKeys);

  const conv = await request.post(`${base}/api/chat/conversation`, {
    headers: { Authorization: `Bearer ${bob.token}` },
    data: { userId: alice.id }
  });
  expect(conv.status()).toBe(200);
  conversationId = (await conv.json()).conversation?._id || (await conv.json()).conversation?.id;

  const envelope = await buildEnvelope(bobKeys, aliceKeys.publicJwk, 'fingerprint flow secret');
  const msg = await request.post(`${base}/api/chat/messages`, {
    headers: { Authorization: `Bearer ${bob.token}` },
    data: { content: envelope, conversationId }
  });
  expect(msg.status()).toBe(201);
  fingerprint = (await msg.json()).message?.e2eeKeyFingerprint;
});

test('e2ee fingerprint: server stamps the E2EE message and serves it back', async ({ request }) => {
  expect(fingerprint).toMatch(/^[0-9A-F]{8}$/);

  const res = await request.get(`${base}/api/chat/conversations/${conversationId}/messages`, {
    headers: { Authorization: `Bearer ${alice.token}` }
  });
  expect(res.status()).toBe(200);
  const data = await res.json();
  const list = data.messages || data.data?.messages || [];
  const stamped = list.find((m) => m.e2eeKeyFingerprint);
  expect(stamped).toBeTruthy();
  expect(stamped.e2eeKeyStatus).toBe('current');
  expect(stamped.e2eeKeyFingerprint).toBe(fingerprint);
});

test('e2ee fingerprint: alice sees decrypted text + verified badge in the UI', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(alice.phoneNumber);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });

  // Give alice's browser her key pair (as if the keys were already on this
  // device) and mark bob as verified — both live in localStorage.
  await page.evaluate(
    ([keyData, bobUserId, aliceUserId]) => {
      localStorage.setItem(
        `genz_e2ee_keypair_v1_${aliceUserId}`,
        JSON.stringify({ publicKey: keyData.publicJwk, privateKey: keyData.privateJwk })
      );
      const verified = JSON.parse(localStorage.getItem('genz_e2ee_verified_contacts') || '{}');
      verified[bobUserId] = true;
      localStorage.setItem('genz_e2ee_verified_contacts', JSON.stringify(verified));
    },
    [aliceKeys, bob.id, alice.id]
  );

  // Open the conversation with bob and verify the decrypted text appears.
  await page.getByText('e2eebob', { exact: false }).first().click();
  await expect(page.getByText('fingerprint flow secret', { exact: false })).toBeVisible({ timeout: 20_000 });

  // Key badge: fingerprint + verified marker.
  await expect(page.getByText(fingerprint, { exact: false })).toBeVisible();
  await expect(page.getByText('✓ verified', { exact: false })).toBeVisible();
});
