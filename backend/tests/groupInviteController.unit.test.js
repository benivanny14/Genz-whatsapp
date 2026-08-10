jest.mock('../models/Conversation', () => ({
  findById: jest.fn(),
  findOne: jest.fn()
}));

const Conversation = require('../models/Conversation');
const groupInvite = require('../controllers/groupInviteController');

const makeRes = () => {
  const res = { statusCode: 200 };
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  return res;
};

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeGroup = (overrides = {}) => ({
  _id: 'g1',
  isGroup: true,
  participants: ['user-1', 'user-2'],
  admins: ['user-1'],
  inviteLink: null,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('groupInviteController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for a missing group', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await groupInvite.generateInviteLink(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects generating an invite for a non-admin (403)', async () => {
    Conversation.findById.mockResolvedValue(makeGroup({ admins: ['user-9'] }));
    const res = makeRes();
    await groupInvite.generateInviteLink(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Only admins can generate invite links');
  });

  it('generates an invite link (happy path)', async () => {
    const group = makeGroup();
    Conversation.findById.mockResolvedValue(group);
    const res = makeRes();
    await groupInvite.generateInviteLink(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.body.success).toBe(true);
    expect(group.inviteLink.code).toMatch(/^[0-9a-f]{32}$/);
    expect(group.inviteLink.url).toContain('/invite/');
    expect(group.save).toHaveBeenCalled();
  });

  it('rejects getting an invite for a non-member (403)', async () => {
    Conversation.findById.mockResolvedValue(makeGroup({ participants: ['user-9'] }));
    const res = makeRes();
    await groupInvite.getInviteLink(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Not a group member');
  });

  it('returns the existing invite link (happy path)', async () => {
    const link = { code: 'abc', url: 'http://x/invite/abc' };
    Conversation.findById.mockResolvedValue(makeGroup({ inviteLink: link }));
    const res = makeRes();
    await groupInvite.getInviteLink(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.inviteLink.code).toBe('abc');
  });

  it('revokes an invite link (happy path)', async () => {
    const group = makeGroup({ inviteLink: { code: 'abc' } });
    Conversation.findById.mockResolvedValue(group);
    const res = makeRes();
    await groupInvite.revokeInviteLink(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.body.success).toBe(true);
    expect(group.inviteLink).toBeNull();
    expect(group.save).toHaveBeenCalled();
  });

  it('returns 404 for an invalid invite code', async () => {
    Conversation.findOne.mockResolvedValue(null);
    const res = makeRes();
    await groupInvite.joinViaInviteLink(makeReq({ params: { inviteCode: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Invalid or expired invite link');
  });

  it('rejects joining an expired invite (400)', async () => {
    Conversation.findOne.mockResolvedValue(makeGroup({ inviteLink: { expiresAt: new Date(Date.now() - 1000) } }));
    const res = makeRes();
    await groupInvite.joinViaInviteLink(makeReq({ params: { inviteCode: 'abc' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invite link has expired');
  });

  it('rejects joining when the user is already a member (400)', async () => {
    Conversation.findOne.mockResolvedValue(makeGroup({ inviteLink: { uses: 0 }, participants: ['user-1'] }));
    const res = makeRes();
    await groupInvite.joinViaInviteLink(makeReq({ params: { inviteCode: 'abc' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('You are already a member of this group');
  });

  it('queues a join request when approval is required (happy path)', async () => {
    const group = makeGroup({ participants: ['user-2'], inviteApprovalRequired: true, joinRequests: [], inviteLink: { uses: 0, expiresAt: null, maxUses: null } });
    Conversation.findOne.mockResolvedValue(group);
    const res = makeRes();
    await groupInvite.joinViaInviteLink(makeReq({ params: { inviteCode: 'abc' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.requiresApproval).toBe(true);
    expect(group.joinRequests).toHaveLength(1);
  });

  it('joins the group and increments the invite use count (happy path)', async () => {
    const group = makeGroup({ participants: ['user-2'], inviteLink: { uses: 0, expiresAt: null, maxUses: null } });
    Conversation.findOne.mockResolvedValue(group);
    const res = makeRes();
    await groupInvite.joinViaInviteLink(makeReq({ params: { inviteCode: 'abc' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.conversationId).toBe('g1');
    expect(group.participants).toContain('user-1');
    expect(group.inviteLink.uses).toBe(1);
  });

  it('resets an invite link (happy path)', async () => {
    const group = makeGroup();
    Conversation.findById.mockResolvedValue(group);
    const res = makeRes();
    await groupInvite.resetInviteLink(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.body.success).toBe(true);
    expect(group.inviteLink.uses).toBe(0);
    expect(group.save).toHaveBeenCalled();
  });
});
