import { test, expect, chromium } from '@playwright/test';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// MUST run with `--headed`: animated sticker creation records a WebM via
// MediaRecorder, which crashes headless Chromium but works in a real (headed)
// browser. Verifies the whole flow on a REAL browser:
//   1. A real MP4 from this PC is uploaded to StickerCreator.
//   2. "Create Animated Sticker" produces a looping WebM sticker.
//   3. The sticker is sent in a chat and PLAYS (video.currentTime advances).
test('send animated video sticker and verify it plays in chat', async ({ request }) => {
  test.setTimeout(180_000);

  const downloads = path.join(os.homedir(), 'Downloads');
  const videos = fs.readdirSync(downloads).filter((f) => /\.(mp4|webm|mov)$/i.test(f));
  expect(videos.length, 'need at least one video in Downloads').toBeGreaterThan(0);
  const videoFile = videos
    .map((f) => ({ f, size: fs.statSync(path.join(downloads, f)).size }))
    .filter((v) => v.size > 400_000) // skip tiny files that may not be real playable clips
    .sort((a, b) => a.size - b.size)[0]?.f || videos
      .map((f) => ({ f, size: fs.statSync(path.join(downloads, f)).size }))
      .sort((a, b) => a.size - b.size)[0].f;
  const videoPath = path.join(downloads, videoFile);
  console.log('using video:', videoFile);

  const ts = Date.now();
  const password = 'Test123!A';
  const username = `anim_${ts}`;
  const userA = { username, phoneNumber: `81${String(ts).slice(-6)}`, password };
  const userB = { username: `anim_b_${ts}`, phoneNumber: `82${String(ts).slice(-6)}`, password };

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

  // Software rendering flags: MediaRecorder canvas capture can crash on VMs/
  // remote desktops without GPU — SwiftShader avoids that.
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
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

  // StickerCreator with the real video.
  await page.getByRole('button', { name: 'Open sticker picker' }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Sticker store' }).click({ timeout: 10_000 });
  await page.getByRole('button', { name: /Create Sticker/i }).click();
  const modal = page.locator('.fixed.z-\\[99999\\]').last();
  await expect(modal).toBeVisible({ timeout: 10_000 });
  await modal.locator('input[type="file"]').setInputFiles(videoPath);

  // Wait for the video preview to load and the animated button to enable.
  // Ensure the video preview actually loaded (has dimensions) before recording.
  await page.waitForTimeout(1000);
  const vidInfo = await page.locator('.fixed.z-\\[99999\\] video').evaluate((v) => ({
    w: v.videoWidth, h: v.videoHeight, dur: v.duration, paused: v.paused
  })).catch(() => null);
  console.log('video preview loaded:', JSON.stringify(vidInfo));
  expect(vidInfo?.w, 'video preview must load (has videoWidth)').toBeGreaterThan(0);

  const animatedBtn = page.getByRole('button', { name: /Create Animated Sticker/i });
  await expect(animatedBtn).toBeVisible({ timeout: 20_000 });
  await animatedBtn.click();

  // Watch for an inline error message while recording/saving.
  const inlineError = page.locator('.fixed.z-\\[99999\\] .bg-red-900\\/30');
  const errPromise = inlineError.textContent({ timeout: 40_000 }).catch(() => null);

  // Animated creation records ~3s of WebM; the creator closes after saving.
  await expect(page.getByRole('button', { name: 'Create Sticker' })).toBeHidden({ timeout: 45_000 }).catch(async () => {
    const errText = await errPromise;
    const stillThere = await page.locator('.fixed.z-\\[99999\\]').count();
    console.log('creator did not close; inline error =', JSON.stringify(errText), '| modal count =', stillThere);
    throw new Error('creator did not close after animated creation: ' + (errText || 'no error shown'));
  });
  console.log('ANIMATED STICKER CREATED (real browser)');

  // Open "My Stickers" — the custom sticker is a <video> (animated).
  await page.getByRole('button', { name: 'Sticker store' }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: /My Stickers/i }).click({ timeout: 15_000 });
  await expect(page.locator('video').last()).toBeVisible({ timeout: 10_000 });
  console.log('ANIMATED STICKER IS A VIDEO ELEMENT');

  // Send it: click the sticker to stage it, then Enter.
  await page.locator('video').last().click();
  const input = page.getByPlaceholder('Type a message...');
  await expect(input).toBeVisible({ timeout: 10_000 });
  await input.press('Enter');

  // It should appear in the chat as a playing video sticker.
  const sentVideo = page.locator('video').last();
  await expect(sentVideo).toBeVisible({ timeout: 20_000 });

  // Give the video a moment to load its metadata and start playing.
  await page.waitForTimeout(2500);
  const info1 = await sentVideo.evaluate((v) => ({
    paused: v.paused, muted: v.muted, readyState: v.readyState,
    duration: v.duration, currentTime: v.currentTime, src: (v.currentSrc || v.src || '').slice(0, 60)
  })).catch((e) => ({ evalError: String(e) }));
  console.log('sent video info:', JSON.stringify(info1));

  // Verify it actually PLAYS: the video must not be paused, must have loaded
  // its metadata, and its playhead must move (it loops, so the time can wrap
  // back to 0 — any change proves frames are rendering).
  expect(info1.paused).toBe(false);
  expect(info1.readyState).toBeGreaterThanOrEqual(2);
  const time1 = await sentVideo.evaluate((v) => v.currentTime);
  await page.waitForTimeout(1500);
  const time2 = await sentVideo.evaluate((v) => v.currentTime);
  const dur = await sentVideo.evaluate((v) => v.duration || 0);
  console.log('video currentTime t1=', time1.toFixed(2), 't2=', time2.toFixed(2), 'dur=', dur.toFixed(2));
  const advanced = time2 > time1 || (dur > 0 && time1 > dur - 1.2); // wrapped on loop
  expect(advanced, 'playhead must move (or wrap on loop)').toBe(true);
  console.log('ANIMATED STICKER PLAYS IN CHAT ✓');

  // Save a screenshot for visual proof.
  const shotPath = path.join(__dirname, 'sent-animated-sticker.png');
  await page.screenshot({ path: shotPath });
  console.log('SCREENSHOT SAVED:', shotPath);

  await ctx.close();
});
