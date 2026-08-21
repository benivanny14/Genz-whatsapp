import { test, expect } from '@playwright/test';

const PASSWORD = 'ComposerMobile@2026!';

async function expectNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth
  }));
  expect(
    metrics.scrollWidth,
    `${label} overflowed horizontally: scrollWidth ${metrics.scrollWidth}, viewport ${metrics.viewportWidth}`
  ).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

async function registerPair(request, suffix) {
  const digits = String(suffix).replace(/\D/g, '').slice(-6).padStart(6, '0');
  const userA = {
    username: `cmp_a_${suffix}`,
    phoneNumber: `83${digits}1`,
    password: PASSWORD
  };
  const userB = {
    username: `cmp_b_${suffix}`,
    phoneNumber: `84${digits}2`,
    password: PASSWORD
  };

  const regA = await request.post('/api/auth/register', { data: userA });
  expect(regA.ok()).toBeTruthy();
  const bodyA = await regA.json();

  const regB = await request.post('/api/auth/register', { data: userB });
  expect(regB.ok()).toBeTruthy();
  const bodyB = await regB.json();
  const userBId = bodyB.user?._id || bodyB.user?.id;
  expect(userBId).toBeTruthy();

  const conv = await request.post('/api/chat/conversation', {
    headers: { Authorization: `Bearer ${bodyA.token}` },
    data: { userId: userBId }
  });
  expect(conv.ok()).toBeTruthy();

  return { userA, userB };
}

async function loginAndOpenChat(page, userA, userB) {
  await page.goto('/login');
  await page.getByPlaceholder('+255712345678').fill(userA.username);
  await page.locator('input[autocomplete="current-password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(/\/chat/, { timeout: 30_000 });
  await expect(page.getByText(userB.username, { exact: true }).first()).toBeVisible({ timeout: 20_000 });
  await page.getByText(userB.username, { exact: true }).first().click();
  await expect(page.getByPlaceholder('Type a message...')).toBeVisible({ timeout: 20_000 });
}

async function expectComposerFits(page, label) {
  await expectNoOverflow(page, label);
  const metrics = await page.evaluate(() => {
    const input = document.querySelector('input[placeholder="Type a message..."]');
    const form = input?.closest('form');
    const inputRect = input?.getBoundingClientRect();
    const formRect = form?.getBoundingClientRect();
    return {
      inputWidth: inputRect?.width || 0,
      formLeft: formRect?.left || 0,
      formRight: formRect?.right || 0,
      viewportWidth: window.innerWidth
    };
  });

  expect(metrics.inputWidth, `${label} input is too narrow`).toBeGreaterThan(150);
  expect(metrics.formLeft, `${label} form bleeds left`).toBeGreaterThanOrEqual(-1);
  expect(metrics.formRight, `${label} form bleeds right`).toBeLessThanOrEqual(metrics.viewportWidth + 1);
}

const DEVICES = {
  iPhone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  Android: { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.625, isMobile: true, hasTouch: true }
};

for (const [deviceName, device] of Object.entries(DEVICES)) {
  test.describe(`mobile composer - ${deviceName}`, () => {
    test.use(device);

    test('composer controls, attachment sheet, media picker, and send flow fit the viewport', async ({ page, request }) => {
      test.setTimeout(120_000);
      const { userA, userB } = await registerPair(request, `${Date.now()}${deviceName === 'iPhone' ? '1' : '2'}`);

      await loginAndOpenChat(page, userA, userB);
      await expectComposerFits(page, `${deviceName} idle composer`);

      await page.getByRole('button', { name: 'Open attachment menu' }).click();
      await expect(page.getByText('Document', { exact: true })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('View Once', { exact: true })).toBeVisible();
      await expect(page.getByText('Schedule', { exact: true })).toBeVisible();
      await expectNoOverflow(page, `${deviceName} attachment sheet`);

      await page.getByRole('button', { name: 'Open attachment menu' }).click();
      await page.getByRole('button', { name: 'Toggle media picker' }).click();
      await expect(page.getByPlaceholder('Search Emoji')).toBeVisible({ timeout: 10_000 });
      await expectNoOverflow(page, `${deviceName} media picker`);
      await page.getByRole('button', { name: 'Toggle media picker' }).click();

      const input = page.getByPlaceholder('Type a message...');
      await input.fill(`mobile composer ${deviceName}`);
      await expectComposerFits(page, `${deviceName} typing composer`);
      await page.getByRole('button', { name: 'Send message' }).click();
      await expect(page.locator('p:visible', { hasText: `mobile composer ${deviceName}` }).first()).toBeVisible({ timeout: 15_000 });
      await expectComposerFits(page, `${deviceName} composer after send`);
    });
  });
}
