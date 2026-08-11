import { test, expect } from '@playwright/test';

/**
 * Anti-revoke (deleted messages) UI flow:
 *   1. register two users + create a conversation + send a message (via API prep)
 *   2. log in as the sender in the real UI
 *   3. delete the message for everyone (3-dot menu → confirm)
 *   4. open GENZMods → "View Deleted Messages" modal → original text is listed
 *   5. restore → the chat shows the message again
 *
 * Requires the dev stack to be up (backend with PHONE_VERIFICATION_REQUIRED=false
 * and a Vite dev server proxying /api + /socket.io to it).
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5198';
  const api = `${base}/api`;
  const ts = Date.now().toString(36);
  const a = { username: `uia_${ts}`, phoneNumber: `255745${String(Date.now()).slice(-6)}1`, password: PASSWORD };
  const b = { username: `uib_${ts}`, phoneNumber: `255745${String(Date.now()).slice(-6)}2`, password: PASSWORD };

  const regA = await request.post(`${api}/auth/register`, { data: a });
  const dataA = await regA.json();
  if (!dataA.token) throw new Error(`register A failed: ${JSON.stringify(dataA)}`);
  const tokenA = dataA.token;

  const regB = await request.post(`${api}/auth/register`, { data: b });
  const dataB = await regB.json();
  const userIdB = dataB.user?._id || dataB.user?.id;

  const settings = await request.post(`${api}/anti-revoke/settings`, {
    headers: { Authorization: `Bearer ${tokenA}` },
    data: { antiRevokeEnabled: true, cacheDeletedMessages: true, showDeletedMessages: true, cacheRetentionDays: 7 }
  });
  if (!settings.ok()) throw new Error('failed to enable anti-revoke');

  const convRes = await request.post(`${api}/chat/conversation`, {
    headers: { Authorization: `Bearer ${tokenA}` },
    data: { userId: userIdB }
  });
  const conv = await convRes.json();
  const conversationId = conv.conversation?._id || conv.data?._id || conv._id;
  if (!conversationId) throw new Error('no conversation created');

  const sentRes = await request.post(`${api}/chat/messages`, {
    headers: { Authorization: `Bearer ${tokenA}` },
    data: { conversationId, content: 'Secret hello UI', messageType: 'text' }
  });
  const sent = await sentRes.json();
  const messageId = sent.message?._id || sent.data?._id;
  if (!messageId) throw new Error('no message sent');

  creds = { phone: a.phoneNumber, password: PASSWORD, usernameB: b.username, messageId };
});

test('anti-delete: delete for everyone → Deleted Messages modal → restore', async ({ page }) => {
  // The UI uses window.confirm for "Delete this message for everyone?".
  page.on('dialog', (dialog) => dialog.accept());

  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(creds.phone);
  await page.locator('input[type="password"]').fill(creds.password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });

  // Open the 1:1 conversation with user B.
  const convItem = page.getByText(creds.usernameB, { exact: true }).first();
  await expect(convItem).toBeVisible({ timeout: 20_000 });
  await convItem.click();

  // The message is visible in the chat.
  const bubble = page.locator(`#msg-${creds.messageId}`);
  await expect(bubble).toBeVisible({ timeout: 15_000 });
  await expect(bubble).toContainText('Secret hello UI');

  // Delete for everyone via the 3-dot menu. The button is `hidden group-hover:flex`,
  // which is flaky under automation (Playwright's scroll-into-view shifts the message
  // and loses the hover), so reveal it deterministically before clicking.
  const moreBtn = bubble.locator('button[data-message-menu-button]');
  await moreBtn.evaluate((el) => el.classList.remove('hidden'));
  await moreBtn.click();
  await page.getByRole('button', { name: 'Delete for everyone' }).click();

  // The message leaves the chat.
  await expect(bubble).toBeHidden({ timeout: 15_000 });

  // GENZMods → Deleted Messages modal lists the original text.
  await page.goto('/genz-mods');
  await page.getByRole('button', { name: /View Deleted Messages/ }).click();
  await expect(page.getByText('Deleted Messages', { exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Secret hello UI', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // Restore it.
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByText('Message restored successfully')).toBeVisible({ timeout: 10_000 });

  // Back in the chat the message is back (refetched from the server).
  await page.goto('/chat');
  const convItem2 = page.getByText(creds.usernameB, { exact: true }).first();
  await expect(convItem2).toBeVisible({ timeout: 20_000 });
  await convItem2.click();
  const restored = page.locator(`#msg-${creds.messageId}`);
  await expect(restored).toBeVisible({ timeout: 15_000 });
  await expect(restored).toContainText('Secret hello UI');
});
