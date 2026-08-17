import { test, expect } from '@playwright/test';

/**
 * Expiring status share token — replaces the removed 'everyone' privacy:
 *   1. the owner mints a 24h token for their (contacts-only) status
 *   2. an anonymous visitor can view that one status with the token
 *   3. without a token (or with a foreign/tampered one) it is denied
 *
 * Verified at both the API level and in a real anonymous browser context.
 */

const PASSWORD = 'GenzTest@2026!';

let poster; // { phone, token }
let statusId;
let shareToken;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const ts = Date.now().toString(36);

  const user = {
    username: `stk_${ts}`,
    phoneNumber: `25574${String(Date.now()).slice(-7)}`,
    password: PASSWORD
  };
  const reg = await request.post(`${base}/api/auth/register`, { data: user });
  const regData = await reg.json();
  if (!regData.token) throw new Error(`register failed: ${JSON.stringify(regData)}`);
  poster = { phone: user.phoneNumber, token: regData.token };

  // A contacts-only status — deliberately NOT 'everyone'.
  const created = await request.post(`${base}/api/advanced/status`, {
    headers: { Authorization: `Bearer ${poster.token}` },
    data: { type: 'text', content: 'Secret status for the token test', privacy: 'contacts' }
  });
  const createdData = await created.json();
  if (!createdData.status?._id) throw new Error(`create status failed: ${JSON.stringify(createdData)}`);
  statusId = createdData.status._id;

  // Owner mints the share token.
  const tokenRes = await request.post(`${base}/api/status-advanced/${statusId}/share-token`, {
    headers: { Authorization: `Bearer ${poster.token}` }
  });
  const tokenData = await tokenRes.json();
  if (!tokenData.success || !tokenData.token) throw new Error(`mint token failed: ${JSON.stringify(tokenData)}`);
  shareToken = tokenData.token;
});

test('API: a valid share token lets an anonymous request view a contacts-only status', async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';

  // Without a token: 403 for a non-public status.
  const denied = await request.get(`${base}/api/status/share/${statusId}`);
  expect(denied.status()).toBe(403);

  // With the owner's token: allowed, no auth.
  const allowed = await request.get(`${base}/api/status/share/${statusId}?share=${encodeURIComponent(shareToken)}`);
  expect(allowed.status()).toBe(200);
  const data = await allowed.json();
  expect(data.success).toBe(true);
  expect(data.status.content).toBe('Secret status for the token test');
});

test('API: a foreign or tampered token is denied', async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';

  // Foreign token (validly signed for a DIFFERENT status id).
  const otherRes = await request.post(`${base}/api/advanced/status`, {
    headers: { Authorization: `Bearer ${poster.token}` },
    data: { type: 'text', content: 'Another status', privacy: 'contacts' }
  });
  const other = await otherRes.json();
  const foreign = await request.post(`${base}/api/status-advanced/${other.status._id}/share-token`, {
    headers: { Authorization: `Bearer ${poster.token}` }
  });
  const foreignData = await foreign.json();
  const foreignRes = await request.get(`${base}/api/status/share/${statusId}?share=${encodeURIComponent(foreignData.token)}`);
  expect(foreignRes.status()).toBe(403);

  // Garbage token.
  const garbage = await request.get(`${base}/api/status/share/${statusId}?share=garbage.token`);
  expect(garbage.status()).toBe(403);
});

test('browser: anonymous visitor sees the status with the token, an error without', async ({ browser }) => {
  // Isolated context — no cookies, no auth.
  const context = await browser.newContext();
  const page = await context.newPage();

  // With the token: the shared viewer renders the status.
  await page.goto(`/status/${statusId}?share=${encodeURIComponent(shareToken)}`);
  await expect(page.getByText('Secret status for the token test', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(/Status by/)).toBeVisible();

  await context.close();

  // Without the token: the viewer shows the denial message.
  const plain = await browser.newContext();
  const plainPage = await plain.newPage();
  await plainPage.goto(`/status/${statusId}`);
  await expect(plainPage.getByText(/This status may have been deleted or the link is invalid/)).toBeVisible({ timeout: 15_000 });
  await plain.close();
});
