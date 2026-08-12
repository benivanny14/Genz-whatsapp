import { test, expect } from '@playwright/test';

/**
 * Privacy contact selector (My Contacts Except...) end-to-end:
 *   1. owner registers, uploads a profile picture, adds a contact via API
 *   2. owner opens Settings → Privacy → Profile photo → My Contacts Except...
 *   3. the contact selector opens (full contact data from /chat/contacts),
 *      the contact is picked, and Done persists the exclusion
 *   4. GET /api/privacy/excluded/profilePhoto returns the normalized record
 *      (privacyType 'profile_photo' — engine-compatible)
 *   5. permission engine: the excluded contact can no longer see the owner's
 *      profile picture when fetching their own contact list.
 *
 * Requires the single-origin stack (backend serves UI + API) — the same
 * dependency as the rest of the e2e suite.
 */
const PASSWORD = 'GenzTest@2026!';

// 1x1 transparent PNG (valid magic bytes for fileValidation).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

let base;
let owner;
let contact;

const register = async (request, prefix) => {
  const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const user = {
    username: `${prefix}_${ts}`,
    phoneNumber: `255748${String(Date.now() + Math.floor(Math.random() * 100000)).slice(-6)}7`,
    password: PASSWORD
  };
  const res = await request.post(`${base}/api/auth/register`, { data: user });
  const data = await res.json();
  if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
  return { id: data.user?._id || data.user?.id, token: data.token, ...user };
};

const loginAs = async (page, phone) => {
  await page.goto('/login');
  await page.locator('input[placeholder="+255712345678"]').fill(phone);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await page.waitForURL(/\/chat/, { timeout: 20_000 });
};

const openPrivacyTab = async (page) => {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.waitForURL(/\/settings/, { timeout: 20_000 });
  await page.getByRole('button', { name: 'Privacy', exact: true }).click();
  await expect(page.getByText('Who can see my personal info', { exact: true })).toBeVisible({ timeout: 20_000 });
};

test.beforeAll(async ({ request }) => {
  base = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';

  // Two fresh users: the privacy owner and a contact to exclude.
  owner = await register(request, 'prvown');
  contact = await register(request, 'prvcnt');
  const ownerAuth = { Authorization: `Bearer ${owner.token}` };

  // Owner adds the contact FIRST (before setting contacts_except privacy) so
  // no automatic permission-inheritance record is created — the exclusion
  // must come purely from the UI selector flow below.
  const add = await request.post(`${base}/api/chat/contacts`, {
    headers: ownerAuth,
    data: { userId: contact.id, savedName: 'Bob Contact' }
  });
  expect(add.status()).toBe(200);

  // Contact adds the owner back so the owner shows up in the contact's own
  // contact list (used by the permission-engine assertion).
  const addBack = await request.post(`${base}/api/chat/contacts`, {
    headers: { Authorization: `Bearer ${contact.token}` },
    data: { userId: owner.id, savedName: 'Alice Owner' }
  });
  expect(addBack.status()).toBe(200);

  // Owner: profile photo visible to contacts except excluded ones + upload a
  // real profile picture so the engine assertion is meaningful.
  const setPrivacy = await request.put(`${base}/api/settings`, {
    headers: ownerAuth,
    data: { privacy: { profilePhoto: 'contacts_except' } }
  });
  expect(setPrivacy.status()).toBe(200);

  const pic = await request.post(`${base}/api/auth/profile/picture`, {
    headers: ownerAuth,
    multipart: { image: { name: 'pic.png', mimeType: 'image/png', buffer: PNG } }
  });
  expect(pic.status()).toBe(200);
});

test('privacy: exclude a contact through the UI selector and verify it persists', async ({ page, request }) => {
  await loginAs(page, owner.phoneNumber);
  await openPrivacyTab(page);

  const profilePhotoSection = page
    .locator('div')
    .filter({ has: page.getByText('Profile photo', { exact: true }) })
    .last();

  // Opens the full-screen contact selector via window.openContactSelector.
  await profilePhotoSection.getByRole('button', { name: 'My Contacts Except...' }).click();
  await expect(page.getByText('Choose Contacts', { exact: true })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Selected (0)', { exact: true })).toBeVisible();

  // The contact shows up with its server data (name + phone + avatar).
  await expect(page.locator('button', { hasText: 'Bob Contact' })).toBeVisible();

  // Pick the contact and save.
  await page.locator('button', { hasText: 'Bob Contact' }).click();
  await expect(page.getByText('Selected (1)', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  // Selector closes.
  await expect(page.getByText('Choose Contacts', { exact: true })).toBeHidden({ timeout: 10_000 });

  // The exclusion record is stored with the engine-compatible privacyType
  // ('profile_photo', normalized from the UI's 'profilePhoto').
  const res = await request.get(`${base}/api/privacy/excluded/profilePhoto`, {
    headers: { Authorization: `Bearer ${owner.token}` }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const records = body.excludedContacts || [];
  const ours = records.find((r) => String(r.excludedContactId) === String(contact.id));
  expect(ours).toBeTruthy();
  expect(ours.privacyType).toBe('profile_photo');
  expect(ours.excludedContactName).toBe('Bob Contact');
});

test('privacy: the excluded contact can no longer see the owner profile picture', async ({ request }) => {
  // The contact fetches their own contact list; the owner is filtered by the
  // permission engine (profilePhoto = contacts_except → excluded → stripped).
  const res = await request.get(`${base}/api/chat/contacts`, {
    headers: { Authorization: `Bearer ${contact.token}` }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  const ownerEntry = (body.contacts || []).find(
    (c) => c.user && String(c.user._id) === String(owner.id)
  );
  expect(ownerEntry).toBeTruthy();
  // profilePicture stripped by applyPrivacyFilter — the exclusion is enforced.
  expect(ownerEntry.user.profilePicture).toBeFalsy();
  // Non-restricted fields still pass through (only the restricted one is removed).
  expect(ownerEntry.user.username).toBeTruthy();

  // Control: a non-excluded observer (the owner) still sees the excluded
  // contact's profile picture (the contact's privacy is the default everyone).
  const ownList = await request.get(`${base}/api/chat/contacts`, {
    headers: { Authorization: `Bearer ${owner.token}` }
  });
  const ownBody = await ownList.json();
  const contactEntry = (ownBody.contacts || []).find(
    (c) => c.user && String(c.user._id) === String(contact.id)
  );
  expect(contactEntry).toBeTruthy();
  // The contact never uploaded a picture, so nothing to compare — assert the
  // engine still returns the user object intact (not stripped wholesale).
  expect(contactEntry.user.username).toBeTruthy();
});
