import { test, expect } from '@playwright/test';
import { chromium as chromiumLauncher } from 'playwright';
import path from 'path';

test.setTimeout(120_000);

test('record and upload voice note', async () => {
  // register a temporary user via backend API
  const ts = Date.now();
  const username = `e2e_user_${ts}`;
  const phone = `1000${String(ts).slice(-6)}`;
  const password = 'Test123!A';

  const register = await test.request.post('http://localhost:5000/api/auth/register', {
    data: { username, phoneNumber: phone, password }
  });
  const regBody = await register.json();
  expect(regBody.success).toBeTruthy();

  // prepare fake audio file path (existing WAV produced earlier)
  const fakeAudio = path.resolve(__dirname, '..', 'backend', 'uploads', 'test-1780232918144.wav');

  // launch Chromium with fake audio input
  const browser = await chromiumLauncher.launch({
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${fakeAudio}`
    ]
  });

  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();

  // set tokens in localStorage so frontend is authenticated
  await page.goto('http://localhost:5176/');
  await page.evaluate(([token, refresh, user]) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('user', JSON.stringify(user));
  }, [regBody.token, regBody.refreshToken, regBody.user]);

  // go to chat and wait for record button
  await page.goto('http://localhost:5176/chat');
  const recordBtn = page.locator('button[title*="Shikilia rekodi"]');
  await expect(recordBtn).toBeVisible({ timeout: 15_000 });

  // start press-and-hold (simulate mouse down for 2s)
  const box = await recordBtn.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1800);
  await page.mouse.up();

  // wait for the upload network request and verify success
  const uploadResp = await page.waitForResponse((r) => r.url().includes('/api/media/upload') && r.request().method() === 'POST', { timeout: 15_000 });
  expect(uploadResp.status()).toBeGreaterThanOrEqual(200);
  expect(uploadResp.status()).toBeLessThan(300);

  await browser.close();
});
