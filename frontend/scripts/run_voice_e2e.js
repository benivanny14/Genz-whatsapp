const { chromium } = require('playwright');
const fetch = require('node-fetch');
const path = require('path');

(async () => {
  const ts = Date.now();
  const username = `e2e_user_${ts}`;
  const phone = `1000${String(ts).slice(-6)}`;
  const password = 'Test123!A';

  console.log('Registering test user...');
  const regRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, phoneNumber: phone, password })
  });
  const regBody = await regRes.json();
  if (!regBody.success) {
    console.error('Registration failed:', regBody);
    process.exit(1);
  }

  const fakeAudio = path.resolve(__dirname, '..', 'backend', 'uploads', 'test-1780232918144.wav');

  console.log('Launching browser with fake mic:', fakeAudio);
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
      `--use-file-for-fake-audio-capture=${fakeAudio}`
    ]
  });

  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();

  console.log('Setting localStorage and opening chat...');
  await page.goto('http://localhost:5176/');
  await page.evaluate(([token, refresh, user]) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refresh);
    localStorage.setItem('user', JSON.stringify(user));
  }, [regBody.token, regBody.refreshToken, regBody.user]);

  await page.goto('http://localhost:5176/chat');
  const recordBtn = page.locator('button[title*="Shikilia rekodi"]');
  await recordBtn.waitFor({ state: 'visible', timeout: 15000 });

  const box = await recordBtn.boundingBox();
  if (!box) {
    console.error('Could not find record button bounding box');
    await browser.close();
    process.exit(1);
  }

  console.log('Simulating press-and-hold recording...');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2000);
  await page.mouse.up();

  console.log('Waiting for upload request...');
  const uploadResp = await page.waitForResponse((r) => r.url().includes('/api/media/upload') && r.request().method() === 'POST', { timeout: 15000 });
  console.log('Upload response status:', uploadResp.status());
  const body = await uploadResp.json().catch(() => null);
  console.log('Upload response body:', body);

  await browser.close();
  process.exit(0);
})();
