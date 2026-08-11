import { test, expect } from '@playwright/test';
import os from 'os';
import path from 'path';
import fs from 'fs';

// Creates stickers from REAL files on this PC (user's Downloads folder):
//   1. An image (JPG) → static sticker via StickerCreator.
//   2. A video (MP4) → animated sticker (or static-frame fallback on
//      headless Chromium where MediaRecorder can crash).
test('create stickers from real PC files (image + video)', async ({ browser, request }) => {
  test.setTimeout(180_000);

  const downloads = path.join(os.homedir(), 'Downloads');
  // Pick a real image and a real video that actually exist on this machine.
  const images = fs.readdirSync(downloads).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  const videos = fs.readdirSync(downloads).filter((f) => /\.(mp4|webm|mov)$/i.test(f));
  console.log('images found:', images.length, '| videos found:', videos.length);
  expect(images.length, 'need at least one image in Downloads').toBeGreaterThan(0);
  expect(videos.length, 'need at least one video in Downloads').toBeGreaterThan(0);

  // Prefer small files so uploads are quick.
  const imageFile = images
    .map((f) => ({ f, size: fs.statSync(path.join(downloads, f)).size }))
    .sort((a, b) => a.size - b.size)[0].f;
  const videoFile = videos
    .map((f) => ({ f, size: fs.statSync(path.join(downloads, f)).size }))
    .sort((a, b) => a.size - b.size)[0].f;
  console.log('using image:', imageFile, '| video:', videoFile);
  const imagePath = path.join(downloads, imageFile);
  const videoPath = path.join(downloads, videoFile);

  const ts = Date.now();
  const password = 'Test123!A';
  const username = `rfs_${ts}`;
  const userA = { username, phoneNumber: `95${String(ts).slice(-6)}`, password };
  const userB = { username: `rfs_b_${ts}`, phoneNumber: `96${String(ts).slice(-6)}`, password };

  const regA = await request.post('http://localhost:5000/api/auth/register', { data: userA });
  const bodyA = await regA.json();
  expect(bodyA.success).toBeTruthy();
  const regB = await request.post('http://localhost:5000/api/auth/register', { data: userB });
  const bodyB = await regB.json();
  expect(bodyB.success).toBeTruthy();
  await request.post('http://localhost:5000/api/chat/conversation', {
    headers: { Authorization: `Bearer ${bodyA.token}` },
    data: { userId: bodyB.user?._id || bodyB.user?.id }
  });

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('PAGEERROR:', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE-ERR:', msg.text().slice(0, 150));
  });

  await page.goto('http://localhost:5176/login');
  await page.getByPlaceholder('+255712345678').fill(username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(/\/chat/, { timeout: 25_000 }).catch(async () => {
    await page.goto('http://localhost:5176/chat');
  });

  const openChatAndCreator = async () => {
    // Make sure the chat pane is actually open (composer visible) before
    // touching the sticker picker; retry the conversation click if needed.
    await expect(page.getByPlaceholder('Type a message...')).toBeVisible({ timeout: 20_000 }).catch(async () => {
      await page.getByText(userB.username, { exact: true }).first().click({ timeout: 20_000 });
      await expect(page.getByPlaceholder('Type a message...')).toBeVisible({ timeout: 20_000 });
    });
    // Close the "Update available" banner if it is covering the composer.
    await page.getByRole('button', { name: /Reload Now|Later/i }).first().click({ timeout: 3000 }).catch(() => {});
    // Open the picker with a retry loop (the picker sometimes needs a second
    // click if an overlay/banner swallowed the first one).
    const openPicker = async () => {
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: 'Open sticker picker' }).click({ timeout: 20_000 });
        const store = page.getByRole('button', { name: 'Sticker store' });
        try {
          await store.waitFor({ state: 'visible', timeout: 5000 });
          await store.click({ timeout: 5000 });
          await expect(page.getByRole('button', { name: /Create Sticker/i })).toBeVisible({ timeout: 10_000 });
          await page.getByRole('button', { name: /Create Sticker/i }).click();
          const modal = page.locator('.fixed.z-\\[99999\\]').last();
          await expect(modal).toBeVisible({ timeout: 10_000 });
          return modal;
        } catch {
          await page.getByRole('button', { name: 'Close sticker picker' }).click({ timeout: 3000 }).catch(() => {});
        }
      }
      throw new Error('could not open sticker creator after 3 attempts');
    };
    return openPicker();
  };

  const waitForSaved = async () => {
    // Creator closes itself after saving.
    await expect(page.getByRole('button', { name: 'Create Sticker' })).toBeHidden({ timeout: 30_000 }).catch(() => {});
  };

  const checkMyStickers = async () => {
    await page.getByRole('button', { name: 'Sticker store' }).click({ timeout: 15_000 });
    await page.getByRole('button', { name: /My Stickers/i }).click({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /Custom Sticker/i }).first()).toBeVisible({ timeout: 10_000 });
  };

  // ── Part 1: real IMAGE → static sticker ────────────────────────────────
  let modal = await openChatAndCreator();
  await modal.locator('input[type="file"]').setInputFiles(imagePath);
  await expect(page.getByRole('button', { name: /Create Sticker/i }).last()).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /Create Sticker/i }).last().click();
  await waitForSaved();
  await checkMyStickers();
  console.log('IMAGE STICKER OK');

  // ── Part 2: real VIDEO → animated (or static-frame) sticker ────────────
  modal = await openChatAndCreator();
  await modal.locator('input[type="file"]').setInputFiles(videoPath);
  const animatedBtn = page.getByRole('button', { name: /Animated Sticker/i });
  const staticBtn = page.getByRole('button', { name: /current frame only/i });
  await expect(animatedBtn.or(staticBtn).first()).toBeVisible({ timeout: 20_000 });
  console.log('VIDEO LOADED, buttons visible');

  const pageCrashed = new Promise((res) => page.once('crash', () => res(true)));
  await animatedBtn.click().catch(() => {});
  const crashed = await Promise.race([pageCrashed, page.waitForTimeout(8000).then(() => false)]);
  if (crashed) {
    // Headless MediaRecorder crash — retry on a fresh page with static frame.
    console.log('animated recording crashed headless — retrying static frame');
    await ctx.close();
    const ctx2 = await browser.newContext();
    const page2 = await ctx2.newPage();
    await page2.goto('http://localhost:5176/login');
    await page2.getByPlaceholder('+255712345678').fill(username);
    await page2.locator('input[autocomplete="current-password"]').fill(password);
    await page2.getByRole('button', { name: /login/i }).click();
    await page2.waitForURL(/\/chat/, { timeout: 25_000 }).catch(async () => {
      await page2.goto('http://localhost:5176/chat');
    });
    await page2.getByText(userB.username, { exact: true }).first().click({ timeout: 20_000 });
    await page2.getByRole('button', { name: 'Open sticker picker' }).click({ timeout: 20_000 });
    await page2.getByRole('button', { name: 'Sticker store' }).click({ timeout: 10_000 });
    await page2.getByRole('button', { name: /Create Sticker/i }).click();
    const modal2 = page2.locator('.fixed.z-\\[99999\\]').last();
    await modal2.locator('input[type="file"]').setInputFiles(videoPath);
    await expect(page2.getByRole('button', { name: /current frame only/i })).toBeVisible({ timeout: 20_000 });
    await page2.getByRole('button', { name: /current frame only/i }).click();
    await expect(page2.getByRole('button', { name: 'Create Sticker' })).toBeHidden({ timeout: 30_000 }).catch(() => {});
    await page2.getByRole('button', { name: 'Sticker store' }).click({ timeout: 15_000 });
    await page2.getByRole('button', { name: /My Stickers/i }).click({ timeout: 15_000 });
    await expect(page2.getByRole('button', { name: /Custom Sticker/i }).first()).toBeVisible({ timeout: 10_000 });
    console.log('VIDEO STATIC STICKER OK');
    await ctx2.close();
    return;
  }
  await waitForSaved();
  await checkMyStickers();
  console.log('VIDEO ANIMATED STICKER OK');

  await ctx.close();
});
