import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Production smoke — verifies the DEPLOYED web app on genz-whatsapp-1 through
// its vite-preview proxy (the ONLY path the web app has to the API). Opt-in:
// set PROD_SMOKE=1 (the normal local suite never runs this file). The proxy
// path is exactly what broke in the Aug 2026 incident (GENZ_BACKEND_TARGET
// pointed at localhost:5000 inside the frontend container → ECONNREFUSED).
//
// Run against production:
//   cd frontend && PROD_SMOKE=1 npx playwright test --config=playwright.prod.config.js
const enabled = process.env.PROD_SMOKE === '1';

const dir = path.dirname(fileURLToPath(import.meta.url));
const repoVersion = () => {
  try {
    const v = JSON.parse(readFileSync(path.resolve(dir, '../public/version.json'), 'utf8'));
    // version.json ships versionCode as a JSON number; the deployed copy is
    // identical, so compare numerically.
    return { version: v.version, versionCode: Number(v.versionCode) };
  } catch {
    return null;
  }
};

test.describe('production smoke (via UI host proxy)', () => {
  test.skip(!enabled, 'PROD_SMOKE=1 required (production host)');

  test('SPA loads and React boots', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));
    // Free-tier cold start can take a while — generous navigation timeout.
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await expect(page).toHaveTitle(/GENZ WhatsApp/);
    await expect(page.locator('body')).not.toBeEmpty();
    // No uncaught exceptions: a bundle that references a missing define or
    // module crashes React and leaves a blank body — that is a real failure.
    expect(pageErrors).toEqual([]);
  });

  test('/api/health reaches the backend through the proxy', async ({ request }) => {
    await expect
      .poll(
        async () => {
          const res = await request.get('/api/health', { timeout: 20_000 });
          if (!res.ok()) return null;
          return await res.json();
        },
        { timeout: 90_000, intervals: [10_000] }
      )
      .toEqual(
        expect.objectContaining({
          success: true,
          status: 'ok',
          services: expect.objectContaining({ mongo: 'connected' })
        })
      );
  });

  test('version.json is current', async ({ request }) => {
    const repo = repoVersion();
    test.skip(!repo, 'repo version.json missing');
    await expect
      .poll(
        async () => {
          const res = await request.get('/version.json', { timeout: 20_000 });
          if (!res.ok()) return null;
          return await res.json();
        },
        { timeout: 90_000, intervals: [10_000] }
      )
      .toEqual(expect.objectContaining({ version: repo.version, versionCode: repo.versionCode }));
  });
});
