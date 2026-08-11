import { test, expect } from '@playwright/test';

/**
 * Mass-message security (2.8): the REST path (/api/quick-actions/mass-message)
 * must cap recipients at 20 per send and rate-limit at 5 mass messages per
 * hour per user. This spec registers a sender + recipients, creates the
 * 1-to-1 conversations, then drives the endpoint through the guards.
 */
const PASSWORD = 'GenzTest@2026!';

let base;
let senderToken;
let recipientIds = [];

const register = async (request, prefix) => {
  const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const user = {
    username: `${prefix}_${ts}`,
    phoneNumber: `255748${String(Date.now() + Math.floor(Math.random() * 100000)).slice(-6)}7`,
    password: PASSWORD
  };
  const res = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await res.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  return { id: data.user?._id || data.user?.id, token: data.token, ...user };
};

test.beforeAll(async ({ request }) => {
  base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const sender = await register(request, 'msgsnd');
  senderToken = sender.token;
  const senderId = sender.id;

  // Two recipients for the happy path.
  for (let i = 0; i < 2; i++) {
    const r = await register(request, `msgrcv${i}`);
    recipientIds.push(r.id);
    // Create the 1-to-1 conversation sender → recipient (required by the REST path).
    const conv = await request.post(`${base}/api/chat/conversation`, {
      headers: { Authorization: `Bearer ${senderToken}` },
      data: { userId: r.id }
    });
    if (conv.status() !== 200) throw new Error(`conversation create failed: ${conv.status()}`);
  }
});

const sendMass = (request, { token = senderToken, recipients, content = 'hello e2e' } = {}) =>
  request.post(`${base}/api/quick-actions/mass-message`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { recipients, content }
  });

test('mass message: sends to 2 recipients (happy path)', async ({ request }) => {
  const res = await sendMass(request, { recipients: recipientIds, content: 'happy path e2e' });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.success).toBe(true);
  expect(body.sent).toBe(2);
  expect(body.failed).toBe(0);
});

test('mass message: rejects more than 20 recipients', async ({ request }) => {
  const many = [...recipientIds];
  while (many.length < 21) many.push(`nonexistent-user-${many.length}`);
  const res = await sendMass(request, { recipients: many });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.message).toMatch(/20 recipients/);
});

test('mass message: rate-limits a 6th send within the hour', async ({ request }) => {
  // Fresh sender so the earlier happy-path send does not count.
  const fresh = await register(request, 'msglmt');
  const freshId = fresh.id;
  const conv = await request.post(`${base}/api/chat/conversation`, {
    headers: { Authorization: `Bearer ${fresh.token}` },
    data: { userId: recipientIds[0] }
  });
  expect(conv.status()).toBe(200);

  // 5 sends are allowed…
  for (let i = 0; i < 5; i++) {
    const res = await sendMass(request, { token: fresh.token, recipients: [recipientIds[0]] });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
  }

  // …the 6th within the hour is rejected.
  const blocked = await sendMass(request, { token: fresh.token, recipients: [recipientIds[0]] });
  expect(blocked.status()).toBe(429);
  const body = await blocked.json();
  expect(body.message).toBe('Rate limit exceeded');
});
