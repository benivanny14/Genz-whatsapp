/**
 * Unit tests for new group-management controller logic.
 * These mock the Conversation/User models directly so they run WITHOUT
 * a live MongoDB connection — pure logic verification.
 */

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-with-enough-length-for-validation';
process.env.JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

jest.mock('../models/Conversation');
jest.mock('../models/User');

const Conversation = require('../models/Conversation');
const chatController = require('../controllers/chatController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockReq = (overrides = {}) => ({
  user: { _id: 'user_admin_1' },
  params: {},
  body: {},
  app: { get: () => null },
  ...overrides,
});

describe('banMember', () => {
  it('rejects when requester is not an admin', async () => {
    const conv = {
      isGroup: true,
      participants: ['user_admin_1', 'user_target_1'],
      admins: ['user_other_admin'],
      bannedMembers: [],
      save: jest.fn(),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1', userId: 'user_target_1' } });
    const res = mockRes();

    await chatController.banMember(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(conv.save).not.toHaveBeenCalled();
  });

  it('prevents banning the group owner', async () => {
    const conv = {
      isGroup: true,
      participants: ['user_admin_1', 'owner_1'],
      admins: ['user_admin_1'],
      owner: 'owner_1',
      bannedMembers: [],
      save: jest.fn(),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1', userId: 'owner_1' } });
    const res = mockRes();

    await chatController.banMember(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(conv.save).not.toHaveBeenCalled();
  });

  it('successfully bans a member and removes them from participants/admins', async () => {
    const conv = {
      isGroup: true,
      participants: ['user_admin_1', 'user_target_1'],
      admins: ['user_admin_1', 'user_target_1'],
      owner: 'user_admin_1',
      bannedMembers: [],
      save: jest.fn().mockResolvedValue(true),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1', userId: 'user_target_1' }, body: { reason: 'spam' } });
    const res = mockRes();

    await chatController.banMember(req, res);

    expect(conv.participants).not.toContain('user_target_1');
    expect(conv.admins).not.toContain('user_target_1');
    expect(conv.bannedMembers).toHaveLength(1);
    expect(conv.bannedMembers[0].reason).toBe('spam');
    expect(conv.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('transferOwnership', () => {
  it('rejects when requester is not the owner', async () => {
    const conv = {
      isGroup: true,
      owner: 'real_owner',
      createdBy: 'real_owner',
      participants: ['user_admin_1', 'real_owner'],
      admins: ['user_admin_1'],
      save: jest.fn(),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1' }, body: { newOwnerId: 'user_admin_1' } });
    const res = mockRes();

    await chatController.transferOwnership(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(conv.save).not.toHaveBeenCalled();
  });

  it('rejects transferring to a non-member', async () => {
    const conv = {
      isGroup: true,
      owner: 'user_admin_1',
      createdBy: 'user_admin_1',
      participants: ['user_admin_1'],
      admins: ['user_admin_1'],
      save: jest.fn(),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1' }, body: { newOwnerId: 'not_a_member' } });
    const res = mockRes();

    await chatController.transferOwnership(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('successfully transfers ownership to an existing member', async () => {
    const conv = {
      isGroup: true,
      owner: 'user_admin_1',
      createdBy: 'user_admin_1',
      participants: ['user_admin_1', 'member_2'],
      admins: ['user_admin_1'],
      save: jest.fn().mockResolvedValue(true),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1' }, body: { newOwnerId: 'member_2' } });
    const res = mockRes();

    await chatController.transferOwnership(req, res);

    expect(conv.owner).toBe('member_2');
    expect(conv.createdBy).toBe('member_2');
    expect(conv.admins).toContain('member_2');
    expect(conv.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('approveJoinRequest / rejectJoinRequest', () => {
  it('approves a pending request, moving the user into participants', async () => {
    const conv = {
      isGroup: true,
      participants: ['user_admin_1'],
      admins: ['user_admin_1'],
      pendingJoinRequests: [{ user: { toString: () => 'pending_user_1' } }],
      save: jest.fn().mockResolvedValue(true),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1', userId: 'pending_user_1' } });
    const res = mockRes();

    await chatController.approveJoinRequest(req, res);

    expect(conv.pendingJoinRequests).toHaveLength(0);
    expect(conv.participants).toContain('pending_user_1');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('returns 404 when approving a request that does not exist', async () => {
    const conv = {
      isGroup: true,
      participants: ['user_admin_1'],
      admins: ['user_admin_1'],
      pendingJoinRequests: [],
      save: jest.fn(),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1', userId: 'ghost_user' } });
    const res = mockRes();

    await chatController.approveJoinRequest(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects (removes) a pending request without adding to participants', async () => {
    const conv = {
      isGroup: true,
      participants: ['user_admin_1'],
      admins: ['user_admin_1'],
      pendingJoinRequests: [{ user: { toString: () => 'pending_user_1' } }],
      save: jest.fn().mockResolvedValue(true),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1', userId: 'pending_user_1' } });
    const res = mockRes();

    await chatController.rejectJoinRequest(req, res);

    expect(conv.pendingJoinRequests).toHaveLength(0);
    expect(conv.participants).not.toContain('pending_user_1');
  });
});

describe('updateAntiSpam', () => {
  it('rejects non-admins', async () => {
    const conv = {
      isGroup: true,
      admins: ['someone_else'],
      antiSpam: {},
      save: jest.fn(),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1' }, body: { enabled: true } });
    const res = mockRes();

    await chatController.updateAntiSpam(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('updates settings for an admin', async () => {
    const conv = {
      isGroup: true,
      admins: ['user_admin_1'],
      antiSpam: { enabled: false, maxMessagesPerMinute: 20, slowModeSeconds: 0 },
      save: jest.fn().mockResolvedValue(true),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({
      params: { id: 'group1' },
      body: { enabled: true, maxMessagesPerMinute: 5, slowModeSeconds: 30 },
    });
    const res = mockRes();

    await chatController.updateAntiSpam(req, res);

    expect(conv.antiSpam.enabled).toBe(true);
    expect(conv.antiSpam.maxMessagesPerMinute).toBe(5);
    expect(conv.antiSpam.slowModeSeconds).toBe(30);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

describe('removeAdmin (bug fix regression test)', () => {
  it('uses req.params.id (not req.params.groupId) to find the conversation', async () => {
    const conv = {
      isGroup: true,
      admins: ['user_admin_1', 'target_admin'],
      owner: 'user_admin_1',
      createdBy: 'user_admin_1',
      participants: ['user_admin_1', 'target_admin'],
      save: jest.fn().mockResolvedValue(true),
    };
    Conversation.findById.mockResolvedValue(conv);

    const populateChain = {
      populate: jest.fn().mockReturnThis(),
      then: undefined,
    };
    // populateConversation wraps Conversation.findById(id).populate(...).populate(...)
    // We've already mocked findById to resolve a plain object above for the main lookup;
    // confirm the controller does NOT crash due to undefined groupId.
    const req = mockReq({ params: { id: 'group1', memberId: 'target_admin' } });
    const res = mockRes();

    await chatController.removeAdmin(req, res);

    // Previously this used req.params.groupId (undefined) causing Conversation.findById(undefined)
    expect(Conversation.findById).toHaveBeenCalledWith('group1');
    expect(conv.admins).not.toContain('target_admin');
  });

  it('prevents removing the owner from admin role', async () => {
    const conv = {
      isGroup: true,
      admins: ['user_admin_1', 'owner_1'],
      owner: 'owner_1',
      createdBy: 'owner_1',
      participants: ['user_admin_1', 'owner_1'],
      save: jest.fn(),
    };
    Conversation.findById.mockResolvedValue(conv);

    const req = mockReq({ params: { id: 'group1', memberId: 'owner_1' } });
    const res = mockRes();

    await chatController.removeAdmin(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(conv.admins).toContain('owner_1');
  });
});
