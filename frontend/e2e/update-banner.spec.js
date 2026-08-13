import { test, expect } from '@playwright/test';

/**
 * Web update banner (frontend/src/components/UpdateBanner.jsx):
 *
 * The web has no native versionCode, so the bundle bakes in its own build
 * version at compile time (__GENZ_VERSION_CODE__, vite.config.js) and compares
 * it against the SERVED /version.json. A stale cached bundle (never reloaded
 * since a deploy) sees manifest > bundle and shows the banner with a Reload
 * button; an up-to-date bundle shows nothing.
 *
 * These tests simulate the two states by intercepting /version.json (the SW
 * is blocked by playwright config, so the fetch always goes to the network
 * and the route applies) — no backend or deploy needed.
 */

test.describe('update banner (web)', () => {
  test('stale bundle shows the banner with Reload; dismiss persists across reload', async ({ page }) => {
    // Read the REAL served manifest so the test stays valid across versions,
    // then fabricate a much newer one to simulate a fresh deploy.
    const real = await (await page.request.get('/version.json')).json();
    const newer = {
      ...real,
      version: '99.0.0',
      versionCode: Number(real.versionCode) + 1000,
      downloadUrl: 'https://example.invalid/genz-whatsapp.apk'
    };
    await page.route('**/version.json', (route) => route.fulfill({ json: newer }));

    await page.goto('/login');

    // Banner appears with the newer version and a Reload button…
    const banner = page.getByRole('status').filter({ hasText: `Update available — v${newer.version}` });
    await expect(banner).toBeVisible();
    await expect(banner.getByRole('button', { name: 'Reload', exact: true })).toBeVisible();
    // …and the APK-only Update/Site links must NOT render on the web.
    await expect(page.getByRole('link', { name: 'Update', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Site', exact: true })).toHaveCount(0);

    // Dismiss: banner hides and the per-version dismiss key is stored.
    await banner.getByRole('button', { name: 'Dismiss update banner' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Update available — v' })).toHaveCount(0);
    const stored = await page.evaluate(() => localStorage.getItem('genz-update-dismissed-version'));
    expect(stored).toBe(String(newer.versionCode));

    // Reload: the banner stays dismissed for this version (still stale served
    // manifest, but the per-version dismiss is honored).
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(page.getByRole('status').filter({ hasText: 'Update available — v' })).toHaveCount(0);
  });

  test('up-to-date bundle shows no banner', async ({ page }) => {
    // Serve the manifest the bundle was built with — no update available.
    const real = await (await page.request.get('/version.json')).json();
    await page.route('**/version.json', (route) => route.fulfill({ json: real }));

    await page.goto('/login');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('status').filter({ hasText: 'Update available — v' })).toHaveCount(0);
  });

  test('a version dismissed in the past stays dismissed (storage is per-version)', async ({ page }) => {
    const real = await (await page.request.get('/version.json')).json();
    const newerCode = Number(real.versionCode) + 1000;
    // Pre-seed the dismissed key for the fabricated version, then serve it.
    await page.addInitScript(
      (code) => localStorage.setItem('genz-update-dismissed-version', String(code)),
      newerCode
    );
    await page.route('**/version.json', (route) =>
      route.fulfill({ json: { ...real, version: '98.0.0', versionCode: newerCode } })
    );

    await page.goto('/login');
    await page.waitForTimeout(1500);
    await expect(page.getByRole('status').filter({ hasText: 'Update available — v' })).toHaveCount(0);
  });
});

test.describe('update uptake footer (login page)', () => {
  test('renders aggregate uptake only when data exists', async ({ page }) => {
    const real = await (await page.request.get('/version.json')).json();

    // No data → no footer.
    await page.route('**/api/telemetry/events/uptake**', (route) =>
      route.fulfill({ json: { success: true, version: real.version, sinceHours: 48, shown: 0, updated: 0, dismissed: 0 } })
    );
    await page.goto('/login');
    await page.waitForTimeout(1200);
    await expect(page.getByText(/updated · .* shown/)).toHaveCount(0);

    // With data → footer with aggregate counts.
    await page.unroute('**/api/telemetry/events/uptake**');
    await page.route('**/api/telemetry/events/uptake**', (route) =>
      route.fulfill({ json: { success: true, version: real.version, sinceHours: 48, shown: 5, updated: 2, dismissed: 1 } })
    );
    await page.reload();
    await expect(
      page.getByText(new RegExp(`v${real.version}: 2 updated · 5 shown`))
    ).toBeVisible();
  });
});
