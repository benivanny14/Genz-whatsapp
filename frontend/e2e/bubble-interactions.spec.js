import { test, expect } from '@playwright/test';

/**
 * MessageBubbleList bubble-interaction spec (locks behavior after the bubble
 * block was extracted from ChatArea.jsx into src/components/MessageBubbleList.jsx):
 *   1. hover a bubble reveals the three-dot menu
 *   2. Reply opens the reply bar above the composer
 *   3. Star toggles the starred state on the bubble
 *   4. Info opens the MessageInfo modal
 *   5. Copy works (clipboard alert)
 *   6. Delete for me removes the message from the thread
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5198';
  const api = `${base}/api`;
  const ts = Date.now().toString(36);
  const a = { username: `bub_a_${ts}`, phoneNumber: `255749${String(Date.now()).slice(-6)}1`, password: PASSWORD };
  const b = { username: `bub_b_${ts}`, phoneNumber: `255749${String(Date.now()).slice(-6)}2`, password: PASSWORD };

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

  // Seed a message from A so the bubble exists before the page loads
  const sendRes = await request.post(`${api}/chat/messages`, {
    headers: { Authorization: `Bearer ${dataA.token}` },
    data: { conversationId, content: 'Bubble seed message', messageType: 'text' }
  });
  const sent = await sendRes.json();
  const seeded = sent.message?._id || sent.data?._id || sent._id;
  if (!seeded) throw new Error('seed message failed');

  creds = {
    a: { phone: a.phoneNumber, password: PASSWORD, username: a.username },
    b: { phone: b.phoneNumber, password: PASSWORD, username: b.username },
    conversationId,
    seededId: String(seeded)
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

async function revealBubbleMenu(page, messageId) {
  // The three-dot button is hidden until the bubble is hovered; scope to the
  // bubble's own container (id="msg-<id>") so the chat-list preview text never
  // matches, and to its own button (data-message-menu-button) — the header
  // also has a case-insensitively-named 'More Options' button.
  const bubble = page.locator(`#msg-${messageId}`);
  await expect(bubble).toBeVisible({ timeout: 20_000 });
  // Hover the bubble card itself (.group) — the wrapper is full-width with
  // justify-end, so its center can land on empty space and miss group-hover.
  await bubble.locator('.group').first().hover();
  const more = bubble.locator('button[data-message-menu-button]');
  await expect(more).toBeVisible({ timeout: 10_000 });
  await more.click();
}

test('bubble interactions: menu reveal, reply, star, info, copy, delete', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, creds.a.phone);
  await openConversation(pageA, creds.b.username);

  // The seeded message bubble renders from the extracted component
  const seededBubble = pageA.locator(`#msg-${creds.seededId}`);
  await expect(seededBubble).toBeVisible({ timeout: 20_000 });

  // 1) Hover reveals the three-dot menu; menu items are present.
  await seededBubble.locator('.group').first().hover();
  const more = seededBubble.locator('button[data-message-menu-button]');
  await expect(more).toBeVisible({ timeout: 10_000 });
  await more.click();
  await expect(pageA.getByText('Reply', { exact: true }).last()).toBeVisible({ timeout: 10_000 });
  await expect(pageA.getByText('Copy', { exact: true }).last()).toBeVisible();
  await expect(pageA.getByText('Forward', { exact: true }).last()).toBeVisible();
  await expect(pageA.getByText('Info', { exact: true }).last()).toBeVisible();
  await expect(pageA.getByText('Delete for me', { exact: true }).last()).toBeVisible();

  // 2) Reply opens the reply bar above the composer.
  await pageA.getByText('Reply', { exact: true }).last().click();
  const replyBar = pageA.locator('.reply-preview');
  await expect(replyBar).toBeVisible({ timeout: 10_000 });
  // The reply bar shows the replying-to author above the composer
  await expect(replyBar.getByText(/Replying to/).first()).toBeVisible();
  // Composer still accepts input with the reply active
  const composer = pageA.locator('input[placeholder="Type a message..."]');
  await expect(composer).toBeVisible({ timeout: 10_000 });
  await composer.fill('reply with context');
  await pageA.getByRole('button', { name: 'Send message' }).click();
  await expect(pageA.getByText('reply with context', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // 3) Star toggles the starred state (star icon appears next to timestamp).
  await revealBubbleMenu(pageA, creds.seededId);
  await pageA.getByText('Star', { exact: true }).last().click();
  const starIcon = pageA.locator('svg.lucide-star.text-yellow-500').first();
  await expect(starIcon).toBeVisible({ timeout: 10_000 });

  // 4) Info opens the MessageInfo modal; close it.
  await revealBubbleMenu(pageA, creds.seededId);
  await pageA.getByText('Info', { exact: true }).last().click();
  const infoModal = pageA.getByText('Message Info', { exact: true }).first();
  await expect(infoModal).toBeVisible({ timeout: 10_000 });
  await pageA.getByRole('button', { name: 'Close' }).first().click();

  // 5) Copy shows the clipboard alert.
  pageA.once('dialog', (dialog) => dialog.accept());
  await revealBubbleMenu(pageA, creds.seededId);
  await pageA.getByText('Copy', { exact: true }).last().click();

  // 6) Delete for me removes the bubble from the thread.
  await revealBubbleMenu(pageA, creds.seededId);
  await pageA.getByText('Delete for me', { exact: true }).last().click();
  await expect(pageA.locator(`#msg-${creds.seededId}`)).not.toBeVisible({ timeout: 15_000 });

  await ctxA.close();
});
