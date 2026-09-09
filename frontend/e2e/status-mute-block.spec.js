import { test, expect } from '@playwright/test';

/**
 * Status mute / unmute / block — WhatsApp behaviour, end to end:
 *   1. the viewer mutes a poster from the status row → the poster's group is
 *      flagged muted (bell-off icon, row button becomes "Unmute")
 *   2. unmuting clears the flag and restores the "Mute" action
 *   3. blocking from status hides the poster's group entirely (server-side
 *      filter — the feed refetches after the block)
 *
 * Setup (beforeAll): two fresh users; the poster creates a contacts-privacy
 * status and saves the viewer as a contact so it is visible in the viewer's
 * feed (the server-side contacts check).
 */

const PASSWORD = 'GenzTest@2026!';

let poster; // { phone, password, token }
let viewer; // { phone, password }
let posterUsername;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const ts = Date.now().toString(36);

  const register = async (prefix) => {
    const user = {
      username: `${prefix}_${ts}`,
      phoneNumber: `25574${String(Date.now()).slice(-7)}`,
      password: PASSWORD
    };
    const reg = await request.post(`${base}/api/auth/register`, { data: user });
    const data = await reg.json();
    if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
    return { ...user, phone: user.phoneNumber, token: data.token };
  };

  poster = await register('stp');
  viewer = await register('stv');
  posterUsername = poster.username;

  // Poster creates a contacts-only status via the API (same endpoint the UI uses).
  const created = await request.post(`${base}/api/advanced/status`, {
    headers: { Authorization: `Bearer ${poster.token}` },
    data: { type: 'text', content: 'Mute me test status', privacy: 'contacts' }
  });
  const createdData = await created.json();
  if (!createdData.status?._id) throw new Error(`create status failed: ${JSON.stringify(createdData)}`);

  // Poster saves the viewer as a contact so the contacts-privacy check passes.
  const contact = await request.post(`${base}/api/chat/contacts/add`, {
    headers: { Authorization: `Bearer ${poster.token}` },
    data: { phone: viewer.phone, savedName: 'Status Viewer' }
  });
  if (!contact.ok()) throw new Error(`add contact failed: ${contact.status} ${await contact.text()}`);
});

async function loginAsViewer(page) {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(viewer.phone);
  await page.locator('input[type="password"]').fill(viewer.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });
  await page.goto('/status');
  // Wait until the poster's group is rendered (feed fetched).
  await expect(
    page.locator('[role="button"]').filter({ hasText: posterUsername }).first()
  ).toBeVisible({ timeout: 20_000 });
}

function posterRow(page) {
  return page.locator('[role="button"]').filter({ hasText: posterUsername }).first();
}

test('mute: flags the poster muted via the status row (bell-off → Unmute)', async ({ page }) => {
  await loginAsViewer(page);

  // Open the mute panel from the poster's row.
  await posterRow(page).getByRole('button', { name: 'Mute', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Mute Status Updates' })).toBeVisible();

  // Pick a duration and confirm.
  await page.getByRole('button', { name: '24 Hours', exact: true }).click();
  await page.getByRole('button', { name: 'Mute Status Updates', exact: true }).click();

  // After the refetch the poster's row is flagged muted: the action button
  // now offers "Unmute" (and the bell-off indicator is rendered).
  await expect(posterRow(page).getByRole('button', { name: 'Unmute', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(posterRow(page).getByLabel('Muted status updates')).toBeVisible();
});

test('unmute: clears the muted flag and restores the Mute action', async ({ page }) => {
  await loginAsViewer(page);

  // The poster is still in the feed (muted sinks to the bottom, never hidden).
  await expect(posterRow(page).getByRole('button', { name: 'Unmute', exact: true })).toBeVisible();

  await posterRow(page).getByRole('button', { name: 'Unmute', exact: true }).click();

  await expect(posterRow(page).getByRole('button', { name: 'Mute', exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(posterRow(page).getByLabel('Muted status updates')).toHaveCount(0);
});

test('block: hides the poster from the status feed entirely', async ({ page }) => {
  await loginAsViewer(page);

  // Confirm dialog inside the block panel must be accepted.
  page.on('dialog', (dialog) => dialog.accept());

  await posterRow(page).getByRole('button', { name: 'Block', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Block User' })).toBeVisible();
  await page.getByRole('button', { name: 'Block User', exact: true }).click();

  // Server-side blockedStatusUsers filter: the group disappears after refetch.
  await expect(
    page.locator('[role="button"]').filter({ hasText: posterUsername })
  ).toHaveCount(0, { timeout: 15_000 });
});
