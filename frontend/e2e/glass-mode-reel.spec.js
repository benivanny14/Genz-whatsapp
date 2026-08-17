import { test, expect } from '@playwright/test';

/**
 * StatusReel in glass mode.
 *
 * The reel viewer used to paint an opaque bg-black root, so the background
 * video never showed behind it. In glass mode bg-black becomes the same
 * translucent dark surface as the rest of the app. This spec opens the reel
 * from the Status page with glass mode on and proves the reel root is
 * translucent (alpha < 1) while the video element stays live behind it.
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const ts = Date.now().toString(36);
  const user = { username: `reel_${ts}`, phoneNumber: `255747${String(Date.now()).slice(-6)}4`, password: PASSWORD };
  const reg = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await reg.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  creds = { userId: data.user._id, phone: user.phoneNumber, password: PASSWORD };
});

test.setTimeout(150_000);
test('glass mode: StatusReel root is translucent so the video shows behind it', async ({ page }) => {
  // 1) Login.
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(creds.phone);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 45_000 });

  // 2) Enable glass mode + video background (user-scoped GENZ settings key).
  const settings = {
    settingsVersion: 2,
    mods: {
      glassMode: true,
      videoBg: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
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

  // 3) Reload and wait for the glass-mode machinery to mount.
  //    Long timeout: the first test on a cold Vite dev server pays for the
  //    full module compile, and glass specs run in parallel workers.
  await page.reload();
  await page.waitForFunction(() => {
    const video = document.getElementById('genz-video-bg');
    return document.documentElement.classList.contains('glass-mode-active') &&
      video && getComputedStyle(video).display === 'block';
  }, null, { timeout: 90_000 });

  // 4) Open the Status page and launch the reel.
  await page.goto('/status');
  await page.getByRole('button', { name: 'Status Reel Mode' }).click();

  // 5) The reel full-screen root is mounted (fixed, z-[400]).
  const reelRoot = page.locator('div[class*="z-[400]"]').first();
  await expect(reelRoot).toBeVisible({ timeout: 15_000 });

  // 6) The reel root must be translucent dark (not opaque black) in glass
  //    mode, and the video element must stay live behind it.
  const reelState = await page.evaluate(() => {
    const parse = (c) => {
      const m = (c || '').match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    const root = document.querySelector('div[class*="z-[400]"]');
    const video = document.getElementById('genz-video-bg');
    const cs = (el) => (el ? getComputedStyle(el) : null);
    return {
      glassActive: document.documentElement.classList.contains('glass-mode-active'),
      reelBg: parse(cs(root)?.backgroundColor),
      videoDisplay: video ? cs(video).display : 'missing'
    };
  });

  expect(reelState.glassActive).toBe(true);
  // Reel root is translucent (alpha < 1) — not opaque black anymore.
  expect(reelState.reelBg).not.toBeNull();
  expect(reelState.reelBg.a).toBeLessThan(1);
  // Video element stays live behind the reel.
  expect(reelState.videoDisplay).toBe('block');
});
