import { test, expect } from '@playwright/test';

/**
 * Privacy permission selectors (PrivacyPermissionSelector) — the WhatsApp-style
 * radio list with auto-save. This spec registers a fresh user, opens Settings
 * → Privacy, switches a permission (Profile photo → Nobody), confirms the
 * checkmark moves and the choice persists to the server via /api/settings.
 */
const PASSWORD = 'GenzTest@2026!';

let creds;
let accessToken;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const ts = Date.now().toString(36);
  const user = { username: `prv_${ts}`, phoneNumber: `255747${String(Date.now()).slice(-6)}7`, password: PASSWORD };
  const reg = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await reg.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  accessToken = data.token;
  creds = { phone: user.phoneNumber, password: PASSWORD };
});

test('privacy: switch Profile photo to Nobody and verify it persists', async ({ page, request }) => {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(creds.phone);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });

  // Sidebar → Menu → Settings (main WhatsApp settings, not GENZ Settings)
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForURL(/\/settings/, { timeout: 20_000 });

  // Privacy tab
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();

  // The "Who can see my personal info" section renders all four selectors.
  await expect(page.getByText('Who can see my personal info', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('main').getByText('Profile photo', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('About', { exact: true })).toBeVisible();
  await expect(page.getByRole('main').getByText('Status', { exact: true })).toBeVisible();

  // Initial state: Profile photo is 'everyone' — its option row shows the
  // green checkmark (the checkmark SVG path is unique to the selected row).
  const profilePhotoSection = page
    .locator('div')
    .filter({ has: page.getByText('Profile photo', { exact: true }) })
    .last();
  await expect(profilePhotoSection.getByText('Everyone', { exact: true })).toBeVisible();

  // Switch Profile photo → Nobody (auto-save, WhatsApp behavior).
  await profilePhotoSection.getByRole('button', { name: 'Nobody' }).click();

  // Checkmark moved to the Nobody row inside that section.
  await expect(profilePhotoSection.getByRole('button', { name: 'Nobody' })).toContainText('No one can see this information');

  // Server-side persistence: settings API reflects the new value.
  const settingsRes = await request.get(`${process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174'}/api/settings`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const settingsData = await settingsRes.json();
  expect(settingsData.settings.privacy.profilePhoto).toBe('nobody');
});

test('privacy: My Contacts Except... opens the contact selector', async ({ page }) => {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(creds.phone);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });

  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForURL(/\/settings/, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();

  const profilePhotoSection = page
    .locator('div')
    .filter({ has: page.getByText('Profile photo', { exact: true }) })
    .last();
  await profilePhotoSection.getByRole('button', { name: 'My Contacts Except...' }).click();

  // The full-screen ContactSelectorScreen opens (window.openContactSelector).
  await expect(page.getByText('Choose Contacts', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Selected (0)', { exact: true })).toBeVisible();
  await expect(page.getByText('Select All', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Search by name or phone number')).toBeVisible();
});
