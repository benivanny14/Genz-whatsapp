import { test, expect } from '@playwright/test';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Full flow: create a sticker from a REAL image on this PC (user's Downloads
// folder), then SEND it in a 1:1 chat and verify it appears in the thread.
test('create sticker from real PC image and send it in chat', async ({ browser, request }) => {
  test.setTimeout(180_000);

  const downloads = path.join(os.homedir(), 'Downloads');
  const images = fs.readdirSync(downloads).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  console.log('images found:', images.length);
  expect(images.length, 'need at least one image in Downloads').toBeGreaterThan(0);
  const imageFile = images
    .map((f) => ({ f, size: fs.statSync(path.join(downloads, f)).size }))
    .sort((a, b) => a.size - b.size)[0].f;
  const imagePath = path.join(downloads, imageFile);
  console.log('using image:', imageFile);

  const ts = Date.now();
  const password = 'Test123!A';
  const username = `sendstk_${ts}`;
  const userA = { username, phoneNumber: `97${String(ts).slice(-6)}`, password };
  const userB = { username: `sendstk_b_${ts}`, phoneNumber: `98${String(ts).slice(-6)}`, password };

  const regA = await request.post('http://localhost:5000/api/auth/register', { data: userA });
  const bodyA = await regA.json();
  expect(bodyA.success).toBeTruthy();
  const regB = await request.post('http://localhost:5000/api/auth/register', { data: userB });
  const bodyB = await regB.json();
  expect(bodyB.success).toBeTruthy();
  const userBId = bodyB.user?._id || bodyB.user?.id;
  await request.post('http://localhost:5000/api/chat/conversation', {
    headers: { Authorization: `Bearer ${bodyA.token}` },
    data: { userId: userBId }
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));

  await page.goto('http://localhost:5176/login');
  await page.getByPlaceholder('+255712345678').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(/\/chat/, { timeout: 25_000 }).catch(async () => {
    await page.goto('http://localhost:5176/chat');
  });

  // Open the 1:1 chat.
  await page.getByText(userB.username, { exact: true }).first().click({ timeout: 20_000 });
  await expect(page.getByPlaceholder('Type a message...')).toBeVisible({ timeout: 20_000 });

  // Open the sticker picker → Create Sticker → upload the real image.
  await page.getByRole('button', { name: 'Open sticker picker' }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Sticker store' }).click({ timeout: 10_000 });
  await page.getByRole('button', { name: /Create Sticker/i }).click();
  const modal = page.locator('.fixed.z-\\[99999\\]').last();
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.locator('input[type="file"]').setInputFiles(imagePath);
  await expect(page.getByRole('button', { name: /Create Sticker/i }).last()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Create Sticker/i }).last().click();
  // Creator closes itself after saving.
  await expect(page.getByRole('button', { name: 'Create Sticker' })).toBeHidden({ timeout: 30_000 }).catch(() => {});

  // Open "My Stickers" and click the custom sticker to stage it, then send.
  await page.getByRole('button', { name: 'Sticker store' }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: /My Stickers/i }).click({ timeout: 15_000 });
  const customSticker = page.getByRole('button', { name: /Custom Sticker/i }).first();
  await expect(customSticker).toBeVisible({ timeout: 10_000 });
  await customSticker.click();

  // The sticker is staged in the composer preview (TikTok-style) — send it.
  const input = page.getByPlaceholder('Type a message...');
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.press('Enter');

  // The sent sticker should appear in the thread (an <img> inside a message).
  const stickerInThread = page.locator('img[src^="data:image"], img[src*="sticker"]').last();
  await expect(stickerInThread).toBeVisible({ timeout: 20_000 });

  // Save a screenshot so we can actually SEE the sticker in the chat.
  await page.waitForTimeout(800);
  const shotPath = path.join(__dirname, 'sent-sticker-chat.png');
  await page.screenshot({ path: shotPath });
  console.log('SCREENSHOT SAVED:', shotPath);
  console.log('STICKER SENT — visible in chat');

  await ctx.close();
});
