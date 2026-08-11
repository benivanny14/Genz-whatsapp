import { test, expect } from '@playwright/test';
import { chromium as chromiumLauncher } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// CI clones have no backend/uploads, so synthesize a small silent WAV for
// --use-file-for-fake-audio-capture when the fixture is missing.
const ensureFakeAudio = (file) => {
  if (existsSync(file)) return;
  const sampleRate = 16000;
  const seconds = 2;
  const numSamples = sampleRate * seconds;
  const buffer = Buffer.alloc(44 + numSamples * 2); // silence = zero samples
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, buffer);
};

test.setTimeout(120_000);

test('record and upload voice note', async ({ request }) => {
  // register two temporary users via backend API
  const ts = Date.now();
  const username = `e2e_user_${ts}`;
  const phone = `1000${String(ts).slice(-6)}`;
  const password = 'Test123!A';

  const register = await request.post('http://localhost:5000/api/auth/register', {
    data: { username, phoneNumber: phone, password }
  });
  const regBody = await register.json();
  expect(regBody.success).toBeTruthy();

  // second user so the first one has a conversation to open
  const usernameB = `e2e_contact_${ts}`;
  const phoneB = `2000${String(ts).slice(-6)}`;
  const registerB = await request.post('http://localhost:5000/api/auth/register', {
    data: { username: usernameB, phoneNumber: phoneB, password }
  });
  const regBodyB = await registerB.json();
  expect(regBodyB.success).toBeTruthy();
  const contactId = regBodyB.user?._id || regBodyB.user?.id;
  expect(contactId).toBeTruthy();

  // as user A, create a conversation with user B so the chat opens
  const conv = await request.post('http://localhost:5000/api/chat/conversation', {
    headers: { Authorization: `Bearer ${regBody.token}` },
    data: { userId: contactId }
  });
  expect(conv.status()).toBeGreaterThanOrEqual(200);
  expect(conv.status()).toBeLessThan(300);

  // prepare fake audio file path (generated if missing, e.g. on CI)
  const fakeAudio = path.resolve(__dirname, '..', '..', 'backend', 'uploads', 'test-1780232918144.wav');
  ensureFakeAudio(fakeAudio);

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

  // Log in through the UI so the httpOnly session cookie is set in the browser
  // (the app no longer restores sessions from localStorage tokens).
  await page.goto('http://localhost:5176/login');
  await page.getByPlaceholder('+255712345678').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: /login/i }).click();

  // go to chat and open the conversation with user B
  await page.waitForURL(/\/chat/, { timeout: 25_000 }).catch(async () => {
    await page.goto('http://localhost:5176/chat');
  });
  await page.getByText(usernameB, { exact: true }).first().click({ timeout: 15_000 });

  const recordBtn = page.locator('button[title*="Shikilia rekodi"]');
  await expect(recordBtn).toBeVisible({ timeout: 15_000 });

  // Dismiss the "Update available" banner if present — it overlays the mic
  // button and would swallow the press-and-hold gesture.
  const laterBtn = page.getByRole('button', { name: 'Later' });
  if (await laterBtn.isVisible().catch(() => false)) {
    await laterBtn.click();
  }
  await page.waitForTimeout(500);

  // start press-and-hold (simulate mouse down for ~3s)
  const box = await recordBtn.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

  // wait for the upload network request and verify success (register first)
  const uploadRespPromise = page.waitForResponse(
    (r) => r.url().includes('/api/media/upload') && r.request().method() === 'POST',
    { timeout: 20_000 }
  );

  await page.mouse.down();
  await page.waitForTimeout(2800);
  await page.mouse.up();

  const uploadResp = await uploadRespPromise;
  expect(uploadResp.status()).toBeGreaterThanOrEqual(200);
  expect(uploadResp.status()).toBeLessThan(300);

  await browser.close();
});
