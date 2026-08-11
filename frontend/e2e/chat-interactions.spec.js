import { test, expect } from '@playwright/test';

/**
 * ChatArea main-interaction spec (locks behavior after the helpers were moved
 * to src/utils/chatText{Helpers}.js):
 *   1. send a text message and see it bubble in the UI
 *   2. the other user receives it over the socket and can reply
 *   3. the emoji/media picker opens and inserts an emoji into the composer
 *   4. the attachment menu opens with Document/Gallery/Camera
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5198';
  const api = `${base}/api`;
  const ts = Date.now().toString(36);
  const a = { username: `cia_${ts}`, phoneNumber: `255748${String(Date.now()).slice(-6)}1`, password: PASSWORD };
  const b = { username: `cib_${ts}`, phoneNumber: `255748${String(Date.now()).slice(-6)}2`, password: PASSWORD };

  const regA = await request.post(`${api}/auth/register`, { data: a });
  const dataA = await regA.json();
  if (!dataA.token) throw new Error(`register A failed: ${JSON.stringify(dataA)}`);

  const regB = await request.post(`${api}/auth/register`, { data: b });
  const dataB = await regB.json();
  if (!dataB.token) throw new Error(`register B failed: ${JSON.stringify(dataB)}`);

  const convRes = await request.post(`${api}/chat/conversation`, {
    headers: { Authorization: `Bearer ${dataA.token}` },
    data: { userId: dataB.user._id }
  });
  const conv = await convRes.json();
  const conversationId = conv.conversation?._id || conv.data?._id || conv._id;
  if (!conversationId) throw new Error('no conversation created');

  creds = {
    a: { phone: a.phoneNumber, password: PASSWORD, username: a.username },
    b: { phone: b.phoneNumber, password: PASSWORD, username: b.username },
    conversationId
  };
});

async function login(page, phone) {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(phone);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });
}

async function openConversation(page, peerUsername) {
  const item = page.getByText(peerUsername, { exact: true }).first();
  await expect(item).toBeVisible({ timeout: 20_000 });
  await item.click();
}

test('chat interactions: send, receive, emoji picker, attachment menu', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, creds.a.phone);
  await openConversation(pageA, creds.b.username);

  const composer = pageA.locator('input[placeholder="Type a message..."]');
  await expect(composer).toBeVisible({ timeout: 15_000 });

  // 3) Emoji/media picker opens and inserts an emoji into the composer.
  await pageA.getByRole('button', { name: 'Toggle media picker' }).click();
  await expect(pageA.getByPlaceholder('Search Emoji')).toBeVisible({ timeout: 15_000 });
  await pageA.getByPlaceholder('Search Emoji').fill('grin');
  const emojiImage = pageA.locator('img.epr-emoji-img').first();
  await expect(emojiImage).toBeVisible({ timeout: 10_000 });
  await emojiImage.click();
  await expect(composer).not.toHaveValue('');
  await pageA.getByRole('button', { name: 'Toggle media picker' }).click();

  // 4) Attachment menu opens with the expected options.
  await pageA.getByRole('button', { name: 'Open attachment menu' }).click();
  await expect(pageA.getByText('Document', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(pageA.getByText('Gallery', { exact: true })).toBeVisible();
  await expect(pageA.getByText('Camera', { exact: true })).toBeVisible();
  await pageA.getByRole('button', { name: 'Open attachment menu' }).click();

  // 1) Send a text message.
  await composer.fill('');
  await composer.fill('Hello from A');
  await pageA.getByRole('button', { name: 'Send message' }).click();
  await expect(pageA.getByText('Hello from A', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // 2) B receives it and replies; A sees the reply.
  const ctxB = await browser.newContext();
  const pageB = await ctxB.newPage();
  await login(pageB, creds.b.phone);
  await openConversation(pageB, creds.a.username);
  await expect(pageB.getByText('Hello from A', { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  await pageB.locator('input[placeholder="Type a message..."]').fill('Hello from B');
  await pageB.getByRole('button', { name: 'Send message' }).click();
  await expect(pageB.getByText('Hello from B', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  await expect(pageA.getByText('Hello from B', { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  await ctxA.close();
  await ctxB.close();
});
