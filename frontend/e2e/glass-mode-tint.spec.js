import { test, expect } from '@playwright/test';

/**
 * GENZ Settings tint + blur follow the Glass Opacity / Blur Strength sliders,
 * and the slider-driven tint extends to EVERY page surface.
 *
 * App.jsx publishes the user's glassOpacity/glassBlur as CSS custom props on
 * :root (--genz-glass-tint, --genz-glass-header-tint, --genz-glass-blur) and
 * the glass-mode rules consume them, so every panel surface responds in real
 * time to the sliders. This spec sets a high glass opacity + custom blur,
 * opens GENZ Settings and proves the CSS vars and the computed section
 * background/blur match the slider values — then walks the other pages (chat
 * panels, Channels, Status, Linked Devices) and proves their surfaces follow
 * the same slider-driven tint, and finally drags the actual Glass Opacity
 * slider and watches the tint change live.
 *
 * Tint math (App.jsx syncGlassMode):
 *   frostAlpha = clamp(0.3, 0.8, 0.4 + (glassOpacity - 0.15) * 0.9)
 *   --genz-glass-tint        = clamp(0.35, 0.85, frostAlpha + 0.1)
 *   --genz-glass-header-tint = clamp(0.45, 0.9, frostAlpha + 0.3)
 * With glassOpacity 0.6 → frost 0.8 → tint 0.85, header 0.9.
 * With glassOpacity 0.15 (default) → frost 0.4 → tint 0.5.
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const ts = Date.now().toString(36);
  const user = { username: `tint_${ts}`, phoneNumber: `255745${String(Date.now()).slice(-6)}6`, password: PASSWORD };
  const reg = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await reg.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  creds = { userId: data.user._id, phone: user.phoneNumber, password: PASSWORD };
});

test.setTimeout(150_000);

async function login(page) {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(creds.phone);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 60_000 });
}

/** Persist glass mode exactly as GlassThemeManager does (user-scoped key). */
async function setGlassSettings(page, { opacity = 0.6, blur = 12 } = {}) {
  const settings = {
    settingsVersion: 2,
    mods: {
      glassMode: true,
      videoBg: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      videoBgOpacity: 0.5,
      videoBgBlur: 0,
      glassOpacity: opacity,
      glassBlur: blur
    },
    appTheme: 'dark',
    statusPrivacy: 'everyone',
    notificationSound: 'default',
    isDNDMode: false
  };
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: `genz_settings_comprehensive:${creds.userId}`, value: settings });
}

/** Wait for the App.jsx glass machinery (class + live video layer) to mount.
 *  Long timeout: the first test to hit a cold Vite dev server pays for the
 *  full module compile, and the glass-mode specs run in parallel workers. */
async function waitForGlass(page) {
  await page.waitForFunction(() => {
    const video = document.getElementById('genz-video-bg');
    return document.documentElement.classList.contains('glass-mode-active') &&
      video && getComputedStyle(video).display === 'block';
  }, null, { timeout: 90_000 });
}

/** Read the slider-published CSS vars off :root. */
async function readTintVars(page) {
  return page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      tintVar: parseFloat(root.getPropertyValue('--genz-glass-tint')),
      headerVar: parseFloat(root.getPropertyValue('--genz-glass-header-tint')),
      blurVar: root.getPropertyValue('--genz-glass-blur')
    };
  });
}

/** Poll until the first element matching the selector settles at the expected
 *  background alpha. Panels carry `transition-all`, so the computed value
 *  animates toward the slider-driven tint — assert on the settled value, not
 *  a mid-transition snapshot. */
async function expectBgAlpha(page, selector, expected, timeout = 20_000) {
  await page.waitForFunction(({ sel, exp }) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const c = getComputedStyle(el).backgroundColor;
    const m = (c || '').match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
    const a = parts.length > 3 ? parts[3] : 1;
    return Math.abs(a - exp) < 0.01;
  }, { sel: selector, exp: expected }, { timeout });
}

