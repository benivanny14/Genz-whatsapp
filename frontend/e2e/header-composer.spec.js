import { test, expect } from '@playwright/test';

/**
 * ConversationHeader + MessageComposer extraction spec (locks behavior after
 * the header block (2494-2758) and composer block (2885-3183) moved out of
 * ChatArea.jsx into child components):
 *   1. header renders the peer name + presence
 *   2. header search toggle opens the inline search box
 *   3. header "More Options" menu opens (DND toggle + Search Messages + Media
 *      Gallery + Clear Chat + Delete Chat + Export)
 *   4. composer: attachment menu opens; emoji picker opens; send works
 *   5. composer: typing a message + send shows the bubble
 */
const PASSWORD = 'GenzTest@2026!';

let creds;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5198';
  const api = `${base}/api`;
  const ts = Date.now().toString(36);
  const a = { username: `hdr_a_${ts}`, phoneNumber: `255750${String(Date.now()).slice(-6)}1`, password: PASSWORD };
  const b = { username: `hdr_b_${ts}`, phoneNumber: `255750${String(Date.now()).slice(-6)}2`, password: PASSWORD };

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

test('header + composer interactions after extraction', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  await login(pageA, creds.a.phone);
  await openConversation(pageA, creds.b.username);

  // 1) Header renders the peer name and the encryption lock badge, which reads
  //    "transit and at rest" (there is no client-side E2EE in this app).
  await expect(pageA.getByRole('heading', { name: new RegExp(`${creds.b.username}.*Messages encrypted in transit and at rest`) })).toBeVisible({ timeout: 15_000 });
  await expect(pageA.getByLabel('Messages encrypted in transit and at rest')).toBeVisible({ timeout: 10_000 });

  // 2) Header search opens the SearchMessages modal.
  const headerSearch = pageA.getByRole('button', { name: 'Search messages' }).first();
  await headerSearch.click();
  const searchModal = pageA.getByRole('heading', { name: 'Search Messages', exact: true });
  await expect(searchModal).toBeVisible({ timeout: 10_000 });
  await pageA.getByPlaceholder('Search messages...').fill('seed');
  // The modal's close button has no aria-label; click the first button in the panel.
  await pageA.locator('div.bg-\\[\\#0d1b2a\\] button').first().click();
  await expect(searchModal).not.toBeVisible();

  // 3) Header "More Options" menu: DND toggle + Search Messages + Media Gallery + Clear/Delete/Export.
  await pageA.getByRole('button', { name: 'More Options' }).click();
  await expect(pageA.getByText('Do Not Disturb', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(pageA.getByText('Search Messages', { exact: true })).toBeVisible();
  await expect(pageA.getByText('Media Gallery', { exact: true })).toBeVisible();
  await expect(pageA.getByText('Clear Chat', { exact: true })).toBeVisible();
  await expect(pageA.getByText('Delete Chat', { exact: true })).toBeVisible();
  await expect(pageA.getByText('Export Chat (.txt)', { exact: true })).toBeVisible();

  // Toggle DND on (menu closes), reopen and verify the state flipped, then off.
  await pageA.getByText('Do Not Disturb', { exact: true }).click();
  await expect(pageA.getByText('Do Not Disturb', { exact: true })).not.toBeVisible({ timeout: 10_000 });
  await pageA.getByRole('button', { name: 'More Options' }).click();
  await expect(pageA.getByText('Disable DND', { exact: true })).toBeVisible({ timeout: 10_000 });
  await pageA.getByText('Disable DND', { exact: true }).click();
  await pageA.getByRole('button', { name: 'More Options' }).click();
  await expect(pageA.getByText('Do Not Disturb', { exact: true })).toBeVisible({ timeout: 10_000 });
  await pageA.getByRole('button', { name: 'Close' }).first().click();

  // 4) Composer: attachment menu + emoji picker still open from the new component.
  await pageA.getByRole('button', { name: 'Open attachment menu' }).click();
  await expect(pageA.getByText('Document', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(pageA.getByText('Gallery', { exact: true })).toBeVisible();
  await expect(pageA.getByText('Camera', { exact: true })).toBeVisible();
  await pageA.getByRole('button', { name: 'Open attachment menu' }).click();

  await pageA.getByRole('button', { name: 'Toggle media picker' }).click();
  await expect(pageA.getByPlaceholder('Search Emoji')).toBeVisible({ timeout: 10_000 });
  await pageA.getByRole('button', { name: 'Toggle media picker' }).click();

  // 5) Composer: send a message and see the bubble.
  const composer = pageA.locator('input[placeholder="Type a message..."]');
  await expect(composer).toBeVisible({ timeout: 10_000 });
  await composer.fill('header-composer e2e');
  await pageA.getByRole('button', { name: 'Send message' }).click();
  await expect(pageA.getByText('header-composer e2e', { exact: true }).first()).toBeVisible({ timeout: 15_000 });

  await ctxA.close();
});
