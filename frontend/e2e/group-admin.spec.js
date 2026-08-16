import { test, expect } from '@playwright/test';

/**
 * group-admin.spec.js — full group ADMIN flow through the UI:
 *   1. owner creates a group via /new-group (search → select → name)
 *   2. owner opens Group Info and promotes a member to admin
 *   3. owner locks group info (only admins can edit)
 *   4. owner enables "Require join approval"
 *   5. owner bans a member
 * The backend group-role enforcement (member 403s, transfer, ban/unban) is
 * covered by feature-full-verification.js; this spec proves the UI wiring.
 */
const PASSWORD = 'GenzTest@2026!';

let creds;
let groupName;

test.beforeAll(async ({ request }) => {
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5000';
  const api = `${base}/api`;
  const ts = Date.now().toString(36);
  // phone numbers must be globally unique per run AND not collide with the
  // numbers other specs register in parallel workers (distinct 25575 prefix)
  const mk = (pfx, n) => ({
    username: `${pfx}_${ts}`,
    phoneNumber: `25575${String(Date.now() + n * 137).slice(-7)}`,
    password: PASSWORD
  });

  const a = mk('ga', 1);
  const b = mk('gb', 2);
  const c = mk('gc', 3);

  const regA = await request.post(`${api}/auth/register`, { data: a });
  const dataA = await regA.json();
  if (!dataA.token) throw new Error(`register A failed: ${JSON.stringify(dataA)}`);
  const regB = await request.post(`${api}/auth/register`, { data: b });
  const dataB = await regB.json();
  if (!dataB.token) throw new Error(`register B failed: ${JSON.stringify(dataB)}`);
  const regC = await request.post(`${api}/auth/register`, { data: c });
  const dataC = await regC.json();
  if (!dataC.token) throw new Error(`register C failed: ${JSON.stringify(dataC)}`);

  groupName = `E2E Group ${ts}`;
  creds = {
    a: { phone: a.phoneNumber, password: PASSWORD },
    b: { phone: b.phoneNumber, password: PASSWORD, username: b.username, id: String(dataB.user._id || dataB.user.id) },
    c: { phone: c.phoneNumber, password: PASSWORD, username: c.username, id: String(dataC.user._id || dataC.user.id) },
    tokens: { a: dataA.token, b: dataB.token, c: dataC.token }
  };
});

async function login(page, phone) {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(phone);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });
}

test('group admin UI: create group, promote admin, lock info, join approval, ban member', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const pageA = await ctxA.newPage();
  // GroupInfo uses window.confirm() for promote/ban — always accept it.
  pageA.on('dialog', (d) => d.accept());

  // ── 1. Owner creates the group via the UI ──────────────────────────────
  await login(pageA, creds.a.phone);
  await pageA.goto('/new-group');
  await expect(pageA.getByText('Add group participants')).toBeVisible({ timeout: 15_000 });

  const searchInput = pageA.getByPlaceholder('Search name or number');
  await searchInput.fill(creds.b.username);
  await expect(pageA.getByText(creds.b.username, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await pageA.getByText(creds.b.username, { exact: true }).first().click();
  // select C too so there is a member who is not admin
  await searchInput.fill(creds.c.username);
  await expect(pageA.getByText(creds.c.username, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await pageA.getByText(creds.c.username, { exact: true }).first().click();

  await pageA.getByRole('button', { name: 'Next' }).click();
  await pageA.getByPlaceholder('Group name').fill(groupName);
  await pageA.getByRole('button', { name: 'Create group' }).click();

  await pageA.waitForURL(/\/chat/, { timeout: 20_000 });
  await expect(pageA.getByText(groupName, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

  // ── 2. Open Group Info from the header, then the Members tab ──────────
  await pageA.locator('div.flex-1.min-w-0.cursor-pointer', { hasText: groupName }).click();
  await expect(pageA.getByRole('heading', { name: 'Group Info' })).toBeVisible({ timeout: 15_000 });
  await pageA.getByRole('button', { name: 'Members', exact: true }).click();
  await expect(pageA.getByText(/\d+ of \d+ members/)).toBeVisible({ timeout: 15_000 });

  // ── 3. Promote B to admin ──────────────────────────────────────────────
  const bRow = pageA.locator('div.flex.items-center.gap-3.px-5.py-3', { hasText: creds.b.username }).last();
  await bRow.getByRole('button', { name: 'Make admin' }).click();
  // B's subtitle flips to Admin
  await expect(bRow.getByText(/^Admin/)).toBeVisible({ timeout: 15_000 });

  // ── 4. Lock group info + enable join approval (Settings tab) ───────────
  await pageA.getByRole('button', { name: 'Settings' }).click();
  await expect(pageA.getByText('Require join approval', { exact: true })).toBeVisible({ timeout: 15_000 });
  await pageA.locator('div.flex.items-center.justify-between', { hasText: 'Edit group info' }).locator('button').click();
  await pageA.locator('div.flex.items-center.justify-between', { hasText: 'Require join approval' }).locator('button').click();

  // ── 6. Ban member C (back on the Members tab) ─────────────────────────
  await pageA.getByRole('button', { name: 'Members', exact: true }).click();
  const cRow = pageA.locator('div.flex.items-center.gap-3.px-5.py-3', { hasText: creds.c.username }).last();
  await cRow.getByRole('button', { name: 'Ban member' }).click();
  // C is removed from the member list after the ban
  await expect(pageA.getByText(creds.c.username, { exact: true })).toHaveCount(0, { timeout: 15_000 });

  // ── 7. Persisted server-side: verify via API as the owner ──────────────
  const base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5000';
  const convRes = await ctxA.request.get(`${base}/api/chat/conversations`, {
    headers: { Authorization: `Bearer ${creds.tokens.a}` }
  });
  const convBody = await convRes.json();
  const convs = convBody.conversations || convBody.data || [];
  const group = convs.find((c) => c.groupName === groupName);
  expect(group, `group ${groupName} present in owner conversation list`).toBeTruthy();
  // lock info persisted (only admins can edit)
  expect(group.canChangeGroupInfo).toBe(false);
  // join approval persisted
  expect(group.requireJoinApproval).toBe(true);
  // B is now an admin
  const adminIds = (group.admins || []).map((x) => String(x._id || x));
  expect(adminIds).toContain(creds.b.id);
  // C is banned (bannedMembers entries are { user, bannedBy, bannedAt, reason } subdocs)
  const bannedIds = (group.bannedMembers || []).map((x) => String(x.user?._id || x.user));
  expect(bannedIds).toContain(creds.c.id);

  await ctxA.close();
});
