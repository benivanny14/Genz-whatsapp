import { test, expect } from '@playwright/test';

/**
 * Account switch on the same browser — regression for the device re-assignment
 * fix (registerDevice keyed on deviceId alone).
 *
 * Bug: the browser's localStorage keeps ONE genz_device_id. When user A logs
 * out and user B logs in on the SAME browser, the old code upserted the device
 * record keyed on (localUserId, deviceId) -> E11000 duplicate key (deviceId is
 * unique) -> B's token carried a deviceId claim that never matched -> every
 * authenticated request 401'd with "Session has been logged out on this
 * device" -> the app bounced back to /login in a loop.
 *
 * This spec logs A in, logs A out, logs B in on the SAME browser context
 * (same device id) and asserts the app lands on /chat and STAYS there.
 */

const PASSWORD = 'GenzTest@2026!';

let userA;
let userB;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const ts = Date.now().toString(36);

  const register = async (tag) => {
    const user = {
      username: `sw_${tag}_${ts}`,
      phoneNumber: `25573${String(Date.now()).slice(-7)}`,
      password: PASSWORD
    };
    const res = await request.post(`${base}/api/auth/register`, { data: user });
    const data = await res.json();
    if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
    return user;
  };

  userA = await register('a');
  userB = await register('b');
});

test('logging into a second account on the same browser does not 401-loop', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  const loginAs = async (user) => {
    await page.goto('/login');
    await page.locator('input[autocomplete="tel"]').fill(user.username);
    await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/chat', { timeout: 20_000 });
    // The bug bounced the user back to /login within seconds — give the load
    // storm time to settle and assert we are still on /chat.
    await page.waitForTimeout(5_000);
    expect(new URL(page.url()).pathname).toBe('/chat');
    await expect(page.getByRole('button', { name: 'New Chat' })).toBeVisible();
  };

  // 1) Log in as A.
  await loginAs(userA);
  const deviceIdAfterA = await page.evaluate(() => localStorage.getItem('genz_device_id'));
  expect(deviceIdAfterA).toBeTruthy();

  // 2) Log A out (session clear + hard reload to /login), keeping the device id.
  await page.evaluate(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore */ }
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    sessionStorage.clear();
  });
  await page.goto('/login');

  // 3) Log in as B on the SAME browser (same genz_device_id in localStorage).
  await loginAs(userB);

  // Same device id was reused across accounts — the exact case that 401-looped.
  const deviceIdAfterB = await page.evaluate(() => localStorage.getItem('genz_device_id'));
  expect(deviceIdAfterB).toBe(deviceIdAfterA);

  // The session is truly valid: an authenticated (cookie) request succeeds.
  const meStatus = await page.evaluate(async () => {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    return res.status;
  });
  expect(meStatus).toBe(200);

  await context.close();
});
