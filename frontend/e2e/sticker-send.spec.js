import { test, expect } from '@playwright/test';

/**
 * Sticker composer spec — locks the "sticker is optional, never mandatory"
 * behavior:
 *   1. a text-only message sends with no sticker attached
 *   2. a sticker-only message sends CLEAN (no caption words) and the staged
 *      hint says "Sticker will be sent alone"
 *   3. a sticker + typed text sends ONE TikTok-comment-style bubble — the
 *      typed caption renders ABOVE the sticker, never below it — with the
 *      hint saying "Sticker will be sent with your message ✨"
 * The API is queried at the end of each step so the assertions check the real
 * persisted message shape (messageType + caption), not just the DOM.
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5198';
  const api = `${base}/api`;
  const ts = Date.now().toString(36);
  const a = { username: `sta_${ts}`, phoneNumber: `255752${String(Date.now()).slice(-6)}1`, password: PASSWORD };
  const b = { username: `stb_${ts}`, phoneNumber: `255752${String(Date.now()).slice(-6)}2`, password: PASSWORD };

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
    a: { phone: a.phoneNumber, password: PASSWORD, username: a.username, token: dataA.token },
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

// Open the sticker picker → first pack in the store → tap its first sticker.
// Returns once the staged preview (selectedMedia) is visible.
async function stageSticker(page) {
  await page.getByRole('button', { name: 'Open sticker picker' }).click();
  await expect(page.getByText('STICKER STORE', { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: /^View / }).first().click();
  // In the opened pack every sticker cell is a button with an aria-label
  // wrapping an <img> — the narrower selector excludes the sidebar chat
  // rows and contact-info buttons which also wrap an <img>.
  await page.locator('button[aria-label]:has(img)').first().click();
  await expect(page.locator('img[alt="selected media"]')).toBeVisible({ timeout: 15_000 });
}

const stickerInChat = page => page.locator('img[src*="twemoji"], img[src*="giphy"]').first();

async function fetchMessages(request, conversationId) {
  const res = await request.get(
    `${process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5198'}/api/chat/conversations/${conversationId}/messages`,
    { headers: { Authorization: `Bearer ${creds.a.token}` } }
  );
  const body = await res.json();
  return body.messages || [];
}

test('text-only message sends with no sticker involved', async ({ browser, request }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, creds.a.phone);
  await openConversation(pageA, creds.b.username);

  const composer = pageA.locator('input[placeholder="Type a message..."]');
  await expect(composer).toBeVisible({ timeout: 15_000 });

  await composer.fill('Ujumbe wa maandishi pekee');
  await pageA.getByRole('button', { name: 'Send message' }).click();
  await expect(pageA.getByText('Ujumbe wa maandishi pekee', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  // No sticker appeared anywhere in the chat.
  await expect(stickerInChat(pageA)).toHaveCount(0, { timeout: 5_000 });

  // Poll until the socket/DB save lands (the UI renders optimistically).
  await expect.poll(async () => {
    const messages = await fetchMessages(request, creds.conversationId);
    return messages[messages.length - 1]?.messageType;
  }, { timeout: 15_000 }).toBe('text');
  const messages = await fetchMessages(request, creds.conversationId);
  expect(messages[messages.length - 1].caption || '').toBe('');

  await ctxA.close();
});

test('sticker-only message sends clean — no caption words below it', async ({ browser, request }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, creds.a.phone);
  await openConversation(pageA, creds.b.username);

  const composer = pageA.locator('input[placeholder="Type a message..."]');
  await expect(composer).toBeVisible({ timeout: 15_000 });

  await stageSticker(pageA);
  // The hint tells the user the sticker will go alone (optional, no message needed).
  await expect(pageA.getByText('Sticker will be sent alone', { exact: true })).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole('button', { name: 'Send message' }).click();

  const sticker = stickerInChat(pageA);
  await expect(sticker).toBeVisible({ timeout: 15_000 });
  // Sticker bubbles never contain a caption <p> underneath.
  await expect(pageA.locator('div.mb-1:has(img) p')).toHaveCount(0, { timeout: 10_000 });

  // Poll until the socket/DB save lands, then assert the sticker is CLEAN.
  await expect.poll(async () => {
    const messages = await fetchMessages(request, creds.conversationId);
    return messages[messages.length - 1]?.messageType;
  }, { timeout: 15_000 }).toBe('sticker');
  const messages = await fetchMessages(request, creds.conversationId);
  expect(messages[messages.length - 1].caption || '').toBe('');

  await ctxA.close();
});

test('sticker + typed text: TikTok-style — one bubble, caption ABOVE the sticker', async ({ browser, request }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, creds.a.phone);
  await openConversation(pageA, creds.b.username);

  const composer = pageA.locator('input[placeholder="Type a message..."]');
  await expect(composer).toBeVisible({ timeout: 15_000 });

  await stageSticker(pageA);
  await composer.fill('Maandishi kando na sticker');
  await expect(pageA.getByText('Sticker will be sent with your message ✨', { exact: true })).toBeVisible({ timeout: 10_000 });

  await pageA.getByRole('button', { name: 'Send message' }).click();

  // ONE bubble: the sticker AND its caption text are both visible.
  const stickerBubble = pageA.locator('div.mb-1:has(img)').last();
  await expect(stickerBubble).toBeVisible({ timeout: 15_000 });
  const caption = stickerBubble.locator('p').first();
  await expect(caption).toHaveText('Maandishi kando na sticker', { timeout: 15_000 });

  // TikTok comment-section style: the caption renders ABOVE the sticker
  // (the <p> precedes the <img> inside the same bubble).
  const captionAboveSticker = await stickerBubble.evaluate((el) => {
    const p = el.querySelector('p');
    const img = el.querySelector('img');
    return !!p && !!img && (p.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
  });
  expect(captionAboveSticker).toBe(true);

  // Poll until the socket/DB save lands, then assert the ONE sticker
  // message carries the typed caption (text on top, sticker below).
  await expect.poll(async () => {
    const messages = await fetchMessages(request, creds.conversationId);
    const last = messages[messages.length - 1];
    return last?.messageType === 'sticker' && last.caption === 'Maandishi kando na sticker';
  }, { timeout: 15_000 }).toBe(true);

  await ctxA.close();
});
