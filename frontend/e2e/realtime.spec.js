import { test, expect } from '@playwright/test';

// Verifies real-time behaviour between two users on two separate browser
// sessions (both connected over socket.io through the Vite dev proxy):
//   1. User A types → User B sees "<A> is typing" without any reload.
//   2. User A sends → User B receives the message live.
//   3. User B has the chat open → User A's message flips to a "read" receipt.
test('typing indicator and read receipts work in real-time', async ({ browser, request }) => {
  test.setTimeout(120_000);

  const ts = Date.now();
  const password = 'Test123!A';
  const userA = { username: `rt_a_${ts}`, phoneNumber: `81${String(ts).slice(-6)}`, password };
  const userB = { username: `rt_b_${ts}`, phoneNumber: `82${String(ts).slice(-6)}`, password };

  // 1. Register both users and create the A↔B conversation via API.
  const regA = await request.post('http://localhost:5000/api/auth/register', { data: userA });
  const bodyA = await regA.json();
  expect(bodyA.success).toBeTruthy();

  const regB = await request.post('http://localhost:5000/api/auth/register', { data: userB });
  const bodyB = await regB.json();
  expect(bodyB.success).toBeTruthy();
  const userBId = bodyB.user?._id || bodyB.user?.id;
  expect(userBId).toBeTruthy();

  const conv = await request.post('http://localhost:5000/api/chat/conversation', {
    headers: { Authorization: `Bearer ${bodyA.token}` },
    data: { userId: userBId }
  });
  expect(conv.status()).toBeGreaterThanOrEqual(200);
  expect(conv.status()).toBeLessThan(300);

  // 2. Two separate browser sessions (two "devices").
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  const login = async (page, username) => {
    await page.goto('http://localhost:5176/login');
    await page.getByPlaceholder('+255712345678').fill(username);
    await page.locator('input[autocomplete="current-password"]').fill(password);
    await page.getByRole('button', { name: /login/i }).click();
    await page.waitForURL(/\/chat/, { timeout: 25_000 }).catch(async () => {
      await page.goto('http://localhost:5176/chat');
    });
  };

  await login(pageA, userA.username);
  await login(pageB, userB.username);

  // 3. Both open the same conversation.
  await pageA.getByText(userB.username, { exact: true }).first().click({ timeout: 20_000 });
  await pageB.getByText(userA.username, { exact: true }).first().click({ timeout: 20_000 });

  const inputA = pageA.getByPlaceholder('Type a message...');
  const inputB = pageB.getByPlaceholder('Type a message...');
  await expect(inputA).toBeVisible({ timeout: 20_000 });
  await expect(inputB).toBeVisible({ timeout: 20_000 });

  // Small settle time so both sockets are joined to the conversation.
  await pageA.waitForTimeout(1500);

  // 4. Typing indicator: A types → B's chat header shows the live "typing"
  // indicator (1:1 chats render a generic "typing", like WhatsApp).
  const messageText = `Hello realtime ${ts}`;
  await inputA.pressSequentially(messageText, { delay: 60 });
  await expect(pageB.getByRole('banner').getByText('typing', { exact: true })).toBeVisible({ timeout: 15_000 });

  // 5. A sends → B receives the message live (no reload, no polling wait).
  await inputA.press('Enter');
  await expect(pageB.getByText(messageText, { exact: true })).toBeVisible({ timeout: 15_000 });

  // 6. Read receipt: B has the chat open, so A's message should flip to "read".
  // The status tick renders as a span with title="read" (double blue check).
  await expect(pageA.locator('span[title="read"]').first()).toBeVisible({ timeout: 20_000 });

  await ctxA.close();
  await ctxB.close();
});
