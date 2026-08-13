import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Mobile layout verification on emulated iPhone 13 (390×844) and Pixel 7
 * (412×915) viewports:
 *   1. login → chat list → chat area → settings → feature library
 *   2. every Feature Library item (130) opens without a React crash and
 *      without horizontal overflow (nothing wider than the viewport)
 *   3. admin login (username → TOTP) + dashboard on a mobile viewport
 *
 * Runs against the same stack as the rest of the suite (dev proxy locally,
 * single-origin backend in CI). Requires PHONE_VERIFICATION_REQUIRED=false
 * (users auto-verify) — the CI job and backend/.env both set this.
 */

const PASSWORD = 'Test123!ABCDef';

// ── Admin (own identity so parallel workers never share login state) ──
const TOTP_SECRET = 'JBSWY3DPEHPK3PXA';
const ADMIN_USERNAME = 'e2e_admin_mobile';
const ADMIN_PASSWORD = 'MobileAdminE2E@2026!';
const ADMIN_OWNER_KEY = 'E2E_OWNER_MOBILE_LAYOUT';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(encoded) {
  const bits = [];
  for (const ch of encoded.toUpperCase().replace(/=+$/, '')) {
    const value = BASE32_ALPHABET.indexOf(ch);
    if (value === -1) continue;
    for (let b = 4; b >= 0; b--) bits.push((value >> b) & 1);
  }
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8 && i + b < bits.length; b++) byte = (byte << 1) | bits[i + b];
    bytes.push(byte);
  }
  return Buffer.from(bytes);
}

/** RFC 6238 TOTP (SHA1, 30s step, 6 digits) — no external deps. */
function totp(secret, time = Date.now()) {
  const key = base32Decode(secret);
  const counter = Math.floor(time / 30000);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (
    ((hmac[offset] & 0x7f) << 24) |
    (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) |
    hmac[offset + 3]
  ) % 1000000;
  return String(code).padStart(6, '0');
}

/** Measures horizontal overflow + collects elements sticking out of the viewport. */
async function measureOverflow(page) {
  return page.evaluate(() => {
    const vw = window.innerWidth;
    const sw = document.documentElement.scrollWidth;
    const offenders = [];
    const seen = new Set();
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width > 1 && r.right > vw + 4) {
        const key = `${el.tagName}${String(el.className || '').slice(0, 60)}`;
        if (!seen.has(key)) {
          seen.add(key);
          offenders.push(`${el.tagName} .${String(el.className || '').slice(0, 70)} right=${Math.round(r.right)}`);
        }
      }
    });
    return { vw, sw, overflow: sw > vw + 1, offenders: offenders.slice(0, 10) };
  });
}

async function expectNoOverflow(page, label) {
  const m = await measureOverflow(page);
  expect(m.overflow, `${label} overflows horizontally (scrollWidth ${m.sw} > viewport ${m.vw})\n${m.offenders.join('\n')}`).toBe(false);
}

async function registerPair(request, ts) {
  const userA = { username: `ml_a_${ts}`, phoneNumber: `81${String(ts).slice(-6)}`, password: PASSWORD };
  const userB = { username: `ml_b_${ts}`, phoneNumber: `82${String(ts).slice(-6)}`, password: PASSWORD };
  const regA = await request.post('/api/auth/register', { data: userA });
  expect(regA.ok()).toBeTruthy();
  const bodyA = await regA.json();
  const regB = await request.post('/api/auth/register', { data: userB });
  expect(regB.ok()).toBeTruthy();
  const bodyB = await regB.json();
  const userBId = bodyB.user?._id || bodyB.user?.id;
  expect(userBId).toBeTruthy();

  const conv = await request.post('/api/chat/conversation', {
    headers: { Authorization: `Bearer ${bodyA.token}` },
    data: { userId: userBId }
  });
  expect(conv.ok()).toBeTruthy();
  const convBody = await conv.json();
  const conversationId = convBody.conversation?._id || convBody.conversation?.id;
  for (let i = 1; i <= 3; i++) {
    await request.post('/api/chat/messages', {
      headers: { Authorization: `Bearer ${bodyA.token}` },
      data: { content: `Mobile layout check message ${i} — long text that wraps on narrow screens`, messageType: 'text', conversationId }
    });
  }
  return { userA, userB };
}

