import { test, expect } from '@playwright/test';

// Verifies real-time group-chat behaviour between two users in a group:
//   1. User A types → User B's group header shows "<A> is typing" (group chats
//      render the actual username, unlike 1:1 chats).
//   2. User A sends → User B receives the group message live.
//   3. User B has the group open → User A's message flips to a "read" receipt.
test('group typing indicator (with username) and read receipts work in real-time', async ({ browser, request }) => {
  test.setTimeout(120_000);

  const ts = Date.now();
  const password = 'Test123!A';
  const groupName = `RT Group ${ts}`;
  const userA = { username: `grp_a_${ts}`, phoneNumber: `71${String(ts).slice(-6)}`, password };
  const userB = { username: `grp_b_${ts}`, phoneNumber: `72${String(ts).slice(-6)}`, password };
  const userC = { username: `grp_c_${ts}`, phoneNumber: `73${String(ts).slice(-6)}`, password };

  // 1. Register three users.
  const regA = await request.post('http://localhost:5000/api/auth/register', { data: userA });
  const bodyA = await regA.json();
  expect(bodyA.success).toBeTruthy();

  const regB = await request.post('http://localhost:5000/api/auth/register', { data: userB });
  const bodyB = await regB.json();
  expect(bodyB.success).toBeTruthy();

  const regC = await request.post('http://localhost:5000/api/auth/register', { data: userC });
  const bodyC = await regC.json();
  expect(bodyC.success).toBeTruthy();

  const userBId = bodyB.user?._id || bodyB.user?.id;
  const userCId = bodyC.user?._id || bodyC.user?.id;
  expect(userBId).toBeTruthy();
  expect(userCId).toBeTruthy();

  // 2. A creates a group with B and C.
  const group = await request.post('http://localhost:5000/api/chat/groups', {
    headers: { Authorization: `Bearer ${bodyA.token}` },
    data: { name: groupName, description: 'Real-time e2e group', participants: [userBId, userCId] }
  });
  const groupBody = await group.json();
  expect(group.status()).toBeGreaterThanOrEqual(200);
  expect(group.status()).toBeLessThan(300);

  // 3. Two browser sessions: A and B.
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

  // 4. Both open the group from the conversation list.
  await pageA.getByText(groupName, { exact: true }).first().click({ timeout: 20_000 });
  await pageB.getByText(groupName, { exact: true }).first().click({ timeout: 20_000 });

  const inputA = pageA.getByPlaceholder('Type a message...');
  const inputB = pageB.getByPlaceholder('Type a message...');
  await expect(inputA).toBeVisible({ timeout: 20_000 });
  await expect(inputB).toBeVisible({ timeout: 20_000 });

  // Small settle time so both sockets join the group room.
  await pageA.waitForTimeout(1500);

  // 5. Typing indicator with the username in the group header.
  const messageText = `Group hello ${ts}`;
  await inputA.pressSequentially(messageText, { delay: 60 });
  const typingInHeader = pageB.getByRole('banner').getByText(new RegExp(`${userA.username} is typing`));
  await expect(typingInHeader).toBeVisible({ timeout: 15_000 });

  // 6. A sends → B receives the group message live.
  await inputA.press('Enter');
  await expect(pageB.getByText(messageText, { exact: true })).toBeVisible({ timeout: 15_000 });

  // 7. Read receipt: B has the group open → A's message flips to "read".
  await expect(pageA.locator('span[title="read"]').first()).toBeVisible({ timeout: 20_000 });

  await ctxA.close();
  await ctxB.close();
});