test('glass mode: GENZ Settings section tint and blur follow the glass sliders', async ({ page }) => {
  // 1) Login.
  await login(page);

  // 2) Enable glass mode with a HIGH opacity (0.6) and custom blur (12px).
  await setGlassSettings(page, { opacity: 0.6, blur: 12 });

  // 3) Reload and wait for the glass-mode machinery to mount.
  await page.reload();
  await waitForGlass(page);

  // 4) Open GENZ Settings.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'GENZ Settings' }).click();
  await expect(page.getByText('Genz Messenger Mods', { exact: true })).toBeVisible({ timeout: 20_000 });

  // 5) Assert the CSS vars and computed styles match the slider values.
  const tintState = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const section = document.querySelector('.genz-settings-panel section');
    const surface = document.querySelector('.glass-surface');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const readBg = (el) => {
      const c = cs(el)?.backgroundColor || '';
      const m = (c || '').match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    return {
      tintVar: parseFloat(root.getPropertyValue('--genz-glass-tint')),
      headerVar: parseFloat(root.getPropertyValue('--genz-glass-header-tint')),
      blurVar: root.getPropertyValue('--genz-glass-blur'),
      sectionBg: readBg(section),
      sectionBlur: cs(section)?.backdropFilter || cs(section)?.webkitBackdropFilter || '',
      surfaceBg: readBg(surface)
    };
  });

  // Vars published by App.jsx from the sliders.
  expect(tintState.tintVar).toBeCloseTo(0.85, 2); // frost 0.8 + 0.1, clamped to 0.85
  expect(tintState.headerVar).toBeCloseTo(0.9, 2);
  expect(tintState.blurVar).toBe('12px');

  // The sections actually consume them.
  expect(tintState.sectionBg).not.toBeNull();
  expect(tintState.sectionBg.a).toBeCloseTo(0.85, 2);
  expect(tintState.sectionBlur).toContain('blur(12px)');
  expect(tintState.surfaceBg).not.toBeNull();
  expect(tintState.surfaceBg.a).toBeCloseTo(0.85, 2);
});

test('glass mode: tint follows the sliders on every page surface', async ({ page }) => {
  // 1) Login + high-opacity glass settings (expected tint var = 0.85).
  await login(page);
  await setGlassSettings(page, { opacity: 0.6, blur: 12 });
  await page.reload();
  await waitForGlass(page);

  const vars = await readTintVars(page);
  expect(vars.tintVar).toBeCloseTo(0.85, 2);
  expect(vars.blurVar).toBe('12px');

  // 2) Chat page — the chat panels (glass-panel) carry the slider tint.
  await page.goto('/chat');
  await waitForGlass(page);
  await expectBgAlpha(page, '.glass-panel', 0.85);

  // 3) Channels — full-screen glass-surface root (inline dark background).
  await page.goto('/channels');
  await waitForGlass(page);
  await expectBgAlpha(page, '.glass-surface', 0.85);

  // 4) Status — full-screen glass-surface root with an inline gradient that
  //    the !important stylesheet rule must beat.
  await page.goto('/status');
  await waitForGlass(page);
  await expectBgAlpha(page, '.glass-surface', 0.85);

  // 5) Linked Devices — legacy light page (bg-gray-50/dark:bg-gray-900)
  //    flipped to the same translucent slider-driven surface.
  await page.goto('/linked-devices');
  await waitForGlass(page);
  await expectBgAlpha(page, '.min-h-screen.bg-gray-50', 0.85);
});

test('glass mode: dragging the Glass Opacity slider live-updates the tint', async ({ page }) => {
  // 1) Login with LOW opacity (0.15) — default tint var is 0.5.
  await login(page);
  await setGlassSettings(page, { opacity: 0.15, blur: 20 });
  await page.reload();
  await waitForGlass(page);

  let vars = await readTintVars(page);
  expect(vars.tintVar).toBeCloseTo(0.5, 2); // frost 0.4 + 0.1
  expect(vars.blurVar).toBe('20px');
  await expectBgAlpha(page, '.glass-panel', 0.5);

  // 2) Open GENZ Settings → GENZ Mods tab → Glass Theme manager.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'GENZ Settings' }).click();
  await expect(page.getByText('Genz Messenger Mods', { exact: true })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('button', { name: /GENZ Mods/ }).click();
  await page.getByRole('button', { name: /Manage Glass Theme/ }).click();
  await expect(page.getByText('Glass Theme', { exact: true })).toBeVisible({ timeout: 20_000 });

  // 3) Drag Glass Opacity (first range input inside the manager) 0.15 → 0.6.
  const manager = page.locator('div[class*="z-[500]"]');
  const opacitySlider = manager.locator('input[type="range"]').first();
  await expect(opacitySlider).toBeVisible();
  await opacitySlider.fill('0.6');

  // 4) The auto-save (debounced ~500ms) writes localStorage, App.jsx picks it
  //    up via the storage event / 8s poll, and :root vars update live.
  await page.waitForFunction(() => {
    const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--genz-glass-tint'));
    return !Number.isNaN(v) && v > 0.8;
  }, null, { timeout: 20_000 });

  vars = await readTintVars(page);
  expect(vars.tintVar).toBeCloseTo(0.85, 2);

  // 5) The chat panel behind the manager follows the new value too.
  await expectBgAlpha(page, '.glass-panel', 0.85);
});
