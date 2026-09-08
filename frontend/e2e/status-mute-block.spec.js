import { test, expect } from '@playwright/test';

/**
 * Status mute / block — server behaviour verified end to end through the SAME
 * feed the UI renders (/api/advanced/status, what StatusList.jsx consumes).
 *
 * The original spec drove row-level Mute/Unmute/Block buttons, but those were
 * removed from StatusList/StatusViewer in a later UI rewrite (StatusBlockPanel
 * is gone too). The backend behaviour still matters and is exercised here:
 *   1. muting the poster's status flags every status of theirs isMuted=true in
 *      the viewer's feed (they stay visible but flagged — WhatsApp parity)
 *   2. unmuting clears the flag
 *   3. blocking the poster via the chat block endpoint (the only block UI that
 *      ships) hides their statuses from the feed entirely
 */

const PASSWORD = 'GenzTest@2026!';

let poster; // { phone, password, token, userId, username }
let viewer; // { phone, password, token }
let statusId;

const base = () => process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5174';

const feedOf = async (request, token) => {
  const res = await request.get(`${base()}/api/advanced/status`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(res.status()).toBe(200);
  const data = await res.json();
  expect(data.success).toBe(true);
  return (data.statuses || []).filter((s) => s.username === poster.username);
};

test.beforeAll(async ({ request }) => {
  const ts = Date.now().toString(36);

  const register = async (prefix) => {
    const user = {
      username: `${prefix}_${ts}`,
      phoneNumber: `25574${String(Date.now()).slice(-7)}`,
      password: PASSWORD
    };
    const reg = await request.post(`${base()}/api/auth/register`, { data: user });
    const data = await reg.json();
    if (!data.token) throw new Error(`register failed: ${JSON.stringify(data)}`);
    return {
      phone: user.phoneNumber,
      password: user.password,
      token: data.token,
      userId: data.user._id || data.user.id,
      username: data.user.username || user.username
    };
  };

  poster = await register('stp');
  viewer = await register('stv');

  // Poster creates a contacts-only status via the API (same endpoint the UI uses).
  const created = await request.post(`${base()}/api/advanced/status`, {
    headers: { Authorization: `Bearer ${poster.token}` },
    data: { type: 'text', content: 'Mute me test status', privacy: 'contacts' }
  });
  const createdData = await created.json();
  if (!createdData.status?._id) throw new Error(`create status failed: ${JSON.stringify(createdData)}`);
  statusId = createdData.status._id;

  // The status feed only shows statuses owned by the VIEWER's contacts
  // AND whose owner also saved the viewer (canViewerSeeStatus) — contacts
  // must be mutual.
  const contact = await request.post(`${base()}/api/chat/contacts/add`, {
    headers: { Authorization: `Bearer ${poster.token}` },
    data: { phone: viewer.phone, savedName: 'Status Viewer' }
  });
  if (!contact.ok()) throw new Error(`add contact failed: ${contact.status()} ${await contact.text()}`);
  const reverse = await request.post(`${base()}/api/chat/contacts/add`, {
    headers: { Authorization: `Bearer ${viewer.token}` },
    data: { phone: poster.phone, savedName: 'Status Poster' }
  });
  if (!reverse.ok()) throw new Error(`reverse add contact failed: ${reverse.status()} ${await reverse.text()}`);
});

test('mute: the poster\'s statuses are flagged isMuted in the viewer feed', async ({ request }) => {
  // Sanity: the poster is visible before muting.
  let list = await feedOf(request, viewer.token);
  expect(list.length).toBe(1);
  expect(list[0].isMuted).toBe(false);

  // Mute via the status endpoint (mutes the status OWNER, WhatsApp behaviour).
  const mute = await request.post(`${base()}/api/status/${statusId}/mute`, {
    headers: { Authorization: `Bearer ${viewer.token}` }
  });
  expect(mute.ok()).toBe(true);

  // Still in the feed (muted never hides), but flagged isMuted so the UI can
  // sink the row into the muted section.
  list = await feedOf(request, viewer.token);
  expect(list.length).toBe(1);
  expect(list[0].isMuted).toBe(true);

  // Self-cleanup so the block test starts unmuted.
  const unmute = await request.post(`${base()}/api/status/${statusId}/unmute`, {
    headers: { Authorization: `Bearer ${viewer.token}` }
  });
  expect(unmute.ok()).toBe(true);
});

test('unmute: clears the muted flag and restores the normal feed state', async ({ request }) => {
  await request.post(`${base()}/api/status/${statusId}/mute`, {
    headers: { Authorization: `Bearer ${viewer.token}` }
  });
  let list = await feedOf(request, viewer.token);
  expect(list[0].isMuted).toBe(true);

  await request.post(`${base()}/api/status/${statusId}/unmute`, {
    headers: { Authorization: `Bearer ${viewer.token}` }
  });
  list = await feedOf(request, viewer.token);
  expect(list.length).toBe(1);
  expect(list[0].isMuted).toBe(false);
});

test('block: hides the poster from the status feed entirely', async ({ request }) => {
  // Sanity: the poster is visible before blocking.
  let list = await feedOf(request, viewer.token);
  expect(list.length).toBe(1);

  // Chat-level block (the shipped block UI) also hides the poster's statuses.
  const block = await request.post(`${base()}/api/chat/users/${poster.userId}/block`, {
    headers: { Authorization: `Bearer ${viewer.token}` }
  });
  expect(block.ok()).toBe(true);

  // Server-side filter: the group disappears after the block.
  list = await feedOf(request, viewer.token);
  expect(list.length).toBe(0);

  // Self-cleanup so re-runs stay deterministic.
  const unblock = await request.delete(`${base()}/api/chat/users/${poster.userId}/block`, {
    headers: { Authorization: `Bearer ${viewer.token}` }
  });
  expect(unblock.ok()).toBe(true);
});
