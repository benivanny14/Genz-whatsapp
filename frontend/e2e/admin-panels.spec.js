import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Admin dashboard monitoring panels — screenshots + visibility regression.
 *
 * Logs into the admin panel (username + password + TOTP) and captures the
 * Overview monitoring panels: Frontend Crashes, Update Analytics (server),
 * Release Adoption and Nightly Health Check. Screenshots land in
 * test-results/screenshots/ and are attached to the HTML report, so layout
 * regressions in the monitoring UI are visible in CI artifacts.
 *
 * Requires the same stack as the rest of the suite (backend + MongoDB) and
 * PHONE_VERIFICATION_REQUIRED=false.
 */

const TOTP_SECRET = 'JBSWY3DPEHPK3PXA';
const ADMIN_USERNAME = 'e2e_admin_panels';
const ADMIN_PASSWORD = 'PanelsAdminE2E@2026!';
const ADMIN_OWNER_KEY = 'E2E_OWNER_ADMIN_PANELS';
const ADMIN_LOGIN_PATH = '/system-control-x7k9/login';
const ADMIN_DASH_PATH = '/system-control-x7k9';

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

// Seed a handful of anonymous AppEvents so the Update Analytics + Release
// Adoption panels have data to render (they intentionally hide when empty).
// Delete-then-insert keeps the test idempotent across local re-runs.
function seedAppEvents(uri) {
  const repoRoot = path.resolve(process.cwd(), '..');
  const script = `
    const mongoose = require('mongoose');
    (async () => {
      await mongoose.connect(process.env.URI);
      const col = mongoose.connection.collection('appevents');
      await col.deleteMany({ anonId: 'e2e-anon-panels' });
      const now = Date.now();
      const mk = (event, daysAgo) => ({
        event, version: '1.1.8', versionCode: 10, platform: 'web', anonId: 'e2e-anon-panels',
        createdAt: new Date(now - daysAgo * 86400000)
      });
      await col.insertMany([
        mk('update_shown', 10), mk('update_tapped', 9), mk('update_shown', 8), mk('update_reload_tapped', 7), mk('update_dismissed', 6)
      ]);
      await mongoose.disconnect();
      console.log('seeded 5 AppEvents');
    })().catch((e) => { console.error(e); process.exit(1); });
  `;
  execFileSync('node', ['-e', script], {
    cwd: path.resolve(repoRoot, 'backend'), // mongoose resolves from backend/node_modules
    env: { ...process.env, URI: uri },
    stdio: 'pipe'
  });
}

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
  seedAppEvents(uri);
});

async function adminLogin(page) {
  await page.goto(ADMIN_LOGIN_PATH);
  const card = page.locator('div.max-w-sm');
  await card.locator('input[type="text"]').fill(ADMIN_USERNAME);
  await card.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await card.getByRole('button', { name: 'Continue' }).click();

  const codeInput = page.locator('input[placeholder="000000"]');
  await expect(codeInput).toBeVisible({ timeout: 15_000 });
  await codeInput.fill(totp(TOTP_SECRET));
  await page.getByRole('button', { name: 'Verify & Sign In' }).click();

  try {
    await page.waitForURL(new RegExp(`${ADMIN_DASH_PATH}/?$`), { timeout: 20_000 });
  } catch {
    await codeInput.fill(totp(TOTP_SECRET));
    await page.getByRole('button', { name: 'Verify & Sign In' }).click();
    await page.waitForURL(new RegExp(`${ADMIN_DASH_PATH}/?$`), { timeout: 20_000 });
  }
  await page.waitForTimeout(1500);
}

test('admin dashboard monitoring panels render and are screenshotted', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await adminLogin(page);

  // The monitoring panels live on the Overview section.
  const panels = [
    { heading: /Frontend Crashes \(server\)/, file: 'admin-frontend-crashes' },
    { heading: /Update Analytics \(server\)/, file: 'admin-update-analytics' },
    { heading: /Release Adoption/, file: 'admin-release-adoption' },
    { heading: /Nightly Health Check/, file: 'admin-nightly-status' }
  ];

  for (const panel of panels) {
    const card = page.locator('div.rounded-xl').filter({ has: page.getByRole('heading', { name: panel.heading }) }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    const buf = await card.screenshot({ path: `test-results/screenshots/${panel.file}.png` });
    await testInfo.attach(`panel-${panel.file}`, { body: buf, contentType: 'image/png' });
  }

  // Full Overview page screenshot as an overall layout reference.
  await page.screenshot({ path: 'test-results/screenshots/admin-overview.png', fullPage: true });

  // Assert the panels are not just present but have sane structure (titles).
  await expect(page.getByRole('heading', { name: /Nightly Health Check/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Update Analytics \(server\)/ })).toBeVisible();
});
