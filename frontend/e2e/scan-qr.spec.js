import { test, expect } from '@playwright/test';

// Verifies the QR Scanner really decodes a QR from the camera stream (no
// mocked results). getUserMedia is stubbed to return a canvas stream that
// displays a real QR code, so the app's own pipeline
// (video -> canvas -> jsQR) is exercised end-to-end.
test('QR scanner decodes a real QR from camera', async ({ browser }) => {
  test.setTimeout(90_000);

  const ts = Date.now();
  const password = 'Test123!A';
  const user = { username: `scanqr_${ts}`, phoneNumber: `84${String(ts).slice(-6)}`, password };

  const request = await (await import('@playwright/test')).request.newContext();
  const reg = await request.post('http://localhost:5000/api/auth/register', { data: user });
  const body = await reg.json();
  expect(body.success).toBeTruthy();
  await request.dispose();

  const qrcode = (await import('qrcode')).default;
  const qrDataUrl = await qrcode.toDataURL(
    JSON.stringify({ type: 'profile', userId: 'scan-test-123', name: 'Scan Test User' }),
    { width: 300, margin: 4, errorCorrectionLevel: 'H' }
  );

  const context = await browser.newContext();
  // Stub the camera BEFORE the app loads so the scanner's getUserMedia returns
  // a canvas stream that shows the QR code.
  await context.addInitScript((qrDataUrl) => {
    window.__qrScanReady = false;
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      const draw = () => {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 640, 480);
        const img = new Image();
        img.onload = () => {
          const s = Math.min(560 / img.width, 440 / img.height);
          const w = img.width * s;
          const h = img.height * s;
          ctx.drawImage(img, (640 - w) / 2, (480 - h) / 2, w, h);
          window.__qrScanReady = true;
        };
        img.src = qrDataUrl;
      };
      draw();
      setInterval(draw, 250); // keep refreshing so frames are emitted
      return canvas.captureStream(30);
    };
  }, qrDataUrl);

  const page = await context.newPage();

  // Log in
  await page.goto('http://localhost:5176/login');
  await page.getByPlaceholder('+255712345678').fill(user.username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(/\/chat/, { timeout: 30_000 }).catch(async () => {
    await page.goto('http://localhost:5176/chat');
  });

  // Open the QR Scanner from the Feature Library
  await page.goto('http://localhost:5176/features');
  await page.getByRole('button', { name: /QR Scanner/ }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: 'Start Scanning' }).click({ timeout: 10_000 });

  // The fake camera stream should start (scanner modal video, not the bg video)
  const camVideo = page.locator('#root video').last();
  await expect(camVideo).toBeVisible({ timeout: 15_000 });

  // jsQR should decode the QR from the camera stream within a couple seconds
  await expect(page.getByText(/Scan Test User/)).toBeVisible({ timeout: 25_000 });
  await expect(page.getByText(/QR Code Scanned/)).toBeVisible({ timeout: 5_000 });

  await context.close();
});
