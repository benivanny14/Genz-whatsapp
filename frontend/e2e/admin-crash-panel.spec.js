import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';

/**
 * Admin crash-panel flow:
 *   1. prep: provision a known AdminOwner (fixed TOTP secret) + seed a
 *      CrashReport via backend/scripts/e2e-admin-prep.js (requires DB access)
 *   2. real admin UI login: username+password → TOTP code → dashboard
 *   3. the "Frontend Crashes (server)" telemetry panel shows the seeded crash
 *
 * Requires the single-origin stack (backend serves UI + API + admin gateway).
 * The spec reads MONGODB_URI from the environment (CI's e2e job sets it);
 * locally point it at an isolated MongoDB.
 */
// Per-spec credentials: this spec provisions its OWN AdminOwner identity so
// parallel workers never share login state with abuse-report.spec.js. Must
// match the E2E_ADMIN_* env passed to e2e-admin-prep.js below.
const TOTP_SECRET = 'JBSWY3DPEHPK3PXA';
const ADMIN_USERNAME = 'e2e_admin_crash';
const ADMIN_PASSWORD = 'CrashPanelE2E@2026!';
const ADMIN_OWNER_KEY = 'E2E_OWNER_CRASH_PANEL';

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

test.beforeAll(() => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI (or MONGO_URI) must be set to prep the admin account');
  // Playwright runs specs with cwd = frontend/, so the repo root is one level up.
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

test('admin login (username → TOTP) and the server-side crash panel', async ({ page }) => {
  await page.goto('/system-control-x7k9/login');

  // Step 1: username + password. Scope to the login card (Google Translate and
  // other extensions inject stray inputs into every page).
  const card = page.locator('div.max-w-sm');
  await card.locator('input[type="text"]').fill(ADMIN_USERNAME);
  await card.locator('input[type="password"]').fill(ADMIN_PASSWORD);
  await card.getByRole('button', { name: 'Continue' }).click();

  // Step 2: TOTP code. Compute right before filling so the 30s window is fresh;
  // retry once if the window rolls between compute and verify.
  const codeInput = page.locator('input[placeholder="000000"]');
  await expect(codeInput).toBeVisible({ timeout: 15_000 });
  await codeInput.fill(totp(TOTP_SECRET));
  await page.getByRole('button', { name: 'Verify & Sign In' }).click();

  try {
    await page.waitForURL(/\/system-control-x7k9\/?$/, { timeout: 20_000 });
  } catch {
    // Possibly a TOTP window rollover — recompute and retry once.
    await codeInput.fill(totp(TOTP_SECRET));
    await page.getByRole('button', { name: 'Verify & Sign In' }).click();
    await page.waitForURL(/\/system-control-x7k9\/?$/, { timeout: 20_000 });
  }

  // Dashboard overview loads and the telemetry panel shows the seeded crash.
  await expect(page.getByText('Frontend Crashes (server)')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/seeded e2e crash for the admin panel/)).toBeVisible({ timeout: 10_000 });
});
