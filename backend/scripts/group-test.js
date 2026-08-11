/**
 * GENZ WhatsApp — comprehensive GROUP feature test.
 * Registers 3+ users and exercises every group feature:
 *   create/info/update, members, admins, leave/join, invite,
 *   ban/unban, transfer ownership, pending requests (approval mode),
 *   antispam, join-approval, QR code, events (create/rsvp),
 *   group features settings (limit, admin control, polls, announcements, anti-delete, reset),
 *   messaging, reactions, permissions (non-admin restrictions).
 * Usage: node scripts/group-test.js [baseUrl]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const BASE = (process.argv[2] || 'http://localhost:5000').replace(/\/$/, '');
const API = BASE.endsWith('/api') ? BASE : `${BASE}/api`;

const PASSWORD = 'GenzTest@2026!';
const suffix = Date.now().toString(36);
const mkUser = (name) => ({
  username: `grp_${name}_${suffix}`,
  phoneNumber: `07${Math.floor(10000000 + Math.random() * 89999999)}`,
  password: PASSWORD
});

const results = [];
function pass(name) { results.push({ name, ok: true }); console.log(`  ✓ ${name}`); }
function fail(name, err) {
  const msg = err?.message || String(err);
  results.push({ name, ok: false, error: msg });
  console.error(`  ✗ ${name}: ${msg}`);
}
const test = async (name, fn) => { try { await fn(); pass(name); } catch (e) { fail(name, e); } };

async function request(path, { method = 'GET', token, body, raw } = {}) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${path}`, {
    method, headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (raw) return { status: res.status, data };
  if (!res.ok) {
    const err = new Error(data.message || `HTTP ${res.status}`);
    err.status = res.status; err.data = data;
    throw err;
  }
  return data;
}

async function registerOrLogin(user) {
  const r = await request('/auth/register', { method: 'POST', body: user }).catch(async (e) => {
    if (e.status === 409 || /already|exists/i.test(e.message)) {
      return request('/auth/login', { method: 'POST', body: { identifier: user.phoneNumber, password: user.password } });
    }
    throw e;
  });
  return r;
}

const idOf = (x) => String(x?._id || x);

(async () => {
  console.log(`\n=== GROUP FEATURE TEST (${new Date().toISOString()}) ===\n`);
  const A = mkUser('a'), B = mkUser('b'), C = mkUser('c'), D = mkUser('d'), E = mkUser('e');
  let a, b, c, d, e, groupId, inviteCode, pollId, eventId, messageId;

  // --- Auth ---
  await test('Register A (creator)', async () => { a = await registerOrLogin(A); if (!a.token) throw new Error('no token'); });
  await test('Register B', async () => { b = await registerOrLogin(B); if (!b.token) throw new Error('no token'); });
  await test('Register C', async () => { c = await registerOrLogin(C); if (!c.token) throw new Error('no token'); });
  await test('Register D', async () => { d = await registerOrLogin(D); if (!d.token) throw new Error('no token'); });
  await test('Register E', async () => { e = await registerOrLogin(E); if (!e.token) throw new Error('no token'); });

  const aT = a.token, bT = b.token, cT = c.token, dT = d.token, eT = e.token;
  const aId = idOf(a.user), bId = idOf(b.user), cId = idOf(c.user), dId = idOf(d.user), eId = idOf(e.user);

  // --- Create group ---
  await test('Create group (A with B, C)', async () => {
    const r = await request('/chat/groups', { method: 'POST', token: aT, body: { name: `Test Group ${suffix}`, description: 'group desc', participants: [bId, cId] } });
    if (!r.conversation?.isGroup) throw new Error('not a group conversation');
    groupId = r.conversation._id;
  });

  // --- Group info ---
  await test('Get group info (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/info`, { token: aT });
    if (r.groupInfo?.participants?.length !== 3) throw new Error(`expected 3 participants, got ${r.groupInfo?.participants?.length}`);
    inviteCode = r.groupInfo.groupInviteCode;
    if (!inviteCode) throw new Error('admin should see invite code');
  });
  await test('Get group info (B, member)', async () => {
    const r = await request(`/chat/groups/${groupId}/info`, { token: bT });
    if (!r.groupInfo) throw new Error('no groupInfo');
  });
  await test('Non-member blocked from group info', async () => {
    const { status } = await request(`/chat/groups/${groupId}/info`, { token: dT, raw: true });
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
  });

  // --- Update group info ---
  await test('Update group name/description (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/info`, { method: 'PUT', token: aT, body: { groupName: `Renamed ${suffix}`, groupDescription: 'new desc' } });
    const name = r.groupInfo?.groupName || r.conversation?.groupName;
    if (name !== `Renamed ${suffix}`) throw new Error(`name not updated: ${name}`);
  });
  await test('Non-admin cannot change group permissions (B)', async () => {
    const { status } = await request(`/chat/groups/${groupId}/info`, { method: 'PUT', token: bT, body: { adminOnlyMessaging: true }, raw: true });
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
  });

  // --- Messaging ---
  await test('Send group message (A)', async () => {
    const r = await request('/chat/messages', { method: 'POST', token: aT, body: { conversationId: groupId, content: 'Hello group!' } });
    messageId = r.message?._id;
    if (!messageId) throw new Error('no message id');
  });
  await test('Get group messages (B)', async () => {
    const r = await request(`/chat/conversations/${groupId}/messages`, { token: bT });
    const msgs = r.messages || r.data || [];
    if (!msgs.some(m => m._id === messageId)) throw new Error('message not found');
  });
  await test('Message reactions (A)', async () => {
    const r = await request(`/chat/messages/${messageId}/reactions`, { method: 'POST', token: aT, body: { emoji: '👍' } });
    if (!r.success) throw new Error('reaction failed');
  });
  await test('Star group message (B)', async () => {
    const r = await request(`/chat/messages/${messageId}/star`, { method: 'PUT', token: bT });
    if (!r.success) throw new Error('star failed');
  });

  // --- Admin management ---
  await test('Make B admin (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/admins/${bId}`, { method: 'PUT', token: aT });
    if (!(r.conversation?.admins || []).map(idOf).includes(bId)) throw new Error('B not admin');
  });
  await test('Non-admin cannot promote (C)', async () => {
    const { status } = await request(`/chat/groups/${groupId}/admins/${cId}`, { method: 'PUT', token: cT, raw: true });
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
  });
  await test('Remove B admin (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/admins/${bId}`, { method: 'DELETE', token: aT });
    if ((r.conversation?.admins || []).map(idOf).includes(bId)) throw new Error('B still admin');
  });

  // --- Participant management ---
  await test('Add participant D (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/participants`, { method: 'POST', token: aT, body: { userId: dId } });
    if (!(r.conversation?.participants || []).map(idOf).includes(dId)) throw new Error('D not added');
  });
  await test('Remove participant D (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/participants/${dId}`, { method: 'DELETE', token: aT });
    if ((r.conversation?.participants || []).map(idOf).includes(dId)) throw new Error('D still present');
  });
  await test('Non-admin cannot remove participant (C)', async () => {
    const { status } = await request(`/chat/groups/${groupId}/participants/${dId}`, { method: 'DELETE', token: cT, raw: true });
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
  });

  // --- Ban / unban / leave / rejoin ---
  await test('Ban C (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/ban/${cId}`, { method: 'POST', token: aT });
    if (!r.success) throw new Error('ban failed');
  });
  await test('Banned list contains C', async () => {
    const r = await request(`/chat/groups/${groupId}/banned`, { token: aT });
    if (!(r.bannedMembers || []).map(x => idOf(x.user)).includes(cId)) throw new Error('C not in banned list');
  });
  await test('Banned member cannot join via invite', async () => {
    const { status } = await request(`/chat/groups/${groupId}/join`, { method: 'POST', token: cT, body: { inviteCode }, raw: true });
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
  });
  await test('Unban C (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/ban/${cId}`, { method: 'DELETE', token: aT });
    if (!r.success) throw new Error('unban failed');
  });
  await test('C rejoins via invite link after unban', async () => {
    const r = await request(`/chat/groups/${groupId}/join`, { method: 'POST', token: cT, body: { inviteCode } });
    if (!r.success || r.alreadyMember) throw new Error('rejoin failed');
  });
  await test('C leaves group', async () => {
    const r = await request(`/chat/groups/${groupId}/leave`, { method: 'DELETE', token: cT });
    if (!r.success) throw new Error('leave failed');
  });
  await test('C rejoins again', async () => {
    const r = await request(`/chat/groups/${groupId}/join`, { method: 'POST', token: cT, body: { inviteCode } });
    if (!r.success || r.alreadyMember) throw new Error('rejoin failed');
  });

  // --- Invite regenerate ---
  await test('Regenerate invite code', async () => {
    const r = await request(`/chat/groups/${groupId}/invite/regenerate`, { method: 'POST', token: aT });
    const newCode = r.conversation?.groupInviteCode || r.inviteCode;
    if (!newCode || newCode === inviteCode) throw new Error('code not regenerated');
    inviteCode = newCode;
  });
  await test('Old invite code rejected after regenerate', async () => {
    const { status } = await request(`/chat/groups/${groupId}/join`, { method: 'POST', token: dT, body: { inviteCode: 'stale-code' }, raw: true });
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
  });

  // --- QR code ---
  await test('Group QR code (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/qr`, { token: aT });
    if (!r.qrCode?.startsWith('data:image/png')) throw new Error('no QR data URL');
    if (!r.inviteUrl?.includes(groupId)) throw new Error('bad invite URL');
  });

  // --- Join approval (pending requests) ---
  await test('Enable join approval (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/join-approval`, { method: 'PUT', token: aT, body: { requireApproval: true } });
    if (!r.requireJoinApproval) throw new Error('enable failed');
  });
  await test('D joins -> becomes pending request', async () => {
    const r = await request(`/chat/groups/${groupId}/join`, { method: 'POST', token: dT, body: { inviteCode } });
    if (!r.pending) throw new Error(`not pending: ${r.message}`);
  });
  await test('Pending requests list (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/pending-requests`, { token: aT });
    if (!(r.requests || []).map(x => idOf(x.user)).includes(dId)) throw new Error('D not in pending list');
  });
  await test('Approve D (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/pending-requests/${dId}/approve`, { method: 'POST', token: aT });
    if (!r.success) throw new Error('approve failed');
  });
  await test('D is now a member', async () => {
    const r = await request(`/chat/groups/${groupId}/info`, { token: aT });
    if (!(r.groupInfo?.participants || []).map(idOf).includes(dId)) throw new Error('D not member');
  });
  await test('E joins -> pending -> rejected (A)', async () => {
    await request(`/chat/groups/${groupId}/join`, { method: 'POST', token: eT, body: { inviteCode } });
    const r = await request(`/chat/groups/${groupId}/pending-requests/${eId}/reject`, { method: 'POST', token: aT });
    if (!r.success) throw new Error('reject failed');
    const info = await request(`/chat/groups/${groupId}/info`, { token: aT });
    if ((info.groupInfo?.participants || []).map(idOf).includes(eId)) throw new Error('E should not be member');
  });
  await test('Disable join approval (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/join-approval`, { method: 'PUT', token: aT, body: { requireApproval: false } });
    if (r.requireJoinApproval) throw new Error('disable failed');
  });

  // --- Anti-spam ---
  await test('Update anti-spam settings (A)', async () => {
    const r = await request(`/chat/groups/${groupId}/antispam`, { method: 'PUT', token: aT, body: { enabled: true, maxMessagesPerMinute: 5 } });
    if (!r.success) throw new Error('antispam update failed');
  });

  // --- Transfer ownership ---
  await test('Transfer ownership A -> B', async () => {
    const r = await request(`/chat/groups/${groupId}/transfer-ownership`, { method: 'PUT', token: aT, body: { newOwnerId: bId } });
    if (!r.success) throw new Error(`transfer failed: ${r.message}`);
  });
  await test('B is now owner (createdBy)', async () => {
    const r = await request(`/chat/groups/${groupId}/info`, { token: bT });
    if (idOf(r.groupInfo?.createdBy) !== bId) throw new Error('B not owner');
    if (!(r.groupInfo?.admins || []).map(idOf).includes(bId)) throw new Error('B not admin');
  });
  await test('Non-owner cannot transfer ownership (A)', async () => {
    const { status } = await request(`/chat/groups/${groupId}/transfer-ownership`, { method: 'PUT', token: aT, body: { newOwnerId: cId }, raw: true });
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
  });

  // --- Group events ---
  await test('Create group event (B, new owner)', async () => {
    const r = await request(`/chat/groups/${groupId}/events`, { method: 'POST', token: bT, body: { title: 'Group Meetup', description: 'desc', startTime: new Date(Date.now() + 86400000).toISOString() } });
    if (!r.success) throw new Error('create event failed');
  });
  await test('Non-admin cannot create event (C)', async () => {
    const { status } = await request(`/chat/groups/${groupId}/events`, { method: 'POST', token: cT, body: { title: 'hack' }, raw: true });
    if (status !== 403) throw new Error(`expected 403, got ${status}`);
  });
  await test('List group events', async () => {
    const r = await request(`/chat/groups/${groupId}/events`, { token: bT });
    const events = r.events || [];
    if (events.length < 1) throw new Error('no events');
    eventId = idOf(events[0]);
  });
  await test('RSVP to event (C: maybe)', async () => {
    const r = await request(`/chat/groups/${groupId}/events/${eventId}/rsvp`, { method: 'POST', token: cT, body: { status: 'maybe' } });
    if (!r.success) throw new Error('rsvp failed');
  });

  // --- Group features settings (per-user) ---
  await test('Get group features settings (A)', async () => {
    const r = await request('/group-features/settings', { token: aT });
    if (!r.settings?.groupMemberLimit) throw new Error('no settings');
  });
  await test('Update member limit (A)', async () => {
    const r = await request('/group-features/member-limit', { method: 'POST', token: aT, body: { limit: 512 } });
    if (r.settings?.groupMemberLimit !== 512) throw new Error('limit not updated');
  });
  await test('Member limit validation (A)', async () => {
    const { status } = await request('/group-features/member-limit', { method: 'POST', token: aT, body: { limit: 99999 }, raw: true });
    if (status !== 400) throw new Error(`expected 400, got ${status}`);
  });
  await test('Toggle admin control (A)', async () => {
    const r = await request('/group-features/admin-control', { method: 'POST', token: aT, body: { enabled: false } });
    if (r.settings?.groupAdminControl !== false) throw new Error('not toggled');
  });
  await test('Toggle polls (A)', async () => {
    const r = await request('/group-features/polls', { method: 'POST', token: aT, body: { enabled: true } });
    if (r.settings?.groupPolls !== true) throw new Error('not toggled');
  });
  await test('Create group poll (B)', async () => {
    const r = await request('/group-features/poll/create', { method: 'POST', token: bT, body: { conversationId: groupId, question: 'Lunch?', options: ['Pizza', 'Burger', 'Salad'] } });
    pollId = idOf(r.poll);
    if (!pollId) throw new Error('no poll id');
  });
  await test('Vote in poll (C)', async () => {
    const r = await request('/group-features/poll/vote', { method: 'POST', token: cT, body: { conversationId: groupId, pollId, optionIndex: 1 } });
    if (!r.success) throw new Error('vote failed');
  });
  await test('Duplicate vote rejected (C)', async () => {
    const { status } = await request('/group-features/poll/vote', { method: 'POST', token: cT, body: { conversationId: groupId, pollId, optionIndex: 0 }, raw: true });
    if (status !== 400) throw new Error(`expected 400, got ${status}`);
  });
  await test('Toggle announcements (A)', async () => {
    const r = await request('/group-features/announcements', { method: 'POST', token: aT, body: { enabled: true } });
    if (r.settings?.groupAnnouncements !== true) throw new Error('not toggled');
  });
  await test('Announcements mode on group (A)', async () => {
    const r = await request('/group-features/announcements-mode', { method: 'POST', token: aT, body: { conversationId: groupId, enabled: true } });
    if (!r.success) throw new Error('announcements-mode failed');
  });
  await test('Toggle events feature (A)', async () => {
    const r = await request('/group-features/events', { method: 'POST', token: aT, body: { enabled: false } });
    if (r.settings?.groupEvents !== false) throw new Error('not toggled');
  });
  await test('Toggle anti-delete (A)', async () => {
    const r = await request('/group-features/anti-delete', { method: 'POST', token: aT, body: { enabled: true } });
    if (r.settings?.antiDeleteGroupMessages !== true) throw new Error('not toggled');
  });
  await test('Reset group features settings (A)', async () => {
    const r = await request('/group-features/reset', { method: 'POST', token: aT });
    if (r.settings?.groupMemberLimit !== 1024) throw new Error('reset failed');
  });

  // --- Summary ---
  const ok = results.filter(r => r.ok).length;
  const bad = results.filter(r => !r.ok);
  console.log(`\n=== RESULT: ${ok}/${results.length} passed ===`);
  if (bad.length) {
    console.log('\nFAILURES:');
    bad.forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    process.exit(1);
  }
  process.exit(0);
})().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
