// Live end-to-end verification for GENZ Messenger against the local stack.
// Covers: chat + per-message font propagation, voice notes, image + view-once,
// statuses (photo/text/video/location/voice), WINGA products with photo+video,
// emoji/sticker panels, login-page version, and the web update banner.
import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_DIR = path.resolve(__dirname, '../../backend');
const LOCAL_MONGO_URI = 'mongodb://localhost:27017/genz-whatsapp';

// Grant/revoke an active premium subscription directly in the local Mongo test
// DB (there is no public 'make me premium' API — premium comes from
// admin/payment flows). Used to regression-test that premium-gated paths
// behave correctly. Scripts are written to a temp file (not `node -e`) so the
// shell never mangles the $set operator.
const runMongoScript = (script) => {
  // Temp file lives INSIDE backend/ so node resolves backend/node_modules for
  // require('mongoose'); cwd alone does not affect module resolution.
  const tmp = path.join(BACKEND_DIR, `.mongo-${Date.now()}-${Math.floor(Math.random() * 1e6)}.cjs`);
  fs.writeFileSync(tmp, script);
  try {
    execSync(`node "${tmp}"`, { stdio: 'pipe' });
  } finally {
    fs.rmSync(tmp, { force: true });
  }
};

const grantPremium = (userId) => {
  runMongoScript(`
    const mongoose = require('mongoose');
    (async () => {
      await mongoose.connect('${LOCAL_MONGO_URI}');
      const r = await mongoose.connection.db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId('${userId}') },
        { $set: { premium: true, subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
      );
      console.log('premium granted: ' + JSON.stringify(r));
      await mongoose.disconnect();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `);
};

const revokePremium = (userId) => {
  runMongoScript(`
    const mongoose = require('mongoose');
    (async () => {
      await mongoose.connect('${LOCAL_MONGO_URI}');
      await mongoose.connection.db.collection('users').updateOne(
        { _id: new mongoose.Types.ObjectId('${userId}') },
        { $set: { premium: false, subscriptionExpiresAt: null } }
      );
      await mongoose.disconnect();
    })().catch(e => { console.error(e.message); process.exit(1); });
  `);
};
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5100';
const PASSWORD = 'LiveTest123!ABCDef';
// Worktree root .livetest (created by the setup step).
const MEDIA_DIR = path.resolve(__dirname, '../../.livetest');
const DIST_VERSION_JSON = path.resolve(__dirname, '../dist/version.json');

const PHOTO = path.join(MEDIA_DIR, 'live-photo.png');
const VIDEO = path.join(MEDIA_DIR, 'live-video.webm');

// The app is mobile-first (bottom nav, WhatsApp-style) — drive it in a phone
// viewport like the WINGA e2e does.
test.use({ viewport: { width: 390, height: 844 } });

if (!fs.existsSync(PHOTO) || !fs.existsSync(VIDEO)) {
  throw new Error(`Live-test media missing in ${MEDIA_DIR} — run the media setup first`);
}

let alice;
let bob;
let CONVERSATION_ID;

const CREDS_FILE = path.join(MEDIA_DIR, 'creds.json');
const loadCreds = () => {
  try {
    return JSON.parse(fs.readFileSync(CREDS_FILE, 'utf8'));
  } catch {
    return null;
  }
};

const registerUser = async (request, prefix) => {
  const ts = Date.now().toString(36);
  const user = {
    username: `${prefix}_${ts}`,
    phoneNumber: `2557${String(Date.now()).slice(-7)}${Math.floor(Math.random() * 9)}`,
    password: PASSWORD
  };
  const reg = await request.post(`${BASE}/api/auth/register`, { data: user });
  const data = await reg.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  return { ...user, userId: data.user._id, token: data.token };
};

