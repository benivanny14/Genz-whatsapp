jest.mock('../models/Conversation', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../models/Channel', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/ChannelPost', () => ({
  find: jest.fn(),
  findById: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../models/Status', () => ({
  countDocuments: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const ChannelPost = require('../models/ChannelPost');
const Status = require('../models/Status');
const { logAdminAction } = require('../utils/auditLogger');
const adminContent = require('../controllers/adminContentController');

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
  query: {},
  admin: { id: 'admin-1', username: 'root' },
  app: { get: jest.fn(() => null) },
  ...overrides
});

const makeChainableFind = (value) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(value),
  select: jest.fn().mockReturnThis()
});

describe('adminContentController — conversations & groups', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists conversations with message counts (happy path)', async () => {
    Conversation.countDocuments.mockResolvedValue(5);
    Conversation.find.mockReturnValue(makeChainableFind([{ _id: 'c1' }, { _id: 'c2' }]));
    Message.countDocuments.mockResolvedValue(3);
    const res = makeRes();
    await adminContent.listConversations(makeReq({ query: {} }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.conversations).toHaveLength(2);
    expect(res.body.conversations[0].messageCount).toBe(3);
  });

  it('returns conversation messages (happy path)', async () => {
    Message.find.mockReturnValue(makeChainableFind([{ _id: 'm1' }]));
    const res = makeRes();
    await adminContent.getConversationMessages(makeReq({ params: { id: 'c1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.messages).toHaveLength(1);
  });

  it('returns 404 when deleting a missing conversation', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await adminContent.deleteConversation(makeReq({ params: { id: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes a conversation and its messages (happy path)', async () => {
    const conv = { _id: 'c1', deleteOne: jest.fn().mockResolvedValue(undefined) };
    Conversation.findById.mockResolvedValue(conv);
    Message.deleteMany.mockResolvedValue({ deletedCount: 5 });
    const res = makeRes();
    await adminContent.deleteConversation(makeReq({ params: { id: 'c1' } }), res);
    expect(res.body.success).toBe(true);
    expect(Message.deleteMany).toHaveBeenCalledWith({ conversationId: 'c1' });
    expect(conv.deleteOne).toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalled();
  });

  it('lists groups with member counts (happy path)', async () => {
    Conversation.countDocuments.mockResolvedValue(2);
    Conversation.find.mockReturnValue(makeChainableFind([
      { _id: 'g1', participants: ['a', 'b', 'c'] },
      { _id: 'g2', participants: [] }
    ]));
    const res = makeRes();
    await adminContent.listGroups(makeReq({ query: {} }), res);
    expect(res.body.groups[0].memberCount).toBe(3);
    expect(res.body.groups[1].memberCount).toBe(0);
  });

  it('returns 404 for a missing group', async () => {
    Conversation.findOne.mockReturnValue(makeChainableFind(null));
    const res = makeRes();
    await adminContent.getGroupMembers(makeReq({ params: { id: 'g1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('gets group members (happy path)', async () => {
    Conversation.findOne.mockReturnValue(makeChainableFind({ _id: 'g1', participants: ['a'] }));
    const res = makeRes();
    await adminContent.getGroupMembers(makeReq({ params: { id: 'g1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.group._id).toBe('g1');
  });

  it('removes a member from a group (happy path)', async () => {
    const group = {
      _id: 'g1',
      participants: ['user-1', 'user-2'],
      admins: ['user-1'],
      save: jest.fn().mockResolvedValue(undefined)
    };
    Conversation.findOne.mockResolvedValue(group);
    const res = makeRes();
    await adminContent.removeGroupMember(makeReq({ params: { id: 'g1', userId: 'user-1' } }), res);
    expect(res.body.success).toBe(true);
    expect(group.participants).toEqual(['user-2']);
    expect(group.admins).toEqual([]);
    expect(group.save).toHaveBeenCalled();
  });

  it('deletes a group and its messages (happy path)', async () => {
    const group = { _id: 'g1', deleteOne: jest.fn().mockResolvedValue(undefined) };
    Conversation.findOne.mockResolvedValue(group);
    const res = makeRes();
    await adminContent.deleteGroup(makeReq({ params: { id: 'g1' } }), res);
    expect(res.body.success).toBe(true);
    expect(Message.deleteMany).toHaveBeenCalledWith({ conversationId: 'g1' });
  });
});

describe('adminContentController — channels & posts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists channels (happy path)', async () => {
    Channel.countDocuments.mockResolvedValue(10);
    Channel.find.mockReturnValue(makeChainableFind([{ _id: 'ch1' }]));
    const res = makeRes();
    await adminContent.listChannels(makeReq({ query: {} }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.channels).toHaveLength(1);
    expect(res.body.pagination.pages).toBe(1);
  });

  it('returns 404 when toggling a missing channel', async () => {
    Channel.findById.mockResolvedValue(null);
    const res = makeRes();
    await adminContent.toggleChannelVerified(makeReq({ params: { id: 'ch1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('toggles channel verified (happy path)', async () => {
    const channel = { _id: 'ch1', verified: false, save: jest.fn().mockResolvedValue(undefined) };
    Channel.findById.mockResolvedValue(channel);
    const res = makeRes();
    await adminContent.toggleChannelVerified(makeReq({ params: { id: 'ch1' } }), res);
    expect(res.body.success).toBe(true);
    expect(channel.verified).toBe(true);
    expect(channel.save).toHaveBeenCalled();
  });

  it('deletes a channel and its posts (happy path)', async () => {
    const channel = { _id: 'ch1', deleteOne: jest.fn().mockResolvedValue(undefined) };
    Channel.findById.mockResolvedValue(channel);
    ChannelPost.deleteMany.mockResolvedValue({});
    const res = makeRes();
    await adminContent.deleteChannel(makeReq({ params: { id: 'ch1' } }), res);
    expect(res.body.success).toBe(true);
    expect(ChannelPost.deleteMany).toHaveBeenCalledWith({ channel: 'ch1' });
  });

  it('lists channel posts (happy path)', async () => {
    ChannelPost.find.mockReturnValue(makeChainableFind([{ _id: 'p1' }]));
    const res = makeRes();
    await adminContent.listChannelPosts(makeReq({ params: { id: 'ch1' } }), res);
    expect(res.body.posts).toHaveLength(1);
  });

  it('soft-deletes a channel post (happy path)', async () => {
    const post = { _id: 'p1', deletedAt: null, save: jest.fn().mockResolvedValue(undefined) };
    ChannelPost.findById.mockResolvedValue(post);
    const res = makeRes();
    await adminContent.deleteChannelPost(makeReq({ params: { postId: 'p1' } }), res);
    expect(res.body.success).toBe(true);
    expect(post.deletedAt).toBeInstanceOf(Date);
    expect(post.save).toHaveBeenCalled();
  });
});

describe('adminContentController — statuses', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists statuses (happy path)', async () => {
    Status.countDocuments.mockResolvedValue(2);
    Status.find.mockReturnValue(makeChainableFind([{ _id: 's1' }]));
    const res = makeRes();
    await adminContent.listStatuses(makeReq({ query: {} }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.statuses).toHaveLength(1);
  });

  it('lists story highlights via aggregate (happy path)', async () => {
    Status.aggregate.mockResolvedValue([{ _id: 'user-1', count: 5 }]);
    const res = makeRes();
    await adminContent.listStoryHighlights(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.highlights).toHaveLength(1);
  });

  it('deletes a status (happy path)', async () => {
    const status = { _id: 's1', deleteOne: jest.fn().mockResolvedValue(undefined) };
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await adminContent.deleteStatus(makeReq({ params: { id: 's1' } }), res);
    expect(res.body.success).toBe(true);
    expect(status.deleteOne).toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalled();
  });
});
