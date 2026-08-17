import { test, expect } from '@playwright/test';

/**
 * QR codes stay scannable (white background) in glass mode.
 *
 * Glass mode turns every bg-white / bg-gray-* legacy surface translucent dark
 * so the background video shows through everywhere. QR codes are the one
 * exception: they need a white background to scan, so the QR containers carry
 * .glass-keep-white. This spec opens the QR Generator (Feature Library) with
 * glass mode on and proves the QR card surface gets flipped translucent while
 * the QR container itself stays pure white with dark modules.
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const ts = Date.now().toString(36);
  const user = { username: `qr_${ts}`, phoneNumber: `255746${String(Date.now()).slice(-6)}9`, password: PASSWORD };
  const reg = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await reg.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  creds = { userId: data.user._id, phone: user.phoneNumber, password: PASSWORD };
});

test.setTimeout(150_000);
test('glass mode: QR code keeps a white background while surfaces go glassy', async ({ page }) => {
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

  // 3) Reload and wait for the glass-mode machinery to mount.
  //    Long timeout: the first test on a cold Vite dev server pays for the
  //    full module compile, and glass specs run in parallel workers.
  await page.reload();
  await page.waitForFunction(() => {
    const video = document.getElementById('genz-video-bg');
    return document.documentElement.classList.contains('glass-mode-active') &&
      video && getComputedStyle(video).display === 'block';
  }, null, { timeout: 90_000 });

  // 4) Open the Feature Library → QR Generator.
  await page.goto('/features');
  await page.getByRole('button', { name: /QR Generator/ }).click();

  // 5) The QR display is mounted: white container with the generated SVG.
  const qrBox = page.locator('.glass-keep-white');
  await expect(qrBox.first()).toBeVisible({ timeout: 15_000 });
  await expect(qrBox.first().locator('svg')).toBeVisible({ timeout: 10_000 });

  // 6) Assert the computed styles: glass stays on, the modal card goes
  //    translucent (glass flip working), while the QR container stays pure
  //    white with dark modules so it remains scannable.
  const qrState = await page.evaluate(() => {
    const parse = (c) => {
      const m = (c || '').match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const parts = m[1].split(',').map((s) => parseFloat(s.trim()));
      return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
    };
    const cs = (el) => (el ? getComputedStyle(el) : null);
    const whiteBox = document.querySelector('.glass-keep-white');
    // The modal card behind the QR box uses bg-[#1a2e35], which the glass
    // rules make fully transparent — the control that proves the flip is on.
    const card = whiteBox ? whiteBox.closest('[class*="bg-[#1a2e35]"]') : null;
    const svg = whiteBox ? whiteBox.querySelector('svg') : null;
    const path = svg ? svg.querySelector('path, rect') : null;
    return {
      glassActive: document.documentElement.classList.contains('glass-mode-active'),
      qrBg: parse(cs(whiteBox)?.backgroundColor),
      cardBg: parse(cs(card)?.backgroundColor),
      svgFills: svg ? Array.from(svg.querySelectorAll('path, rect')).slice(0, 5).map((p) => p.getAttribute('fill')) : []
    };
  });

  expect(qrState.glassActive).toBe(true);
  // The surrounding card is flipped translucent by glass mode.
  expect(qrState.cardBg).not.toBeNull();
  expect(qrState.cardBg.a).toBe(0);
  // The QR container stays pure white (scannable).
  expect(qrState.qrBg).not.toBeNull();
  expect(qrState.qrBg.r).toBe(255);
  expect(qrState.qrBg.g).toBe(255);
  expect(qrState.qrBg.b).toBe(255);
  expect(qrState.qrBg.a).toBe(1);
  // QR modules are dark on the white box (contrast for scanning).
  expect(qrState.svgFills.length).toBeGreaterThan(0);
  expect(qrState.svgFills.every((f) => f && f !== 'white' && f !== '#fff' && f !== '#ffffff')).toBe(true);
});