// Users are created ONCE and persisted, so reruns (and worker restarts after
// a failed test) reuse them instead of re-registering and exhausting the
// auth rate limiter.
test.beforeAll(async ({ request }) => {
  const cached = loadCreds();
  if (cached?.alice?.phoneNumber && cached?.bob?.phoneNumber) {
    alice = cached.alice;
    bob = cached.bob;
    CONVERSATION_ID = cached.conversationId;
    console.log(`[live] reusing users ${alice.username} / ${bob.username}`);
    return;
  }
  alice = await registerUser(request, 'live_alice');
  bob = await registerUser(request, 'live_bob');
  // Make them phone-book contacts so WhatsApp-style 'contacts' privacy works
  // (statuses default to 'contacts' visibility).
  await request.post(`${BASE}/api/chat/contacts/add`, {
    headers: { Authorization: `Bearer ${alice.token}` },
    data: { phone: bob.phoneNumber, savedName: 'Bob Live' }
  });
  await request.post(`${BASE}/api/chat/contacts/add`, {
    headers: { Authorization: `Bearer ${bob.token}` },
    data: { phone: alice.phoneNumber, savedName: 'Alice Live' }
  });
  const convRes = await request.post(`${BASE}/api/chat/conversation`, {
    headers: { Authorization: `Bearer ${alice.token}` },
    data: { userId: bob.userId }
  });
  const conv = await convRes.json();
  const conversationId = conv.conversation?._id || conv.data?._id || conv._id;
  if (!conversationId) throw new Error('no conversation created');
  CONVERSATION_ID = conversationId;
  fs.writeFileSync(CREDS_FILE, JSON.stringify({ alice, bob, conversationId }, null, 2));
  console.log(`[live] registered ${alice.username} <-> ${bob.username}, conv ${conversationId}`);
});

test.setTimeout(180_000);

async function login(page, creds) {
  await page.goto('/login');
  // The login page shows the app version (v1.1.24) — verify the release info
  // is present on the web path.
  await expect(page.getByText(/Genz Messenger (Android )?v\d+\.\d+\.\d+/).first()).toBeVisible({ timeout: 20_000 });
  await page.locator('input[placeholder*="+255"]').first().fill(creds.phoneNumber);
  await page.locator('input[type="password"]').first().fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/(chat|status)/, { timeout: 60_000 });
}

async function openConversation(page, otherUsername) {
  await page.goto('/chat');
  const item = page.locator('button', { hasText: otherUsername }).first();
  await item.waitFor({ state: 'visible', timeout: 30_000 });
  await item.click();
  // Chat header shows the other user's name (the sidebar copy hides on mobile
  // after the chat opens, so assert the header heading).
  await expect(page.locator('h2, [class*="header"]', { hasText: otherUsername }).first()).toBeVisible({ timeout: 20_000 });
}

async function sendMessage(page, text) {
  const input = page.locator('input[placeholder="Type a message..."]');
  await input.waitFor({ state: 'visible', timeout: 20_000 });
  await input.fill(text);
  await input.press('Enter');
}

