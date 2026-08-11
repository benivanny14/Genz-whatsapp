import { test, expect } from '@playwright/test';

// Guards the scoped ErrorBoundary around the Deleted Messages modal body:
// even when the API returns a malformed payload (messages not an array), the
// modal shell + close button and the rest of the GENZMods page must stay
// alive — an inline "Component error. Retry" — never a blanked page.
const PASSWORD = 'GenzTest@2026!';

test('malformed deleted-messages payload is contained by the modal boundary', async ({ page, request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const api = `${base}/api`;
  const ts = Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  const phone = `2559${String(Date.now()).slice(-6)}1`;

  const reg = await request.post(`${api}/auth/register`, {
    data: { username: `bnd_${ts}`, phoneNumber: phone, password: PASSWORD }
  });
  const data = await reg.json();
  expect(data.token).toBeTruthy();

  // The endpoint answers 200 but with a non-array `messages` field.
  await page.route('**/api/genz-mods/deleted-messages', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, messages: { malformed: true } })
    })
  );

  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(phone);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/);

  await page.goto('/genz-mods');
  await page.getByRole('button', { name: /View Deleted Messages/ }).click();

  // The scoped boundary shows the inline fallback instead of blanking the page.
  await expect(page.getByText('Component error.', { exact: true })).toBeVisible({ timeout: 15_000 });

  // The modal shell (title + close button) survived the crash.
  await expect(page.getByText('Deleted Messages', { exact: true })).toBeVisible();

  // Retry re-renders, crashes again on the same malformed payload, and the
  // boundary catches it again — the shell remains responsive.
  await page.getByRole('button', { name: 'Retry' }).click();
  await expect(page.getByText('Component error.', { exact: true })).toBeVisible({ timeout: 15_000 });

  // The close button still works, and the page is still interactive.
  await page.locator('.fixed.inset-0 button').first().click();
  await expect(page.getByText('Deleted Messages', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: /View Deleted Messages/ })).toBeVisible();
});

test('malformed mods settings payload does not blank the page (per-panel boundaries)', async ({ page, request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const api = `${base}/api`;
  const ts = Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
  const phone = `2558${String(Date.now()).slice(-6)}1`;

  const reg = await request.post(`${api}/auth/register`, {
    data: { username: `bns_${ts}`, phoneNumber: phone, password: PASSWORD }
  });
  const data = await reg.json();
  expect(data.token).toBeTruthy();

  // Nested settings arrive as wrong-typed values — each panel must tolerate
  // them (null-safe rendering) and the page shell must stay alive.
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
  await page.waitForURL(/\/chat/);

  await page.goto('/genz-mods');

  // Page shell + panels survive; no full-page error boundary.
  await expect(page.getByRole('heading', { name: 'GENZ Mods', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Anti-Delete', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Auto-Reply', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Media Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Advanced Settings', exact: true })).toBeVisible();
  await expect(page.getByText('Kitu kimekosea', { exact: true })).toBeHidden();
});