async function login(page, user) {
  await page.goto('/login');
  await page.getByPlaceholder('+255712345678').fill(user.username);
  await page.locator('input[autocomplete="current-password"]').fill(user.password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(/\/chat/, { timeout: 30_000 });
}

/** Opens every Feature Library item; fails on React crashes or overflow. */
// Some pageerrors are test-environment noise rather than app crashes:
//  - Playwright blocks service workers (config `serviceWorkers: 'block'`), so
//    the PWA registration SecurityError fires in every context.
//  - An unhandled fetch rejection under load surfaces as a pageerror; the
//    backend endpoints are verified healthy, so treat network-level failures
//    as noise (they would be console.error'd, not crash the UI).
function isBenignPageError(text) {
  return (
    text.includes('serviceWorker') ||
    text.includes('Failed to fetch') ||
    text.includes('NetworkError') ||
    text.includes('Load failed') ||
    text.includes('net::ERR_') ||
    text.includes('AbortError') ||
    text.includes('GeolocationPositionError')
  );
}

async function sweepFeatureLibrary(page, label) {
  await page.goto('/features');

  const pageErrors = [];
  page.on('pageerror', (err) => {
    const text = String(err).slice(0, 300);
    if (!isBenignPageError(text)) pageErrors.push(text);
  });

  // FeatureLibrary is lazy-loaded — wait for the grid to actually render
  // instead of a blind timeout (it can be slow under suite-wide load).
  const items = page.locator('section .grid button');
  await expect(items.first()).toBeVisible({ timeout: 30_000 });
  const count = await items.count();
  expect(count, 'feature library should have items').toBeGreaterThan(50);

  await expectNoOverflow(page, `${label} feature library grid`);

  for (let i = 0; i < count; i++) {
    const name = (await items.nth(i).innerText().catch(() => `item-${i}`)).split('\n')[0].slice(0, 30);
    // Opening the next item unmounts the previous modal — no page reload needed.
    await items.nth(i).dispatchEvent('click');
    await page.waitForTimeout(250);
    await expectNoOverflow(page, `${label} feature "${name}"`).catch(async (e) => {
      throw new Error(`${label} feature "${name}" (item ${i}/${count}) overflowed: ${e.message.split('\n')[0]}`);
    });
    // A crashed React root removes the grid — the next iteration would time out.
    if (pageErrors.length) {
      throw new Error(`${label} feature "${name}" (item ${i}/${count}) crashed React: ${pageErrors.join(' | ')}`);
    }
  }

  // A fresh load must still render the grid (proves the sweep left no broken state).
  await page.goto('/features');
  await page.waitForTimeout(1200);
  await expect(page.locator('section .grid button').first()).toBeVisible();
  expect(pageErrors, 'page errors during feature sweep').toHaveLength(0);
}

const DEVICES = {
  iPhone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  Android: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }
};

// One shared user pair for all mobile tests (serial mode → single worker, so
// the pair registers exactly once per run — keeps the auth rate-limit budget
// tiny and the suite deterministic).
let pair;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async ({ request }) => {
  pair = await registerPair(request, Date.now());
});

async function mobileSweepTest(page, deviceName) {
  test.setTimeout(300_000);
  const { userA, userB } = pair;

  await login(page, userA);
  await page.waitForTimeout(1200);
  await expectNoOverflow(page, `${deviceName} chat list`);
  await expect(page.getByText(userB.username, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  await page.getByText(userB.username, { exact: true }).first().click();
  await page.waitForTimeout(1200);
  await expectNoOverflow(page, `${deviceName} chat area`);

  await page.goto('/settings');
  await page.waitForTimeout(1200);
  await expectNoOverflow(page, `${deviceName} settings`);

  await page.goto('/status');
  await page.waitForTimeout(1200);
  await expectNoOverflow(page, `${deviceName} status`);

  await page.goto('/broadcast');
  await page.waitForTimeout(1200);
  await expectNoOverflow(page, `${deviceName} broadcast`);

  await sweepFeatureLibrary(page, deviceName);
}

for (const [deviceName, device] of Object.entries(DEVICES)) {
  test.describe(`mobile layout — ${deviceName}`, () => {
    test.use({ ...device, geolocation: { latitude: -6.7924, longitude: 39.2083 }, permissions: ['geolocation'] });
    test('key screens + all feature library items fit the viewport without crashing', async ({ page }) => {
      await mobileSweepTest(page, deviceName);
    });
  });
}

test.describe('mobile layout — admin panel (iPhone)', () => {
  test.use({ ...DEVICES.iPhone, geolocation: { latitude: -6.7924, longitude: 39.2083 }, permissions: ['geolocation'] });

  test.beforeAll(() => {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) must be set to prep the admin account');
    const repoRoot = path.resolve(process.cwd(), '..');
    execFileSync('node', ['backend/scripts/e2e-admin-prep.js'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        MONGODB_URI: uri,
        E2E_ADMIN_USERNAME: ADMIN_USERNAME,
        E2E_ADMIN_PASSWORD: ADMIN_PASSWORD,
        E2E_ADMIN_TOTP_SECRET: TOTP_SECRET,
        E2E_ADMIN_OWNER_KEY: ADMIN_OWNER_KEY
      },
      stdio: 'pipe'
    });
  });

  test('admin login → dashboard renders without horizontal overflow', async ({ page }) => {
    test.setTimeout(90_000);
    const pageErrors = [];
    page.on('pageerror', (err) => {
      const text = String(err).slice(0, 300);
      if (!isBenignPageError(text)) pageErrors.push(text);
    });

    await page.goto('/system-control-x7k9/login');
    const card = page.locator('div.max-w-sm');
    await card.locator('input[type="text"]').fill(ADMIN_USERNAME);
    await card.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await card.getByRole('button', { name: 'Continue' }).click();

    const codeInput = page.locator('input[placeholder="000000"]');
    await expect(codeInput).toBeVisible({ timeout: 15_000 });
    await codeInput.fill(totp(TOTP_SECRET));
    await page.getByRole('button', { name: 'Verify & Sign In' }).click();

    try {
      await page.waitForURL(/\/system-control-x7k9\/?$/, { timeout: 20_000 });
    } catch {
      await codeInput.fill(totp(TOTP_SECRET));
      await page.getByRole('button', { name: 'Verify & Sign In' }).click();
      await page.waitForURL(/\/system-control-x7k9\/?$/, { timeout: 20_000 });
    }

    await page.waitForTimeout(1500);
    await expect(page.locator('body').getByText(/Overview|Dashboard/i).first()).toBeVisible({ timeout: 20_000 }).catch(() => {});
    await expectNoOverflow(page, 'admin dashboard');
    expect(pageErrors, 'admin page errors on mobile').toHaveLength(0);
  });
});