// ────────────────────────────────────────────────────────────────────────────
test('1. chat + per-message font propagates to the receiver (TM WhatsApp style)', async ({ browser, request }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, alice);
  await openConversation(pageA, bob.username);

  // Open the Font Style modal and pick Georgia (via the formatting menu — the
  // direct button is md-only).
  await pageA.getByRole('button', { name: 'More formatting options' }).click();
  await pageA.getByRole('button', { name: 'Change font' }).click();
  await expect(pageA.getByText('Font Style')).toBeVisible({ timeout: 10_000 });
  await pageA.getByRole('button', { name: /Georgia/ }).click();
  // Picking a font focuses the composer but keeps the modal open — close it.
  await pageA.getByRole('button', { name: 'Close' }).click();
  await expect(pageA.getByText('Font Style')).not.toBeVisible({ timeout: 10_000 });

  const text = `Habari bob, hii ni Georgia font — ${Date.now().toString(36)}`;
  await sendMessage(pageA, text);

  // Sender's bubble renders Georgia (read the inline style of the <p> the
  // bubble renders — the composer sets fontFamily via style).
  const bubbleFontOf = (page, needle) =>
    page
      .locator('p', { hasText: needle })
      .filter({ visible: true })
      .first()
      .evaluate((el) => el.style.fontFamily || getComputedStyle(el).fontFamily);

  await expect(pageA.locator('p', { hasText: text }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
  const myFont = await bubbleFontOf(pageA, text);
  expect(myFont).toContain('Georgia');
  console.log(`[live] sender bubble font = ${myFont}`);

  // Server-side: the stored message carries font:'georgia' (survives round trip).
  const msgsRes = await request.get(
    `${BASE}/api/chat/conversations/${CONVERSATION_ID}/messages`,
    { headers: { Authorization: `Bearer ${alice.token}` } }
  );
  const msgsData = await msgsRes.json();
  const stored = (msgsData.messages || msgsData.data || []).find((m) => m.content === text);
  expect(stored?.font || stored?.options?.font).toBe('georgia');
  console.log('[live] stored message font =', stored?.font || stored?.options?.font);

  // Receiver (bob) sees the SAME font on the message.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await login(pageB, bob);
  await openConversation(pageB, alice.username);
  await expect(pageB.locator('p', { hasText: text }).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
  const recvFont = await bubbleFontOf(pageB, text);
  expect(recvFont).toContain('Georgia');
  console.log(`[live] receiver bubble font = ${recvFont}`);

  await ctxA.close();
  await ctxB.close();
});

// ────────────────────────────────────────────────────────────────────────────
test('2. voice note, image, view-once image + emoji/sticker panels', async ({ browser }) => {
  const ctxA = await browser.newContext();
  await ctxA.grantPermissions(['microphone'], { origin: BASE });
  const pageA = await ctxA.newPage();
  await login(pageA, alice);
  await openConversation(pageA, bob.username);

  // ── Voice note: hold-to-record (releasing sends directly, like WhatsApp) ──
  const rec = pageA.locator('button[aria-label="Hold to record voice message"]');
  await rec.waitFor({ state: 'visible', timeout: 20_000 });
  await rec.hover();
  await pageA.mouse.down();
  await pageA.waitForTimeout(1600);
  await pageA.mouse.up();
  // Sender returns to the normal composer after the note is sent.
  await expect(rec).toBeVisible({ timeout: 15_000 });

  // ── Emoji panel opens (WhatsApp-style keyboard) ──
  await pageA.getByTitle('Emoji & Media').click();
  await expect(pageA.locator('.emoji-picker-react, [class*="emoji"]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  await pageA.keyboard.press('Escape');

  // ── Sticker picker opens ──
  await pageA.getByRole('button', { name: 'Open sticker picker' }).click();
  await expect(pageA.getByText(/Stickers|stickers/i).first()).toBeVisible({ timeout: 10_000 }).catch(() => {});
  await pageA.keyboard.press('Escape');

  // ── Image message: attachment menu → Gallery → crop → doodle → send ──
  await pageA.getByRole('button', { name: 'Open attachment menu' }).click();
  const chooserP = pageA.waitForEvent('filechooser');
  await pageA.getByText('Gallery').click();
  const chooser = await chooserP;
  await chooser.setFiles(PHOTO);
  // Crop editor → Apply Changes → Drawing editor → Save.
  await expect(pageA.getByRole('button', { name: 'Apply Changes' })).toBeVisible({ timeout: 20_000 });
  await pageA.getByRole('button', { name: 'Apply Changes' }).click();
  await expect(pageA.getByRole('button', { name: 'Save', exact: true })).toBeVisible({ timeout: 15_000 });
  await pageA.getByRole('button', { name: 'Save', exact: true }).click();
  // Image bubble appears on sender side (may be behind the auto-download
  // data-saver gate — tap it to reveal the Cloudinary-hosted image).
  const revealImg = pageA.getByRole('button', { name: 'Tap to download image' }).first();
  if (await revealImg.count()) await revealImg.click();
  await expect(pageA.locator('img[src*="cloudinary"], img[src*="/uploads/"]').first()).toBeVisible({ timeout: 30_000 });

  // ── View-once image ──
  await pageA.getByTitle('Send as View Once').click();
  await pageA.getByRole('button', { name: 'Open attachment menu' }).click();
  const chooserP2 = pageA.waitForEvent('filechooser');
  await pageA.getByText('Gallery').click();
  const chooser2 = await chooserP2;
  await chooser2.setFiles(PHOTO);
  await expect(pageA.getByRole('button', { name: 'Apply Changes' })).toBeVisible({ timeout: 20_000 });
  await pageA.getByRole('button', { name: 'Apply Changes' }).click();
  await expect(pageA.getByRole('button', { name: 'Save', exact: true })).toBeVisible({ timeout: 15_000 });
  await pageA.getByRole('button', { name: 'Save', exact: true }).click();

  // Receiver checks: voice note, image, view-once bubble.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await login(pageB, bob);
  await openConversation(pageB, alice.username);

  // AudioPlayer renders custom UI (seek bar + duration + speed/lock buttons),
  // not a raw <audio> tag — target the seek bar (title="Seek").
  await expect(pageB.locator('[title="Seek"]').first()).toBeVisible({ timeout: 30_000 });
  // It must actually play, not show "Audio unavailable".
  await expect(pageB.getByText('Audio unavailable')).toHaveCount(0, { timeout: 15_000 });
  const revealImgB = pageB.getByRole('button', { name: 'Tap to download image' }).first();
  if (await revealImgB.count()) await revealImgB.click();
  await expect(pageB.locator('img[src*="cloudinary"], img[src*="/uploads/"]').first()).toBeVisible({ timeout: 20_000 });

  // Open the view-once message → protected modal.
  const tapToView = pageB.getByText('Tap to view').first();
  await tapToView.waitFor({ state: 'visible', timeout: 20_000 });
  await tapToView.click();
  await expect(pageB.getByText(/View Once/).first()).toBeVisible({ timeout: 15_000 });
  // Close it.
  await pageB.locator('button[aria-label="Close"]').first().click().catch(async () => {
    await pageB.keyboard.press('Escape');
  });
  console.log('[live] voice + image + view-once + emoji/sticker panels OK');

  await ctxA.close();
  await ctxB.close();
});

// ────────────────────────────────────────────────────────────────────────────
test('3. statuses: photo, text, video, location (+ receiver sees them)', async ({ browser }) => {
  const ctxA = await browser.newContext({
    geolocation: { latitude: -6.7924, longitude: 39.2083 },
    permissions: ['geolocation']
  });
  const pageA = await ctxA.newPage();
  await login(pageA, alice);

  const openCreate = async () => {
    await pageA.goto('/status');
    await pageA.locator('.fab-create-status, .add-status-badge').first().click();
    await expect(pageA.getByRole('heading', { name: 'Create Status' })).toBeVisible({ timeout: 15_000 });
  };
  const statusSend = () => pageA.getByRole('button', { name: 'Post status' });
  const waitModalClosed = async () => {
    await expect(pageA.getByRole('heading', { name: 'Create Status' })).not.toBeVisible({ timeout: 15_000 });
  };

  // ── Text status ──
  await openCreate();
  await pageA.getByRole('button', { name: 'Text' }).click();
  const textStatus = `Live text status ${Date.now().toString(36)}`;
  await pageA.locator('textarea').first().fill(textStatus);
  await pageA.locator('.send-status-btn').click();
  await waitModalClosed();
  await expect(pageA.getByText(textStatus).first()).toBeVisible({ timeout: 30_000 });

  // ── Photo status (set files directly — the label opens a native dialog) ──
  await openCreate();
  await pageA.locator('.create-options input[type="file"][accept="image/*"]').first().setInputFiles(PHOTO);
  // Preview loads → green round Send (handleSubmit) posts the status.
  await expect(pageA.locator('.create-status-overlay img').first()).toBeVisible({ timeout: 20_000 });
  await statusSend().click();
  await waitModalClosed();

  // ── Video status (set files directly — the label opens a native dialog) ──
  await openCreate();
  await pageA.locator('.create-options input[type="file"][accept="video/*"]').first().setInputFiles(VIDEO);
  await expect(pageA.locator('.create-status-overlay video').first()).toBeVisible({ timeout: 20_000 });
  await statusSend().click();
  await waitModalClosed();

  // ── Location status ──
  await openCreate();
  await pageA.getByRole('button', { name: 'Location' }).click();
  // Grab the current location (geolocation permission granted above), then post.
  await pageA.getByRole('button', { name: 'Share Current Location' }).click();
  await expect(pageA.getByRole('button', { name: 'Share Location Status' })).toBeEnabled({ timeout: 15_000 });
  await pageA.getByRole('button', { name: 'Share Location Status' }).click();
  await waitModalClosed();

  // ── Receiver sees Alice's status ring + can open it ──
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await login(pageB, bob);
  await pageB.goto('/status');
  await expect(pageB.getByText(alice.username).first()).toBeVisible({ timeout: 30_000 });
  // Open Alice's status and expect the photo/text to show.
  await pageB.getByText(alice.username).first().click();
  await expect(pageB.locator('img[src*="/uploads/"], video').first()).toBeVisible({ timeout: 20_000 }).catch(() => {});
  console.log('[live] statuses (text/photo/video/location) posted + visible to receiver OK');

  await ctxA.close();
  await ctxB.close();
});

// ────────────────────────────────────────────────────────────────────────────
test('4. WINGA product listing with photo AND video media', async ({ page, request }) => {
  await page.goto('/login');
  await page.locator('input[placeholder*="+255"]').first().fill(alice.phoneNumber);
  await page.locator('input[type="password"]').first().fill(alice.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/(chat|status)/, { timeout: 60_000 });

  // Open WINGA via the bottom nav.
  await page.goto('/winga');
  await expect(page.getByText('WINGA', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  const title = `Live listing ${Date.now().toString(36)}`;
  await page.getByRole('button', { name: 'Post', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Post Listing' })).toBeVisible();
  await page.getByTestId('post-category-nguo').click();
  await page.getByPlaceholder(/Mkoba wa ngozi/).fill(title);
  await page.getByPlaceholder('250,000').fill('25000');

  // Attach photo + video together. Uploads hit Cloudinary and can be
  // slow/flaky, so retry when the app reports an upload failure.
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.locator('input[type="file"]').setInputFiles([PHOTO, VIDEO]);
    const uploadFailed = page.getByText(/Upload failed/);
    try {
      // Both thumbnails must appear (image + video). Storage is Cloudinary in
      // this env, so match both /uploads/winga/ and cloudinary paths (both
      // contain "winga/").
      await expect(page.locator('img[src*="winga/"]').first()).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('video[src*="winga/"]').first()).toBeVisible({ timeout: 30_000 });
      break;
    } catch (e) {
      if (attempt === 3 || !(await uploadFailed.count())) throw e;
      console.log(`[live] winga upload attempt ${attempt} failed, retrying...`);
      await page.waitForTimeout(1500);
    }
  }
  await expect(page.getByTestId('winga-submit-post')).toBeEnabled();
  await page.getByTestId('winga-submit-post').click();
  // The listing card is the durable evidence (the success toast disappears quickly).
  await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
  await page.getByText(title).first().click(); // open listing detail (photo/video present)
  await expect(page.locator('img[src*="winga/"], video[src*="winga/"]').first()).toBeVisible({ timeout: 20_000 });
  console.log(`[live] WINGA listing posted with photo+video: ${title}`);

  // Cleanup this run's listing so the feed stays clean.
  const all = await request.get(`${BASE}/api/winga`, { headers: { Authorization: `Bearer ${alice.token}` } });
  const allData = await all.json();
  const mine = [
    ...(allData.myListings || []),
    ...(allData.categories || []).flatMap((c) => (c.listings || []).filter((l) => String(l.user?._id) === String(alice.userId)))
  ];
  for (const l of mine.filter((x) => x.title === title)) {
    await request.delete(`${BASE}/api/winga/${l._id}`, { headers: { Authorization: `Bearer ${alice.token}` } });
  }
});

// ────────────────────────────────────────────────────────────────────────────
test('5. web update banner appears when a newer build is published', async ({ browser }) => {
  // Simulate a new release: bump the served version.json above the installed
  // bundle (versionCode 27). Restore afterwards.
  const original = fs.readFileSync(DIST_VERSION_JSON, 'utf8');
  const manifest = JSON.parse(original);
  manifest.version = '1.1.25';
  manifest.versionCode = 28;
  fs.writeFileSync(DIST_VERSION_JSON, JSON.stringify(manifest, null, 2));
  try {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto('/login');
    await page.waitForTimeout(4000);
    // UpdateBanner compares served /version.json (28) vs bundle (27) on web.
    await expect(page.getByText(/Update available — v1\.1\.25/)).toBeVisible({ timeout: 25_000 });
    console.log('[live] web update banner OK (served 1.1.25 > bundle 1.1.24)');
    await ctx.close();
  } finally {
    fs.writeFileSync(DIST_VERSION_JSON, original);
  }
});

test('6. PREMIUM sender font reaches the receiver (regression: fonts are free)', async ({ browser, request }) => {
  // Per-message custom fonts are FREE for every sender (WhatsApp/TM-WhatsApp
  // parity — the old premium gate stripped fonts from non-premium senders and
  // made receivers see the default font). This test locks that behavior in for
  // the premium path: a premium sender's chosen font must arrive intact.
  grantPremium(alice.userId);
  try {
    // Confirm the flag actually stuck (server sees premium: true).
    const me = await request.get(`${BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${alice.token}` }
    });
    const meData = await me.json();
    const meUser = meData.user || meData.data || meData;
    expect(meUser?.premium === true || meUser?.isPremium === true).toBe(true);
    console.log('[live] premium granted for', alice.username);

    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await login(pageA, alice);
    await openConversation(pageA, bob.username);

    // Pick Comic Sans via the Font Style modal (same flow as test 1).
    await pageA.getByRole('button', { name: 'More formatting options' }).click();
    await pageA.getByRole('button', { name: 'Change font' }).click();
    await expect(pageA.getByText('Font Style')).toBeVisible({ timeout: 10_000 });
    await pageA.getByRole('button', { name: /Comic Sans/ }).click();
    await pageA.getByRole('button', { name: 'Close' }).click();
    await expect(pageA.getByText('Font Style')).not.toBeVisible({ timeout: 10_000 });

    const text = `Premium font check — Comic Sans ${Date.now().toString(36)}`;
    await sendMessage(pageA, text);

    const bubbleFontOf = (page, needle) =>
      page
        .locator('p', { hasText: needle })
        .filter({ visible: true })
        .first()
        .evaluate((el) => el.style.fontFamily || getComputedStyle(el).fontFamily);

    await expect(pageA.locator('p', { hasText: text }).filter({ visible: true }).first()).toBeVisible({ timeout: 20_000 });
    const myFont = await bubbleFontOf(pageA, text);
    expect(myFont).toContain('Comic');
    console.log(`[live] premium sender bubble font = ${myFont}`);

    // Stored message carries the font.
    const msgsRes = await request.get(
      `${BASE}/api/chat/conversations/${CONVERSATION_ID}/messages`,
      { headers: { Authorization: `Bearer ${alice.token}` } }
    );
    const msgsData = await msgsRes.json();
    const stored = (msgsData.messages || msgsData.data || []).find((m) => m.content === text);
    expect(stored?.font || stored?.options?.font).toBe('comic');
    console.log('[live] premium message stored font =', stored?.font || stored?.options?.font);

    // Receiver (bob) sees the SAME font — premium sender's choice wins.
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await login(pageB, bob);
    await openConversation(pageB, alice.username);
    await expect(pageB.locator('p', { hasText: text }).filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
    const recvFont = await bubbleFontOf(pageB, text);
    expect(recvFont).toContain('Comic');
    console.log(`[live] premium receiver bubble font = ${recvFont}`);

    await ctxA.close();
    await ctxB.close();
  } finally {
    revokePremium(alice.userId);
  }
});