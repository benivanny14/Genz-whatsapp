import { test, expect } from '@playwright/test';

/**
 * GENZSettings tab structure: the six tab contents were extracted into
 * module-level child components (ProfileTab, AppearanceTab, ...) wrapped in
 * scoped <ErrorBoundary>. This spec registers a fresh user, opens the settings
 * panel from the sidebar and clicks through every tab to prove each still
 * renders (no missing ctx field, no broken reference after the refactor).
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5198';
  const ts = Date.now().toString(36);
  const user = { username: `uis_${ts}`, phoneNumber: `255746${String(Date.now()).slice(-6)}7`, password: PASSWORD };
  const reg = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await reg.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  creds = { phone: user.phoneNumber, password: PASSWORD };
});

test('settings: all six tabs render after the boundary extraction', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(creds.phone);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });

  // Sidebar → Menu → GENZ Settings
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'GENZ Settings' }).click();
  await expect(page.getByText('Genz Messenger Mods', { exact: true })).toBeVisible({ timeout: 20_000 });

  const tabs = [
    { label: 'Profile', marker: 'My Profile' },
    { label: 'Theme Engine', marker: 'Theme Store (Packs)' },
    { label: 'GENZ Mods', marker: 'Advanced GENZ Tools' },
    { label: 'Social', marker: 'TM WhatsApp Exclusive Features' },
    { label: 'Privacy', marker: 'Privacy & Protection' },
    { label: 'Advanced', marker: 'View Online History Dashboard' }
  ];

  for (const { label, marker } of tabs) {
    await page.getByRole('button', { name: new RegExp(label) }).click();
    await expect(page.getByText(marker, { exact: false }).first()).toBeVisible({ timeout: 15_000 });
  }

  // Settings panel is still alive after the tour (no boundary fallback fired).
  await expect(page.getByText('Genz Messenger Mods', { exact: true })).toBeVisible();
  await expect(page.getByText('Component error.', { exact: true })).toHaveCount(0);
});
