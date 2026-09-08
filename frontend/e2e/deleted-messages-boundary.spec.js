import { test, expect } from '@playwright/test';

/**
 * deleted-messages-boundary.spec.js — GENZ Settings (ex-GENZ Mods) resilience.
 *
 * The standalone /genz-mods page (with its "View Deleted Messages" modal and
 * the page-level heading checks) was removed in a UI rewrite: the features now
 * live in the GENZ Settings overlay inside /chat, where every tab body is
 * wrapped in its own <ErrorBoundary minimal>. The anti-delete message flow
 * itself is exercised in anti-revoke.spec.js.
 *
 * This spec keeps the original intent — malformed/edge payloads must never
 * blank the app — and guards what actually ships today:
 *
 *   1. a malformed genz-mods/settings payload (null-typed nested mods) is
 *      contained: the chat page shell, the GENZ Settings overlay, and the
 *      GENZ Mods tab feature rows all stay alive
 *   2. Anti-Delete stays PREMIUM-gated server-side: a free user who tries to
 *      PUT genzMods.antiDelete gets it silently stripped (never enabled) —
 *      the enforcement anti-revoke.spec.js relies on cannot be bought for free.
 */
const PASSWORD = 'GenzTest@2026!';

test('malformed mods settings payload does not blank the chat or the GENZ Settings overlay', async ({ page, request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const api = `${base}/api`;
  const ts = Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  const phone = `25577${String(Date.now()).slice(-7)}1`;

  const reg = await request.post(`${api}/auth/register`, {
    data: { username: `bnd_${ts}`, phoneNumber: phone, password: PASSWORD }
  });
  const data = await reg.json();
  expect(data.token).toBeTruthy();

  // Nested mods arrive as wrong-typed values — flattening + every tab body
  // must tolerate them (null-safe rendering), and the page shell must survive.
  await page.route('**/api/genz-mods/settings', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        settings: { autoReply: null, ghostMode: null, chatBackgroundMusic: null, antiDeleteStatus: null }
      })
    })
  );

  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(phone);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });

  // Chat page shell alive (sidebar menu button present, no full-page crash).
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible({ timeout: 20_000 });

  // Sidebar menu → GENZ Settings overlay opens.
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByText('GENZ Settings', { exact: true }).click();
  const panel = page.locator('.genz-settings-panel');
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByRole('heading', { name: /Genz Messenger Mods/ })).toBeVisible();

  // The GENZ Mods tab (per-panel ErrorBoundary) renders its feature rows
  // with the null-typed mods intact (free tier: Ghost Mode & friends).
  await panel.getByRole('button', { name: /GENZ Mods/ }).click();
  await expect(panel.getByText('Ghost Mode', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText('Freeze Last Seen', { exact: true })).toBeVisible();

  // The page is still fully interactive: close the overlay (the ArrowLeft svg
  // itself is the close button), chat survives.
  await panel.locator('svg.lucide-arrow-left').click();
  await expect(panel).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
});

test('anti-delete stays premium-gated server-side (free user cannot enable it)', async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const api = `${base}/api`;
  const ts = Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  const phone = `25578${String(Date.now()).slice(-7)}1`;

  const reg = await request.post(`${api}/auth/register`, {
    data: { username: `bns_${ts}`, phoneNumber: phone, password: PASSWORD }
  });
  const data = await reg.json();
  expect(data.token).toBeTruthy();

  // Free user tries to enable the premium Anti-Delete mod through the same
  // endpoint the GENZ Settings toggle uses.
  const put = await request.put(`${api}/genz-mods/settings`, {
    headers: { Authorization: `Bearer ${data.token}` },
    data: { settings: { antiDelete: true } }
  });
  expect(put.ok()).toBe(true);
  const putBody = await put.json();
  // Server responds 200 but with the premium field stripped (never stored).
  expect(putBody.settings.antiDelete).toBe(false);

  // Re-fetch proves it was not persisted.
  const get = await request.get(`${api}/genz-mods/settings`, {
    headers: { Authorization: `Bearer ${data.token}` }
  });
  const getBody = await get.json();
  expect(getBody.settings.antiDelete).toBe(false);
});
