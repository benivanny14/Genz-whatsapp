import { test, expect } from '@playwright/test';

/**
 * Glass Mode + video background through GENZ Settings.
 *
 * Regression spec for the slide-in GENZ Settings panel: it used to be wrapped
 * in an opaque `bg-white` container (Chat.jsx), so in glass mode the panel
 * looked bright and the background video never showed through. This spec
 * turns glass mode on with a video background, opens GENZ Settings and proves
 * the video element is live behind the panel, the panel wrapper is fully
 * transparent (not white) and the panel surface itself is translucent dark
 * (not opaque white), so the video stays visible everywhere.
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const ts = Date.now().toString(36);
  const user = { username: `gls_${ts}`, phoneNumber: `255748${String(Date.now()).slice(-6)}3`, password: PASSWORD };
  const reg = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await reg.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  creds = { userId: data.user._id, phone: user.phoneNumber, password: PASSWORD };
});

test.setTimeout(150_000);
test('glass mode: video background shows through the GENZ Settings panel', async ({ page }) => {
  // 1) Login.
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(creds.phone);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 45_000 });

  // 2) Enable glass mode + video background exactly as GlassThemeManager
  //    persists it (user-scoped GENZ settings key).
  const settings = {
    settingsVersion: 2,
    mods: {
      glassMode: true,
      videoBg: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
      videoBgOpacity: 0.5,
      videoBgBlur: 0,
      glassOpacity: 0.15,
      glassBlur: 20
    },
    appTheme: 'dark',
    statusPrivacy: 'everyone',
    notificationSound: 'default',
    isDNDMode: false
  };
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
  }, { key: `genz_settings_comprehensive:${creds.userId}`, value: settings });

  // 3) Reload so App.jsx mounts the video + frost layers with glass mode on.
  await page.reload();
  await page.waitForURL(/\/chat/, { timeout: 45_000 });

  // 4) The glass-mode machinery is live before opening the panel. App.jsx
  //    mounts it asynchronously once the chat user loads, so poll for it.
  //    Long timeout: the first test on a cold Vite dev server pays for the
  //    full module compile, and glass specs run in parallel workers.
  await page.waitForFunction(() => {
    const video = document.getElementById('genz-video-bg');
    return document.documentElement.classList.contains('glass-mode-active') &&
      video && getComputedStyle(video).display === 'block';
  }, null, { timeout: 90_000 });
  const glassState = await page.evaluate(() => {
    const video = document.getElementById('genz-video-bg');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      active: document.documentElement.classList.contains('glass-mode-active'),
      videoDisplay: video ? cs(video).display : 'missing',
      videoSrc: (video && (video.currentSrc || video.src)) || ''
    };
  });
  expect(glassState.active).toBe(true);
  expect(glassState.videoDisplay).toBe('block');
  expect(glassState.videoSrc).toContain('BigBuckBunny');

  // 5) Open GENZ Settings from the sidebar menu.
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'GENZ Settings' }).click();
  await expect(page.getByText('Genz Messenger Mods', { exact: true })).toBeVisible({ timeout: 20_000 });

  // 6) The panel wrapper must be fully transparent (it was bg-white before
  //    the fix) and the panel surface translucent dark, so the video still
  //    shows through. The video element must stay live behind the panel.
  const panelState = await page.evaluate(() => {
    const surface = document.querySelector('.glass-surface');
    const wrapper = surface ? surface.parentElement : null;
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const parse = (c) => {
      const m = (c || '').match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    return {
      wrapperBg: parse(cs(wrapper)?.backgroundColor),
      surfaceBg: parse(cs(surface)?.backgroundColor),
      videoDisplay: cs(document.getElementById('genz-video-bg'))?.display
    };
  });

  // Wrapper: fully transparent (no bg-white anymore).
  expect(panelState.wrapperBg).not.toBeNull();
  expect(panelState.wrapperBg.a).toBe(0);

  // Surface: translucent (alpha < 1) and dark — not opaque white.
  expect(panelState.surfaceBg).not.toBeNull();
  expect(panelState.surfaceBg.a).toBeLessThan(1);
  expect(panelState.surfaceBg.r).toBeLessThan(60);

  // Video element stays live behind the panel.
  expect(panelState.videoDisplay).toBe('block');
});
