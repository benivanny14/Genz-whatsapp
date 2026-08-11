import { test, expect } from '@playwright/test';

// Verifies the block/unblock lifecycle between two users:
//   1. A's 1:1 chat with B is visible in the list.
//   2. A blocks B → B's 1:1 chat disappears from A's list (WhatsApp behavior).
//   3. While blocked, B cannot message A (403 "Cannot message this user").
//   4. A unblocks B → the chat returns to A's list.
//   5. After unblock, B can send again.
test('block → send blocked → unblock → chat restored and send works', async ({ browser, request }) => {
  test.setTimeout(120_000);

  const ts = Date.now();
  const password = 'Test123!ABCDef'; // satisfies the 12-char + complexity password policy
  const userA = { username: `blk_a_${ts}`, phoneNumber: `91${String(ts).slice(-6)}`, password };
  const userB = { username: `blk_b_${ts}`, phoneNumber: `92${String(ts).slice(-6)}`, password };

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
  const convBody = await conv.json();
  const conversationId = convBody.conversation?._id || convBody.conversation?.id;
  expect(conversationId).toBeTruthy();

  // 2. A opens the app (fresh browser context) and the A↔B chat is visible.
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await pageA.goto('http://localhost:5176/login');
  await pageA.getByPlaceholder('+255712345678').fill(userA.username);
  await pageA.locator('input[autocomplete="current-password"]').fill(password);
  await pageA.getByRole('button', { name: /login/i }).click();
  await pageA.waitForURL(/\/chat/, { timeout: 25_000 }).catch(async () => {
    await pageA.goto('http://localhost:5176/chat');
  });
  // Confirm the list actually loaded (B's chat visible before any blocking).
  await expect(pageA.getByText(userB.username, { exact: true }).first()).toBeVisible({ timeout: 25_000 });

  // 3. A blocks B via the API → B's 1:1 chat disappears from A's list
  //    (WhatsApp behavior: blocked 1:1 chats are hidden).
  const block = await request.post(`http://localhost:5000/api/chat/users/${userBId}/block`, {
    headers: { Authorization: `Bearer ${bodyA.token}` }
  });
  expect(block.status()).toBe(200);
  await pageA.reload();
  await expect(pageA.getByText(userB.username, { exact: true })).toHaveCount(0, { timeout: 25_000 });

  // 4. While blocked, B cannot send A a message (backend enforces 403).
  const blockedSend = await request.post('http://localhost:5000/api/chat/messages', {
    headers: { Authorization: `Bearer ${bodyB.token}`, 'Content-Type': 'application/json' },
    data: {
      content: 'you blocked me but I try anyway',
      messageType: 'text',
      conversationId
    }
  });
  const blockedBody = await blockedSend.json().catch(() => ({}));
  expect(blockedBody.success).toBe(false);

  // 5. A unblocks B → the chat returns to the list.
  const unblock = await request.delete(`http://localhost:5000/api/chat/users/${userBId}/block`, {
    headers: { Authorization: `Bearer ${bodyA.token}` }
  });
  expect(unblock.status()).toBe(200);

  // Confirm the block is really gone server-side before reloading.
  const blockedAfter = await request.get('http://localhost:5000/api/auth/blocked', {
    headers: { Authorization: `Bearer ${bodyA.token}` }
  });
  const blockedAfterBody = await blockedAfter.json();
  const stillBlocked = (blockedAfterBody.users || blockedAfterBody.blockedUsers || [])
    .some((u) => String(u._id || u.id || u) === String(userBId));
  expect(stillBlocked).toBe(false);

  await pageA.reload();
  await expect(pageA.getByText(userB.username, { exact: true }).first()).toBeVisible({ timeout: 25_000 });

  // 6. After unblock, B can send again.
  const afterSend = await request.post('http://localhost:5000/api/chat/messages', {
    headers: { Authorization: `Bearer ${bodyB.token}`, 'Content-Type': 'application/json' },
    data: {
      content: 'thanks for unblocking',
      messageType: 'text',
      conversationId
    }
  });
  expect(afterSend.status()).toBeGreaterThanOrEqual(200);
  expect(afterSend.status()).toBeLessThan(300);

  await ctxA.close();
});
