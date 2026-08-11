import { test, expect } from '@playwright/test';

// End-to-end: create a group through the real UI (New Group flow), then
// verify the group renders and messages of several types appear in the feed:
//   text (composer), view-once placeholder (composer), and mention (API).
test('create group via UI and verify message rendering', async ({ browser, request }) => {
  test.setTimeout(120_000);

  const ts = Date.now();
  const password = 'Test123!A';
  const creator = { username: `e2e_gc_${ts}`, phoneNumber: `77${String(ts).slice(-6)}`, password };
  const member = { username: `e2e_gm_${ts}`, phoneNumber: `78${String(ts).slice(-6)}`, password };
  const groupName = `E2E Group ${ts}`;

  // 1. Register creator + member (dev auto-verifies phones).
  const regA = await request.post('http://localhost:5000/api/auth/register', { data: creator });
  const bodyA = await regA.json();
  expect(bodyA.success).toBeTruthy();
  const regB = await request.post('http://localhost:5000/api/auth/register', { data: member });
  const bodyB = await regB.json();
  expect(bodyB.success).toBeTruthy();

  // 2. Login as creator through the UI.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto('/login');
  await page.getByPlaceholder('+255712345678').fill(creator.username);
  await page.locator('input[autocomplete="current-password"]').fill(password);
  await page.getByRole('button', { name: /login/i }).click();
  await page.waitForURL(/\/chat/, { timeout: 25_000 }).catch(async () => {
    await page.goto('/chat');
  });

  // 3. New Group flow via the UI.
  await page.getByRole('button', { name: /new group/i }).click({ timeout: 15_000 });
  await page.waitForURL(/new-group/, { timeout: 15_000 });

  const search = page.getByPlaceholder('Search name or number');
  await search.fill(member.username);
  // Debounced search (300ms) — wait for the participant row to appear.
  const memberRow = page.getByRole('button', { name: new RegExp(member.username) }).first();
  await expect(memberRow).toBeVisible({ timeout: 15_000 });
  await memberRow.click();

  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByPlaceholder('Group name').fill(groupName);
  await page.getByPlaceholder('Group description (optional)').fill('Created by e2e test');
  await page.getByRole('button', { name: 'Create group' }).click();
  await page.waitForURL(/\/chat/, { timeout: 25_000 });

  // 4. Group appears in the conversation list, then open it.
  const convEntry = page.getByText(groupName, { exact: true }).first();
  await expect(convEntry).toBeVisible({ timeout: 20_000 });
  await convEntry.click();
  const composer = page.getByPlaceholder('Type a message...');
  await expect(composer).toBeVisible({ timeout: 15_000 });

  // 5. Send a plain text message via the composer.
  const text = `Hello group ${ts}`;
  await composer.fill(text);
  await composer.press('Enter');
  await expect(page.getByText(text, { exact: true })).toBeVisible({ timeout: 15_000 });

  // 6. Send a view-once message and verify the sender sees the placeholder
  //    (never the raw content). Wait for React to re-render with the toggle
  //    pressed, otherwise the send reads the stale (unpressed) state.
  const voToggle = page.getByRole('button', { name: 'Toggle view-once mode' });
  await voToggle.click();
  await expect(voToggle).toHaveAttribute('aria-pressed', 'true');
  const secret = `ViewOnce e2e secret ${ts}`;
  await composer.fill(secret);
  await composer.press('Enter');
  await expect(page.getByText('View once message', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(secret, { exact: true })).toHaveCount(0);

  // 7. Mention: the member posts a message mentioning the creator via the API
  //    (the on-screen mention picker swallows Enter and is flaky to drive).
  //    The creator's open chat receives it over the socket — verifying both
  //    real-time delivery and mention rendering.
  const convsRes = await request.get('http://localhost:5000/api/chat/conversations', {
    headers: { Authorization: `Bearer ${bodyA.token}` }
  });
  const convs = await convsRes.json();
  const conv = (convs.conversations || []).find((c) => c.name === groupName || c.groupName === groupName);
  expect(conv).toBeTruthy();
  const mentionText = `@${creator.username} karibu!`;
  const mentionRes = await request.post('http://localhost:5000/api/chat/messages', {
    headers: { Authorization: `Bearer ${bodyB.token}`, 'Content-Type': 'application/json' },
    data: { conversationId: conv._id, content: mentionText, messageType: 'text', mentions: [creator.username] }
  });
  expect(mentionRes.ok()).toBeTruthy();
  await expect(page.getByText(/karibu!/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText(`@${creator.username}`, { exact: false }).first()).toBeVisible({ timeout: 10_000 });

  // 8. Receipt: our own sent message shows a tick ("✓" sent / "✓✓" read).
  await expect(page.getByText('✓').first()).toBeVisible({ timeout: 15_000 });

  await ctx.close();
});
