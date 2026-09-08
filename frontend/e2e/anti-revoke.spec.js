import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/**
 * anti-revoke.spec.js — WhatsApp-style Anti-Delete, end to end through the UI.
 *
 * The standalone GENZ Mods page + its "View Deleted Messages" modal were
 * removed in a UI rewrite (the features moved into the GENZ Settings overlay
 * inside /chat). What still ships — and what users actually experience — is
 * the live enforcement:
 *
 *   1. the RECEIVER has the Premium mod "Anti-Delete Messages" enabled
 *   2. the SENDER chooses "Delete for everyone" in the chat
 *   3. the receiver's open conversation keeps the bubble with its original
 *      text plus the 🚫 "Deleted (Anti-Delete Active)" badge (delivered over
 *      the socket as message:deleted / antiDeleteBlocked)
 *   4. the sender's own copy disappears as usual
 *
 * Server-side (chatController + messageHandlers): when any receiver has
 * genzMods.antiDelete, the delete sets deletedForEveryone but never scrubs the
 * content; the messages feed filters deletedForEveryone messages out, so the
 * preserved copy is intentionally a live-session experience — exactly what
 * this spec drives with two browser contexts.
 */
const PASSWORD = 'GenzTest@2026!';

let sender; // { phone, password, username }
let receiver; // { phone, password, username }
let messageId;

function grantPremium(userId) {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri || !userId) throw new Error('MONGO_URI required to grant premium');
  const repoRoot = path.resolve(process.cwd(), '..');
  execFileSync('node', ['-e', `
    const mongoose = require('mongoose');
    (async () => {
      await mongoose.connect(process.env.URI);
      const User = require('./models/User');
      await User.updateOne(
        { _id: new mongoose.Types.ObjectId('${userId}') },
        { $set: { premium: true, subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }
      );
      await mongoose.disconnect();
    })().catch((e) => { console.error(e); process.exit(1); });
  `], { cwd: path.resolve(repoRoot, 'backend'), env: { ...process.env, URI: uri }, stdio: 'pipe' });
}

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';
  const api = `${base}/api`;
  const ts = Date.now().toString(36);
  // Distinct 25576 prefix so parallel workers never collide phone numbers.
  const a = { username: `arva_${ts}`, phoneNumber: `25576${String(Date.now()).slice(-7)}1`, password: PASSWORD };
  const b = { username: `arvb_${ts}`, phoneNumber: `25576${String(Date.now()).slice(-7)}2`, password: PASSWORD };

  const regA = await request.post(`${api}/auth/register`, { data: a });
  const dataA = await regA.json();
  if (!dataA.token) throw new Error(`register A failed: ${JSON.stringify(dataA)}`);
  const regB = await request.post(`${api}/auth/register`, { data: b });
  const dataB = await regB.json();
  if (!dataB.token) throw new Error(`register B failed: ${JSON.stringify(dataB)}`);
  const userIdB = dataB.user?._id || dataB.user?.id;

  // Anti-Delete is a PREMIUM mod — grant B an active subscription (same flags
  // the payment flow sets), then enable genzMods.antiDelete through the exact
  // endpoint the GENZ Settings toggle uses.
  grantPremium(userIdB);
  const mods = await request.put(`${api}/genz-mods/settings`, {
    headers: { Authorization: `Bearer ${dataB.token}` },
    data: { settings: { antiDelete: true } }
  });
  if (!mods.ok()) throw new Error(`enable antiDelete failed: ${mods.status()} ${await mods.text()}`);

  // 1:1 conversation between A and B, then A sends the message.
  const convRes = await request.post(`${api}/chat/conversation`, {
    headers: { Authorization: `Bearer ${dataA.token}` },
    data: { userId: userIdB }
  });
  const conv = await convRes.json();
  const conversationId = conv.conversation?._id || conv.data?._id || conv._id;
  if (!conversationId) throw new Error(`no conversation created: ${JSON.stringify(conv)}`);

  const sentRes = await request.post(`${api}/chat/messages`, {
    headers: { Authorization: `Bearer ${dataA.token}` },
    data: { conversationId, content: 'Secret hello UI', messageType: 'text' }
  });
  const sent = await sentRes.json();
  messageId = sent.message?._id || sent.data?._id || sent._id;
  if (!messageId) throw new Error(`no message sent: ${JSON.stringify(sent)}`);

  sender = { phone: a.phoneNumber, password: PASSWORD, username: dataA.user?.username || a.username };
  receiver = { phone: b.phoneNumber, password: PASSWORD, username: dataB.user?.username || b.username };
});

async function login(page, phone) {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(phone);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });
}

async function openConversationWith(page, username) {
  const row = page.getByText(username, { exact: true }).first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  await row.click();
}

test('anti-delete: sender deletes for everyone, receiver keeps the message with the badge', async ({ browser }) => {
  const ctxSender = await browser.newContext();
  const pageSender = await ctxSender.newPage();
  pageSender.on('dialog', (d) => d.accept()); // window.confirm on delete

  const ctxReceiver = await browser.newContext();
  const pageReceiver = await ctxReceiver.newPage();

  // Receiver opens the chat FIRST and stays connected: the preserve-on-delete
  // update arrives live over the socket (message:deleted / antiDeleteBlocked).
  await login(pageReceiver, receiver.phone);
  await openConversationWith(pageReceiver, sender.username);
  const bubbleR = pageReceiver.locator(`#msg-${messageId}`);
  await expect(bubbleR).toBeVisible({ timeout: 20_000 });
  await expect(bubbleR).toContainText('Secret hello UI');

  // Sender opens the same conversation and sees the message.
  await login(pageSender, sender.phone);
  await openConversationWith(pageSender, receiver.username);
  const bubbleS = pageSender.locator(`#msg-${messageId}`);
  await expect(bubbleS).toBeVisible({ timeout: 20_000 });
  await expect(bubbleS).toContainText('Secret hello UI');

  // Delete for everyone (3-dot menu). The trigger is `hidden group-hover:flex`,
  // flaky under automation, so reveal it deterministically before clicking.
  const moreBtn = bubbleS.locator('button[data-message-menu-button]');
  await moreBtn.evaluate((el) => el.classList.remove('hidden'));
  await moreBtn.click();
  await pageSender.getByRole('button', { name: 'Delete for everyone' }).click();

  // Sender's own copy disappears from the chat.
  await expect(bubbleS).toBeHidden({ timeout: 15_000 });

  // Receiver's copy survives with original text + the anti-delete badge.
  await expect(bubbleR).toContainText('Deleted (Anti-Delete Active)', { timeout: 20_000 });
  await expect(bubbleR).toContainText('Secret hello UI');

  await ctxSender.close();
  await ctxReceiver.close();
});
