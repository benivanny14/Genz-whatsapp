jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
  updateOne: jest.fn()
}));

jest.mock('../models/Message', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateMany: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../models/AbuseReport', () => jest.fn());

jest.mock('../models/PrivacyExcludedContact', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/PrivacyAllowedContact', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../utils/privacyHelper', () => ({
  applyPrivacyFilter: jest.fn((u) => Promise.resolve(u))
}));

jest.mock('../utils/mentions', () => ({
  resolveMessageMentions: jest.fn().mockResolvedValue({ mentions: [], mentionedUserIds: [], mentionedUsers: [] })
}));

jest.mock('../utils/messageSendHelpers', () => ({
  ...jest.requireActual('../utils/messageSendHelpers'),
  isConversationBlocked: jest.fn().mockResolvedValue(false)
}));

jest.mock('../utils/messageSerializer', () => ({
  serializeOutgoingMessage: jest.fn((m, extra) => ({ ...m, ...extra }))
}));

jest.mock('../services/notificationService', () => ({
  sendMentionNotification: jest.fn().mockResolvedValue({}),
  sendNewMessageNotification: jest.fn().mockResolvedValue({})
}));

jest.mock('../utils/unreadCount', () => ({
  ensureUnreadMap: jest.fn(),
  getUnreadCount: jest.fn(() => 0)
}));

jest.mock('../utils/contentFilter', () => ({
  containsProfanity: jest.fn(() => false)
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const AbuseReport = require('../models/AbuseReport');
const { applyPrivacyFilter } = require('../utils/privacyHelper');
const { serializeOutgoingMessage } = require('../utils/messageSerializer');
const { resolveMessageMentions } = require('../utils/mentions');
const { isConversationBlocked } = require('../utils/messageSendHelpers');
const { containsProfanity } = require('../utils/contentFilter');
const chat = require('../controllers/chatController');

// Model statics leak implementations across tests (clearAllMocks keeps
// mockReturnValue/once queues). Reset every model static before each test
// and restore the pure helper implementations.
const resetModelMocks = () => {
  [User, Conversation, Message].forEach((model) => {
    ['findById', 'findOne', 'find', 'create', 'findByIdAndUpdate', 'findOneAndUpdate', 'updateMany', 'updateOne', 'countDocuments'].forEach((k) => {
      if (typeof model[k] === 'function') model[k].mockReset();
    });
  });
  AbuseReport.mockReset();
  containsProfanity.mockReset();
  isConversationBlocked.mockReset();
  applyPrivacyFilter.mockImplementation((u) => Promise.resolve(u));
  resolveMessageMentions.mockImplementation(() => Promise.resolve({ mentions: [], mentionedUserIds: [], mentionedUsers: [] }));
};

beforeEach(resetModelMocks);

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
  headers: {},
  path: '',
  app: { get: jest.fn(() => undefined) },
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const VALID_ID = '507f1f77bcf86cd799439011'; // 24-hex ObjectId for validated routes

const makeConv = (overrides = {}) => ({
  _id: 'c1',
  participants: ['user-1', 'user-2'],
  admins: ['user-1'],
  isGroup: false,
  groupName: 'Group A',
  groupDescription: '',
  createdBy: 'user-1',
  owner: 'user-1',
  deletedFor: [],
  bannedMembers: [],
  pendingJoinRequests: [],
  unreadCount: { 'user-1': 0 },
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeMessage = (overrides = {}) => ({
  _id: 'm1',
  conversationId: 'c1',
  sender: 'user-2',
  content: 'Hello',
  messageType: 'text',
  reactions: [],
  deletedFor: [],
  isStarred: false,
  isLocked: false,
  status: 'sent',
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

// populateConversation: find -> populate x3 (last one resolves)
const populateChain = (result) => {
  const c3 = { populate: jest.fn().mockResolvedValue(result) };
  const c2 = { populate: jest.fn().mockReturnValue(c3) };
  const c1 = { populate: jest.fn().mockReturnValue(c2) };
  return c1;
};

// message find chains: find -> populate x3 -> sort -> skip -> limit
const msgFindChain = (result, { sortLimit = false, skip = false } = {}) => {
  let q = sortLimit
    ? { limit: jest.fn().mockResolvedValue(result) }
    : { sort: jest.fn().mockResolvedValue(result) };
  if (sortLimit && skip) {
    q = { skip: jest.fn().mockReturnValue(q) };
  }
  if (sortLimit) {
    q = { sort: jest.fn().mockReturnValue(q) };
  }
  for (let i = 0; i < 3; i++) {
    q = { populate: jest.fn().mockReturnValue(q) };
  }
  return q;
};

// message findById populate x4 (edit/reaction paths)
const msgById4 = (result) => {
  const c4 = { populate: jest.fn().mockResolvedValue(result) };
  const c3 = { populate: jest.fn().mockReturnValue(c4) };
  const c2 = { populate: jest.fn().mockReturnValue(c3) };
  const c1 = { populate: jest.fn().mockReturnValue(c2) };
  return c1;
};

// message findById populate x3 (star/lock paths)
const msgById3 = (result) => {
  const c3 = { populate: jest.fn().mockResolvedValue(result) };
  const c2 = { populate: jest.fn().mockReturnValue(c3) };
  const c1 = { populate: jest.fn().mockReturnValue(c2) };
  return c1;
};

describe('chatController — conversations', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getConversations returns 500 without an authenticated user (auth)', async () => {
    const res = makeRes();
    await chat.getConversations(makeReq({ user: undefined }), res);
    expect(res.statusCode).toBe(500);
  });

  it('getConversations lists and transforms conversations (happy path)', async () => {
    const conv = makeConv({ updatedAt: new Date('2025-06-01T00:00:00Z') });
    Conversation.find.mockReturnValue(populateChain([conv]));
    User.findById.mockReturnValue({ select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue({ blockedUsers: [] }) })) });
    const res = makeRes();
    await chat.getConversations(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.conversations).toHaveLength(1);
    expect(applyPrivacyFilter).toHaveBeenCalled();
  });

  it('getConversations hides 1:1 chats with blocked users but keeps groups', async () => {
    const dm = makeConv({ _id: 'c-dm', participants: ['user-1', 'user-9'] });
    const group = makeConv({ _id: 'c-grp', participants: ['user-1', 'user-9'], isGroup: true });
    Conversation.find.mockReturnValue(populateChain([dm, group]));
    User.findById.mockReturnValue({ select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue({ blockedUsers: ['user-9'] }) })) });
    const res = makeRes();
    await chat.getConversations(makeReq(), res);
    expect(res.body.conversations.map((c) => c._id)).toEqual(['c-grp']);
  });

  it('getConversation returns 404 for a missing conversation', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await chat.getConversation(makeReq({ params: { id: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('getConversation forbids non-participants (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ participants: ['user-9'] }));
    const res = makeRes();
    await chat.getConversation(makeReq({ params: { id: 'c1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('getConversation returns the populated conversation (happy path)', async () => {
    const conv = makeConv();
    Conversation.findById.mockResolvedValueOnce(conv).mockReturnValueOnce(populateChain(conv));
    const res = makeRes();
    await chat.getConversation(makeReq({ params: { id: 'c1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.conversation._id).toBe('c1');
  });

  it('getOrCreateConversation requires a userId (validation)', async () => {
    const res = makeRes();
    await chat.getOrCreateConversation(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('User ID is required');
  });

  it('getOrCreateConversation returns 404 for an unknown user', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await chat.getOrCreateConversation(makeReq({ body: { userId: 'user-9' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('getOrCreateConversation reuses an existing conversation (happy path)', async () => {
    const conv = makeConv();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'user-2', settings: {} }) });
    Conversation.findOne.mockResolvedValue(conv);
    Conversation.findById.mockReturnValue(populateChain(conv));
    const res = makeRes();
    await chat.getOrCreateConversation(makeReq({ body: { userId: 'user-2' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.conversation._id).toBe('c1');
  });

  it('getOrCreateConversation creates a new conversation with the default timer (happy path)', async () => {
    const conv = makeConv();
    User.findById
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ _id: 'user-2', settings: {} }) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ settings: { privacy: { defaultMessageTimer: '24h' } } }) });
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue(conv);
    Conversation.findById.mockReturnValue(populateChain(conv));
    const res = makeRes();
    await chat.getOrCreateConversation(makeReq({ body: { userId: 'user-2' } }), res);
    const created = Conversation.create.mock.calls[0][0];
    expect(created.participants).toEqual(['user-1', 'user-2']);
    expect(created.disappearingMessages.enabled).toBe(true);
    expect(created.disappearingMessages.timer).toBe(24);
    expect(res.body.conversation._id).toBe('c1');
  });
});

describe('chatController — groups', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createGroup requires a name (validation)', async () => {
    const res = makeRes();
    await chat.createGroup(makeReq({ body: { participants: ['user-2'] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Group name is required');
  });

  it('createGroup requires at least one other participant', async () => {
    const res = makeRes();
    await chat.createGroup(makeReq({ body: { name: 'G', participants: [] } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('createGroup rejects unknown participants', async () => {
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'user-2' }]) });
    const res = makeRes();
    await chat.createGroup(makeReq({ body: { name: 'G', participants: ['user-2', 'user-9'] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('One or more participants were not found');
  });

  it('createGroup respects group privacy settings (403)', async () => {
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'user-2', settings: { privacy: { groups: 'contacts' } }, contacts: [] }]) });
    const res = makeRes();
    await chat.createGroup(makeReq({ body: { name: 'G', participants: ['user-2'] } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('createGroup creates the group with a system message (happy path)', async () => {
    // createSystemMessage requires valid ObjectIds for both conversation and actor
    const group = makeConv({ isGroup: true, groupName: 'G', _id: VALID_ID });
    const creator = { _id: VALID_ID, username: 'alice' };
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'user-2', settings: {}, contacts: [] }]) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(creator) });
    Conversation.create.mockResolvedValue(group);
    Message.create.mockResolvedValue(makeMessage());
    Conversation.findById.mockReturnValue(populateChain(group));
    const res = makeRes();
    await chat.createGroup(makeReq({ user: creator, body: { name: 'G', participants: ['user-2'] } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.conversation.isGroup).toBe(true);
    expect(Conversation.create.mock.calls[0][0].admins).toEqual([VALID_ID]);
    expect(Message.create).toHaveBeenCalled(); // system message
    expect(group.save).toHaveBeenCalled();
  });

  it('addParticipant rejects non-group conversations (400)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: false }));
    const res = makeRes();
    await chat.addParticipant(makeReq({ params: { id: 'c1' }, body: { userId: 'user-3' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Not a group conversation');
  });

  it('addParticipant forbids non-admins (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'] }));
    const res = makeRes();
    await chat.addParticipant(makeReq({ params: { id: 'c1' }, body: { userId: 'user-3' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('addParticipant rejects users already in the group (400)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, participants: ['user-1', 'user-3'] }));
    const res = makeRes();
    await chat.addParticipant(makeReq({ params: { id: 'c1' }, body: { userId: 'user-3' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('User already in group');
  });

  it('addParticipant adds a member (happy path)', async () => {
    const conv = makeConv({ isGroup: true });
    Conversation.findById
      .mockResolvedValueOnce(conv)
      .mockReturnValueOnce(populateChain(conv));
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'user-3', username: 'carol', settings: {}, contacts: [] }) });
    Message.create.mockResolvedValue(makeMessage());
    const res = makeRes();
    await chat.addParticipant(makeReq({ params: { id: 'c1' }, body: { userId: 'user-3' } }), res);
    expect(conv.participants).toContain('user-3');
    expect(conv.save).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('removeParticipant forbids non-admins (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'] }));
    const res = makeRes();
    await chat.removeParticipant(makeReq({ params: { id: 'c1', userId: 'user-2' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('removeParticipant removes the member (happy path)', async () => {
    const conv = makeConv({ isGroup: true, participants: ['user-1', 'user-2'], admins: ['user-1'] });
    Conversation.findById
      .mockResolvedValueOnce(conv)
      .mockReturnValueOnce(populateChain(conv));
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ username: 'bob' }) });
    Message.create.mockResolvedValue(makeMessage());
    const res = makeRes();
    await chat.removeParticipant(makeReq({ params: { id: 'c1', userId: 'user-2' } }), res);
    expect(conv.participants).toEqual(['user-1']);
    expect(conv.save).toHaveBeenCalled();
  });

  it('makeAdmin forbids non-admins (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'] }));
    const res = makeRes();
    await chat.makeAdmin(makeReq({ params: { id: 'c1', userId: 'user-2' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('makeAdmin promotes a member (happy path)', async () => {
    const conv = makeConv({ isGroup: true, admins: ['user-1'] });
    Conversation.findById
      .mockResolvedValueOnce(conv)
      .mockReturnValueOnce(populateChain(conv));
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ username: 'bob' }) });
    Message.create.mockResolvedValue(makeMessage());
    const res = makeRes();
    await chat.makeAdmin(makeReq({ params: { id: 'c1', userId: 'user-2' } }), res);
    expect(conv.admins).toContain('user-2');
    expect(res.body.success).toBe(true);
  });

  it('leaveGroup removes the member and auto-promotes an admin (happy path)', async () => {
    const conv = makeConv({ isGroup: true, participants: ['user-1', 'user-2'], admins: ['user-1'] });
    Conversation.findById.mockResolvedValue(conv);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ username: 'alice' }) });
    Message.create.mockResolvedValue(makeMessage());
    const res = makeRes();
    await chat.leaveGroup(makeReq({ params: { id: 'c1' } }), res);
    expect(conv.participants).toEqual(['user-2']);
    expect(conv.admins).toEqual(['user-2']); // auto-promoted
    expect(res.body.message).toBe('Left group successfully');
  });
});

describe('chatController — messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    containsProfanity.mockReturnValue(false);
    isConversationBlocked.mockResolvedValue(false);
  });

  it('getMessages returns paginated messages (happy path)', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    const messages = [makeMessage(), makeMessage({ _id: 'm2' })];
    Message.find.mockReturnValue(msgFindChain(messages, { sortLimit: true, skip: true }));
    Message.countDocuments.mockResolvedValue(2);
    const res = makeRes();
    await chat.getMessages(makeReq({ params: { id: 'c1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.messages).toHaveLength(2);
    expect(res.body.pagination.pages).toBe(1);
    expect(Message.find).toHaveBeenCalledWith(expect.objectContaining({ conversationId: 'c1' }));
  });

  it('getMessages forbids non-participants (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ participants: ['user-9'] }));
    const res = makeRes();
    await chat.getMessages(makeReq({ params: { id: 'c1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('sendMessage rejects an invalid conversation id (validation)', async () => {
    const res = makeRes();
    await chat.sendMessage(makeReq({ body: { conversationId: 'nope', content: 'hi' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('A valid Conversation ID is required');
  });

  it('sendMessage rejects profane content (validation)', async () => {
    containsProfanity.mockReturnValue(true);
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.sendMessage(makeReq({ body: { conversationId: VALID_ID, content: 'bad' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('sendMessage blocks when the receiver blocked the sender (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ blockedUsers: ['user-1'] }) });
    const res = makeRes();
    await chat.sendMessage(makeReq({ body: { conversationId: VALID_ID, content: 'hi' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Cannot message this user');
  });

  it('sendMessage rejects missing content (validation)', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ blockedUsers: [] }) });
    const res = makeRes();
    await chat.sendMessage(makeReq({ body: { conversationId: VALID_ID } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Message content or media is required');
  });

  it('sendMessage enforces admin-only messaging in groups (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'], adminOnlyMessaging: true }));
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ blockedUsers: [] }) });
    const res = makeRes();
    await chat.sendMessage(makeReq({ body: { conversationId: VALID_ID, content: 'hi' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Only admins can send messages in this group');
  });

  it('sendMessage stores and returns the message (happy path)', async () => {
    const conv = makeConv({ participants: ['user-1', 'user-2'] });
    Conversation.findById.mockResolvedValue(conv);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ blockedUsers: [] }) });
    const raw = makeMessage({ content: 'Mambo' });
    const populated = makeMessage({ content: 'Mambo', sender: { _id: 'user-1', username: 'alice' } });
    Message.create.mockResolvedValue(raw);
    Message.findById.mockReturnValue(msgById3(populated));
    Conversation.findByIdAndUpdate.mockResolvedValue(conv);
    const res = makeRes();
    await chat.sendMessage(makeReq({ body: { conversationId: VALID_ID, content: 'Mambo' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Message.create.mock.calls[0][0].content).toBe('Mambo');
    expect(Message.create.mock.calls[0][0].sender).toBe('user-1');
    expect(Conversation.findByIdAndUpdate).toHaveBeenCalled();
    expect(serializeOutgoingMessage).toHaveBeenCalled();
  });

  it('sendMessage returns the existing message on duplicate clientMessageId', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ blockedUsers: [] }) });
    const existing = { _id: 'm9', content: 'dup' };
    Message.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'm9' }) });
    Message.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(existing) });
    const res = makeRes();
    await chat.sendMessage(makeReq({ body: { conversationId: VALID_ID, content: 'x', messageId: 'client-1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.duplicate).toBe(true);
    expect(Message.create).not.toHaveBeenCalled();
  });

  it('editMessage returns 404 for a missing message', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await chat.editMessage(makeReq({ params: { id: 'm1' }, body: { content: 'x' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('editMessage forbids non-senders (403)', async () => {
    Message.findById.mockResolvedValue(makeMessage({ sender: 'user-9' }));
    const res = makeRes();
    await chat.editMessage(makeReq({ params: { id: 'm1' }, body: { content: 'x' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('editMessage rejects non-editable types (400)', async () => {
    Message.findById.mockResolvedValue(makeMessage({ messageType: 'poll', sender: 'user-1' }));
    const res = makeRes();
    await chat.editMessage(makeReq({ params: { id: 'm1' }, body: { content: 'x' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Can only edit text messages and media captions');
  });

  it('editMessage saves edit history (happy path)', async () => {
    const message = makeMessage({ sender: 'user-1', content: 'old' });
    Message.findById
      .mockResolvedValueOnce(message)
      .mockReturnValueOnce(msgById4(message));
    const res = makeRes();
    await chat.editMessage(makeReq({ params: { id: 'm1' }, body: { content: 'new' } }), res);
    expect(message.content).toBe('new');
    expect(message.isEdited).toBe(true);
    expect(message.editHistory).toHaveLength(1);
    expect(message.editHistory[0].content).toBe('old');
    expect(message.save).toHaveBeenCalled();
  });

  it('deleteMessage returns 404 for a missing message', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await chat.deleteMessage(makeReq({ params: { id: 'm1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deleteMessage refuses to delete locked messages (403)', async () => {
    Message.findById.mockResolvedValue(makeMessage({ isLocked: true }));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.deleteMessage(makeReq({ params: { id: 'm1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deleteMessage forbids non-senders from delete-for-everyone (403)', async () => {
    Message.findById.mockResolvedValue(makeMessage({ sender: 'user-2' }));
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'], createdBy: 'user-9' }));
    const res = makeRes();
    await chat.deleteMessage(makeReq({ params: { id: 'm1' }, body: { forEveryone: true } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deleteMessage deletes for everyone as admin (happy path)', async () => {
    const message = makeMessage({ sender: 'user-2' });
    Message.findById.mockResolvedValue(message);
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, admins: ['user-1'], createdBy: 'user-1' }));
    const res = makeRes();
    await chat.deleteMessage(makeReq({ params: { id: 'm1' }, body: { forEveryone: true } }), res);
    expect(message.deletedForEveryone).toBe(true);
    expect(message.wasDeletedBySender).toBe(false);
    expect(message.deletedByAdmin).toBe(true);
    expect(message.save).toHaveBeenCalled();
  });

  it('deleteMessage deletes for me (happy path)', async () => {
    const message = makeMessage({ sender: 'user-2', deletedFor: [] });
    Message.findById.mockResolvedValue(message);
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.deleteMessage(makeReq({ params: { id: 'm1' } }), res);
    expect(message.deletedFor).toContain('user-1');
    expect(message.save).toHaveBeenCalled();
  });

  it('markAsRead returns 404 for a missing message', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await chat.markAsRead(makeReq({ params: { id: 'm1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('markAsRead rejects reading your own message (400)', async () => {
    Message.findById.mockResolvedValue(makeMessage({ sender: 'user-1' }));
    const res = makeRes();
    await chat.markAsRead(makeReq({ params: { id: 'm1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Cannot mark own message as read');
  });

  it('markAsRead marks read and decrements unread (happy path)', async () => {
    const message = makeMessage({ sender: 'user-2' });
    Message.findById.mockResolvedValue(message);
    Conversation.findById
      .mockResolvedValueOnce(makeConv())
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(makeConv()) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ settings: { privacy: { readReceipts: true } } }) });
    Message.findOneAndUpdate.mockResolvedValue({});
    Conversation.findOneAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await chat.markAsRead(makeReq({ params: { id: 'm1' } }), res);
    expect(Message.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'm1', 'readBy.user': { $ne: 'user-1' } },
      expect.objectContaining({ $push: expect.any(Object) })
    );
    expect(Conversation.findOneAndUpdate).toHaveBeenCalled();
    expect(res.body.message).toBe('Message marked as read');
  });

  it('addReaction returns 404 for a missing message', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await chat.addReaction(makeReq({ params: { id: 'm1' }, body: { emoji: '🔥' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('addReaction adds a new reaction (happy path)', async () => {
    const message = makeMessage();
    Message.findById
      .mockResolvedValueOnce(message)
      .mockReturnValueOnce(msgById4(message));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.addReaction(makeReq({ params: { id: 'm1' }, body: { emoji: '🔥' } }), res);
    expect(message.reactions).toHaveLength(1);
    expect(message.reactions[0].emoji).toBe('🔥');
    expect(message.save).toHaveBeenCalled();
  });

  it('addReaction replaces an existing reaction', async () => {
    const message = makeMessage({ reactions: [{ user: 'user-1', emoji: '😀' }] });
    Message.findById
      .mockResolvedValueOnce(message)
      .mockReturnValueOnce(msgById4(message));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.addReaction(makeReq({ params: { id: 'm1' }, body: { emoji: '🔥' } }), res);
    expect(message.reactions).toHaveLength(1);
    expect(message.reactions[0].emoji).toBe('🔥');
  });

  it('removeReaction removes the user reaction (happy path)', async () => {
    const message = makeMessage({ reactions: [{ user: 'user-1', emoji: '🔥' }] });
    Message.findById
      .mockResolvedValueOnce(message)
      .mockReturnValueOnce(msgById4(message));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.removeReaction(makeReq({ params: { id: 'm1' } }), res);
    expect(message.reactions).toHaveLength(0);
    expect(message.save).toHaveBeenCalled();
  });
});

describe('chatController — contacts and moderation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('searchUsers requires a query (validation)', async () => {
    const res = makeRes();
    await chat.searchUsers(makeReq({ query: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Search query is required');
  });

  it('searchUsers returns privacy-filtered matches (happy path)', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ blockedUsers: [] }) });
    const found = [{ _id: 'user-2', username: 'bob' }];
    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(found) })
    });
    const res = makeRes();
    await chat.searchUsers(makeReq({ query: { query: 'bob' } }), res);
    expect(res.body.users).toHaveLength(1);
    expect(User.find).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.any(Array) }));
  });

  it('addContact validates the target (400)', async () => {
    const res = makeRes();
    await chat.addContact(makeReq({ body: { userId: 'user-1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('addContact adds a contact (happy path)', async () => {
    const user = { _id: 'user-1', blockedUsers: [], contacts: [], save: jest.fn().mockResolvedValue(undefined) };
    User.findById
      .mockResolvedValueOnce(user)
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ _id: 'user-2', username: 'bob', phoneNumber: '255' }) });
    const res = makeRes();
    await chat.addContact(makeReq({ body: { userId: 'user-2', savedName: 'Bobby' } }), res);
    expect(user.contacts).toHaveLength(1);
    expect(user.contacts[0].savedName).toBe('Bobby');
    expect(user.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Contact added');
  });

  it('addContactByPhone rejects missing fields (validation)', async () => {
    const res = makeRes();
    await chat.addContactByPhone(makeReq({ body: { phone: '255' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('addContactByPhone returns 404 for unregistered numbers', async () => {
    User.findOne.mockResolvedValue(null);
    const res = makeRes();
    await chat.addContactByPhone(makeReq({ body: { phone: '255', savedName: 'Bob' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('addContactByPhone adds the contact and creates a conversation (happy path)', async () => {
    const contact = { _id: 'user-2', username: 'bob', phoneNumber: '255' };
    User.findOne.mockResolvedValue(contact);
    const currentUser = { _id: 'user-1', contacts: [], save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(currentUser);
    Conversation.findOne.mockResolvedValue(null);
    Conversation.create.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.addContactByPhone(makeReq({ body: { phone: '255', savedName: 'Bob' } }), res);
    expect(currentUser.contacts).toHaveLength(1);
    expect(Conversation.create).toHaveBeenCalledWith({ participants: ['user-1', 'user-2'], isGroup: false });
    expect(res.body.conversationId).toBe('c1');
  });

  it('blockUser forbids blocking yourself (400)', async () => {
    const res = makeRes();
    await chat.blockUser(makeReq({ params: { id: 'user-1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('blockUser blocks and removes the contact (happy path)', async () => {
    const user = {
      _id: 'user-1',
      username: 'alice',
      blockedUsers: [],
      contacts: [{ user: 'user-2', savedName: 'Bob' }],
      save: jest.fn().mockResolvedValue(undefined)
    };
    User.findById
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue({ _id: 'user-2' }) })
      .mockResolvedValueOnce(user);
    User.updateOne.mockResolvedValue({});
    const res = makeRes();
    await chat.blockUser(makeReq({ params: { id: 'user-2' } }), res);
    expect(user.blockedUsers).toEqual(['user-2']);
    expect(user.contacts).toHaveLength(0);
    expect(user.save).toHaveBeenCalled();
    expect(User.updateOne).toHaveBeenCalled();
    expect(res.body.message).toBe('User blocked');
  });

  it('unblockUser pulls the block and records an alert (happy path)', async () => {
    User.updateOne.mockResolvedValue({});
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ username: 'alice' }) });
    const res = makeRes();
    await chat.unblockUser(makeReq({ params: { id: 'user-2' } }), res);
    expect(User.updateOne).toHaveBeenCalledWith({ _id: 'user-1' }, { $pull: { blockedUsers: 'user-2' } });
    expect(res.body.message).toBe('User unblocked');
  });
});

describe('chatController — star/lock/keep/pin/archive/search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('toggleStarMessage toggles and saves (happy path)', async () => {
    const message = makeMessage({ isStarred: false });
    Message.findById
      .mockResolvedValueOnce(message)
      .mockReturnValueOnce(msgById3(message));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.toggleStarMessage(makeReq({ params: { messageId: 'm1' } }), res);
    expect(message.isStarred).toBe(true);
    expect(message.save).toHaveBeenCalled();
  });

  it('toggleStarMessage accepts an explicit state', async () => {
    const message = makeMessage({ isStarred: true });
    Message.findById
      .mockResolvedValueOnce(message)
      .mockReturnValueOnce(msgById3(message));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.toggleStarMessage(makeReq({ params: { messageId: 'm1' }, body: { isStarred: false } }), res);
    expect(message.isStarred).toBe(false);
  });

  it('toggleMessageLock toggles the lock (happy path)', async () => {
    const message = makeMessage({ isLocked: false });
    Message.findById
      .mockResolvedValueOnce(message)
      .mockReturnValueOnce(msgById3(message));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.toggleMessageLock(makeReq({ params: { id: 'm1' } }), res);
    expect(message.isLocked).toBe(true);
  });

  it('toggleKeepMessage rejects messages that do not disappear (400)', async () => {
    Message.findById.mockResolvedValue(makeMessage());
    const res = makeRes();
    await chat.toggleKeepMessage(makeReq({ params: { id: 'm1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('This message is not set to disappear');
  });

  it('toggleKeepMessage restricts keeping to the sender (403)', async () => {
    Message.findById.mockResolvedValue(makeMessage({ disappearAt: new Date(Date.now() + 3600000) }));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.toggleKeepMessage(makeReq({ params: { id: 'm1' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Only the sender can keep this message');
  });

  it('toggleKeepMessage keeps and unkeeps (happy path)', async () => {
    const message = makeMessage({ sender: 'user-1', disappearAt: new Date(Date.now() + 3600000), keptBy: [] });
    Message.findById
      .mockResolvedValueOnce(message)
      .mockReturnValueOnce(msgById4(message));
    Conversation.findById.mockResolvedValue(makeConv());
    let res = makeRes();
    await chat.toggleKeepMessage(makeReq({ params: { id: 'm1' } }), res);
    expect(message.keptBy).toHaveLength(1);

    const message2 = makeMessage({ sender: 'user-1', disappearAt: new Date(Date.now() + 3600000), keptBy: [{ user: 'user-1' }] });
    Message.findById
      .mockResolvedValueOnce(message2)
      .mockReturnValueOnce(msgById4(message2));
    Conversation.findById.mockResolvedValue(makeConv());
    res = makeRes();
    await chat.toggleKeepMessage(makeReq({ params: { id: 'm1' } }), res);
    expect(message2.keptBy).toHaveLength(0);
  });

  it('togglePinConversation toggles the pin map (happy path)', async () => {
    const conv = makeConv();
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await chat.togglePinConversation(makeReq({ params: { conversationId: 'c1' } }), res);
    expect(conv.isPinned['user-1']).toBe(true);
    expect(conv.save).toHaveBeenCalled();
    expect(res.body.isPinned).toBe(true);
  });

  it('toggleArchiveConversation toggles the archive map (happy path)', async () => {
    const conv = makeConv();
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await chat.toggleArchiveConversation(makeReq({ params: { conversationId: 'c1' } }), res);
    expect(conv.isArchived['user-1']).toBe(true);
    expect(res.body.isArchived).toBe(true);
  });

  it('getArchivedConversations returns only archived chats (happy path)', async () => {
    const archived = makeConv({ _id: 'c2', isArchived: { 'user-1': true } });
    const normal = makeConv({ _id: 'c1' });
    Conversation.find.mockReturnValue(populateChain([archived, normal]));
    const res = makeRes();
    await chat.getArchivedConversations(makeReq(), res);
    expect(res.body.conversations.map((c) => c._id)).toEqual(['c2']);
  });

  it('searchMessages validates params (400)', async () => {
    const res = makeRes();
    await chat.searchMessages(makeReq({ params: { conversationId: 'c1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('searchMessages searches within a conversation (happy path)', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    Message.find.mockReturnValue(msgFindChain([makeMessage()], { sortLimit: true }));
    const res = makeRes();
    await chat.searchMessages(makeReq({ params: { conversationId: 'c1' }, query: { query: 'hello' } }), res);
    expect(res.body.messages).toHaveLength(1);
    expect(Message.find).toHaveBeenCalledWith(expect.objectContaining({ content: expect.any(RegExp) }));
  });
});

describe('chatController — forward/clear/delete chat', () => {
  beforeEach(() => jest.clearAllMocks());

  it('forwardMessage validates target conversations (400)', async () => {
    const res = makeRes();
    await chat.forwardMessage(makeReq({ params: { messageId: 'm1' }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('forwardMessage limits the batch size (400)', async () => {
    const res = makeRes();
    await chat.forwardMessage(makeReq({
      params: { messageId: 'm1' },
      body: { targetConversationIds: ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'] }
    }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/chats 5/);
  });

  it('forwardMessage returns 404 for a missing message', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await chat.forwardMessage(makeReq({ params: { messageId: 'm1' }, body: { targetConversationIds: ['c2'] } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('forwardMessage restricts heavily-forwarded messages to one chat', async () => {
    Message.findById.mockResolvedValue(makeMessage({ forwardCount: 5 }));
    const res = makeRes();
    await chat.forwardMessage(makeReq({ params: { messageId: 'm1' }, body: { targetConversationIds: ['c1', 'c2'] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/mara nyingi/);
  });

  it('forwardMessage forwards to accessible chats (happy path)', async () => {
    const original = makeMessage({ content: 'fwd me', forwardCount: 1 });
    Message.findById.mockResolvedValueOnce(original);
    const target = makeConv({ _id: 'c2', participants: ['user-1', 'user-3'] });
    Conversation.findById
      .mockResolvedValueOnce(makeConv())
      .mockResolvedValueOnce(target);
    const fwd = makeMessage({ _id: 'm2' });
    Message.create.mockResolvedValue(fwd);
    Message.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(fwd) }) });
    const res = makeRes();
    await chat.forwardMessage(makeReq({ params: { messageId: 'm1' }, body: { targetConversationIds: ['c2'] } }), res);
    expect(Message.create.mock.calls[0][0]).toMatchObject({ isForwarded: true, originalMessageId: 'm1', forwardCount: 2 });
    expect(target.lastMessage).toBe('m2');
    expect(res.body.forwardedMessages).toHaveLength(1);
  });

  it('clearChat returns 404 for a missing conversation', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await chat.clearChat(makeReq({ params: { chatId: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('clearChat marks all messages deleted (happy path)', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    Message.updateMany.mockResolvedValue({});
    const res = makeRes();
    await chat.clearChat(makeReq({ params: { chatId: 'c1' } }), res);
    expect(Message.updateMany).toHaveBeenCalledWith({ conversationId: 'c1' }, { $addToSet: { deletedFor: 'user-1' } });
    expect(res.body.message).toBe('Chat cleared successfully');
  });

  it('deleteChat removes the user from a group (happy path)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true }));
    Conversation.findByIdAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await chat.deleteChat(makeReq({ params: { chatId: 'c1' } }), res);
    expect(Conversation.findByIdAndUpdate).toHaveBeenCalledWith('c1', { $pull: { participants: 'user-1', admins: 'user-1' } });
    expect(res.body.message).toBe('Chat deleted successfully');
  });

  it('deleteChat marks a DM deleted (happy path)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: false }));
    Message.updateMany.mockResolvedValue({});
    Conversation.findByIdAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await chat.deleteChat(makeReq({ params: { chatId: 'c1' } }), res);
    expect(Message.updateMany).toHaveBeenCalled();
    expect(Conversation.findByIdAndUpdate).toHaveBeenCalledWith('c1', { $addToSet: { deletedFor: 'user-1' } });
  });
});

describe('chatController — group admin/ban/join', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isConversationBlocked.mockResolvedValue(false);
  });

  it('joinGroup returns 404 for a missing group', async () => {
    Conversation.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await chat.joinGroup(makeReq({ params: { groupId: 'g1' }, body: { inviteCode: 'abc' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('joinGroup rejects banned users (403)', async () => {
    Conversation.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(makeConv({ isGroup: true, bannedMembers: [{ user: 'user-1' }] })) });
    const res = makeRes();
    await chat.joinGroup(makeReq({ params: { groupId: 'g1' }, body: { inviteCode: 'abc' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You have been banned from this group');
  });

  it('joinGroup returns the conversation for existing members', async () => {
    const group = makeConv({ isGroup: true, participants: ['user-1', 'user-2'], groupInviteCode: 'abc' });
    Conversation.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(group) });
    Conversation.findById.mockReturnValue(populateChain(group));
    const res = makeRes();
    await chat.joinGroup(makeReq({ params: { groupId: 'g1' }, body: { inviteCode: 'abc' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.alreadyMember).toBe(true);
  });

  it('joinGroup rejects an invalid invite code (403)', async () => {
    Conversation.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(makeConv({ isGroup: true, participants: ['user-2'], groupInviteCode: 'correct' })) });
    const res = makeRes();
    await chat.joinGroup(makeReq({ params: { groupId: 'g1' }, body: { inviteCode: 'wrong' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Invalid or expired invite link');
  });

  it('joinGroup adds the member with a valid code (happy path)', async () => {
    const group = makeConv({ isGroup: true, participants: ['user-2'], groupInviteCode: 'abc' });
    Conversation.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(group) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ username: 'alice' }) });
    Conversation.findById.mockReturnValue(populateChain(group));
    Message.create.mockResolvedValue(makeMessage());
    const res = makeRes();
    await chat.joinGroup(makeReq({ params: { groupId: 'g1' }, body: { inviteCode: 'abc' } }), res);
    expect(group.participants).toContain('user-1');
    expect(group.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Joined group successfully');
  });

  it('joinGroup queues a pending request when approval is required', async () => {
    const group = makeConv({ isGroup: true, participants: ['user-2'], groupInviteCode: 'abc', requireJoinApproval: true });
    Conversation.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(group) });
    const res = makeRes();
    await chat.joinGroup(makeReq({ params: { groupId: 'g1' }, body: { inviteCode: 'abc' } }), res);
    expect(group.pendingJoinRequests).toHaveLength(1);
    expect(res.statusCode).toBe(202);
    expect(res.body.pending).toBe(true);
  });

  it('banMember forbids non-admins (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'] }));
    const res = makeRes();
    await chat.banMember(makeReq({ params: { id: 'g1', userId: 'user-2' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('banMember forbids banning the owner (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, owner: 'user-2', participants: ['user-1', 'user-2'] }));
    const res = makeRes();
    await chat.banMember(makeReq({ params: { id: 'g1', userId: 'user-2' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Cannot ban the group owner');
  });

  it('banMember removes and bans the member (happy path)', async () => {
    const conv = makeConv({ isGroup: true, participants: ['user-1', 'user-2'] });
    Conversation.findById.mockResolvedValue(conv);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ username: 'bob' }) });
    Message.create.mockResolvedValue(makeMessage());
    const res = makeRes();
    await chat.banMember(makeReq({ params: { id: 'g1', userId: 'user-2' }, body: { reason: 'spam' } }), res);
    expect(conv.participants).toEqual(['user-1']);
    expect(conv.bannedMembers).toHaveLength(1);
    expect(conv.bannedMembers[0].reason).toBe('spam');
    expect(conv.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Member banned successfully');
  });

  it('unbanMember forbids non-admins (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'] }));
    const res = makeRes();
    await chat.unbanMember(makeReq({ params: { id: 'g1', userId: 'user-2' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('unbanMember removes the ban (happy path)', async () => {
    const conv = makeConv({ isGroup: true, bannedMembers: [{ user: 'user-2' }] });
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await chat.unbanMember(makeReq({ params: { id: 'g1', userId: 'user-2' } }), res);
    expect(conv.bannedMembers).toHaveLength(0);
    expect(conv.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Member unbanned');
  });

  it('getBannedMembers forbids non-admins (403)', async () => {
    Conversation.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'] })) })
    });
    const res = makeRes();
    await chat.getBannedMembers(makeReq({ params: { id: 'g1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('getBannedMembers lists banned members (happy path)', async () => {
    Conversation.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(makeConv({ isGroup: true, bannedMembers: [{ user: 'user-2' }] })) })
    });
    const res = makeRes();
    await chat.getBannedMembers(makeReq({ params: { id: 'g1' } }), res);
    expect(res.body.bannedMembers).toHaveLength(1);
  });

  it('transferOwnership forbids non-owners (403)', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, owner: 'user-9' }));
    const res = makeRes();
    await chat.transferOwnership(makeReq({ params: { id: 'g1' }, body: { newOwnerId: 'user-2' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('transferOwnership validates the new owner is a member', async () => {
    Conversation.findById.mockResolvedValue(makeConv({ isGroup: true, owner: 'user-1', participants: ['user-1'] }));
    const res = makeRes();
    await chat.transferOwnership(makeReq({ params: { id: 'g1' }, body: { newOwnerId: 'user-2' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('New owner must be a group member');
  });

  it('transferOwnership transfers the group (happy path)', async () => {
    const conv = makeConv({ isGroup: true, owner: 'user-1', createdBy: 'user-1', participants: ['user-1', 'user-2'] });
    Conversation.findById.mockResolvedValue(conv);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ username: 'bob' }) });
    Message.create.mockResolvedValue(makeMessage());
    const res = makeRes();
    await chat.transferOwnership(makeReq({ params: { id: 'g1' }, body: { newOwnerId: 'user-2' } }), res);
    expect(conv.owner).toBe('user-2');
    expect(conv.createdBy).toBe('user-2');
    expect(conv.admins).toContain('user-2');
    expect(conv.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Ownership transferred successfully');
  });
});

describe('chatController — group info/report', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getGroupInfo returns group details for an admin (happy path)', async () => {
    const group = makeConv({ isGroup: true, groupInviteCode: 'inv-1' });
    const selectChain = {
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(group) })
    };
    Conversation.findById
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue(selectChain) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(group) });
    const res = makeRes();
    await chat.getGroupInfo(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.body.groupInfo.isAdmin).toBe(true);
    expect(res.body.groupInfo.groupInviteCode).toBe('inv-1');
    expect(res.body.groupInfo.totalMembers).toBe(2);
  });

  it('getGroupInfo rejects non-group conversations (400)', async () => {
    const selectChain = {
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(makeConv({ isGroup: false })) })
    };
    Conversation.findById.mockReturnValueOnce({ select: jest.fn().mockReturnValue(selectChain) });
    const res = makeRes();
    await chat.getGroupInfo(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('regenerateGroupInvite forbids non-admins (403)', async () => {
    Conversation.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeConv({ isGroup: true, admins: ['user-9'] })) });
    const res = makeRes();
    await chat.regenerateGroupInvite(makeReq({ params: { groupId: 'g1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('regenerateGroupInvite issues a new code (happy path)', async () => {
    const group = makeConv({ isGroup: true, groupInviteCode: 'old' });
    Conversation.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(group) });
    const res = makeRes();
    await chat.regenerateGroupInvite(makeReq({ params: { groupId: 'g1' } }), res);
    expect(group.groupInviteCode).not.toBe('old');
    expect(group.save).toHaveBeenCalled();
    expect(res.body.groupInviteCode).toBe(group.groupInviteCode);
  });

  it('reportUser rejects reporting yourself (400)', async () => {
    const res = makeRes();
    await chat.reportUser(makeReq({ params: { id: 'user-1' }, body: { category: 'spam', description: 'x' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('reportUser rejects an invalid category (400)', async () => {
    const res = makeRes();
    await chat.reportUser(makeReq({ params: { id: 'user-2' }, body: { category: 'bogus', description: 'x' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('reportUser returns 404 for an unknown user', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await chat.reportUser(makeReq({ params: { id: 'user-2' }, body: { category: 'spam', description: 'desc' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('reportUser creates an abuse report (happy path)', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'user-2' }) });
    const report = { _id: 'r1', save: jest.fn().mockResolvedValue(undefined) };
    AbuseReport.mockImplementation(() => report);
    const res = makeRes();
    await chat.reportUser(makeReq({ params: { id: 'user-2' }, body: { category: 'csam', description: 'report' } }), res);
    expect(AbuseReport).toHaveBeenCalledWith(expect.objectContaining({ priority: 'urgent', category: 'csam' }));
    expect(report.save).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
  });
});

describe('chatController — socket io emission', () => {
  beforeEach(() => jest.clearAllMocks());

  it('markAsRead emits unread + read-receipt events when io is present', async () => {
    const emit = jest.fn();
    const message = makeMessage({ sender: 'user-2' });
    Message.findById.mockResolvedValue(message);
    const conv = makeConv();
    Conversation.findById
      .mockResolvedValueOnce(conv)
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue(conv) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ settings: { privacy: { readReceipts: true } } }) });
    Message.findOneAndUpdate.mockResolvedValue({});
    Conversation.findOneAndUpdate.mockResolvedValue({});
    const req = makeReq({ params: { id: 'm1' }, app: { get: jest.fn(() => ({ to: jest.fn(() => ({ emit })) })) } });
    const res = makeRes();
    await chat.markAsRead(req, res);
    expect(emit).toHaveBeenCalledWith('conversation:unread-update', expect.any(Object));
    expect(emit).toHaveBeenCalledWith('message:read_receipt', expect.any(Object));
  });
});

describe('chatController — view-once privacy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    containsProfanity.mockReturnValue(false);
    isConversationBlocked.mockResolvedValue(false);
  });

  const viewOnceMsg = (overrides = {}) =>
    makeMessage({
      isViewOnce: true,
      isConsumed: false,
      content: 'secret one-time text',
      caption: 'cap',
      mediaUrl: 'https://example.com/secret.png',
      fileName: 'secret.png',
      fileSize: 123,
      duration: 5,
      ...overrides
    });

  it('getMessages strips view-once content from the feed payload', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    Message.find.mockReturnValue(msgFindChain([viewOnceMsg()], { sortLimit: true, skip: true }));
    Message.countDocuments.mockResolvedValue(1);
    const res = makeRes();
    await chat.getMessages(makeReq({ params: { id: 'c1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.messages[0].content).toBe('View Once message');
    expect(res.body.messages[0].mediaUrl).toBe('');
    expect(res.body.messages[0].fileName).toBe('');
    expect(res.body.messages[0].isViewOnce).toBe(true);
  });

  it('getMessages keeps the placeholder for the sender too', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    Message.find.mockReturnValue(msgFindChain([viewOnceMsg({ sender: 'user-1' })], { sortLimit: true, skip: true }));
    Message.countDocuments.mockResolvedValue(1);
    const res = makeRes();
    await chat.getMessages(makeReq(), res);
    expect(res.body.messages[0].content).toBe('View Once message');
    expect(res.body.messages[0].mediaUrl).toBe('');
  });

  it('getMessages does not strip consumed view-once messages', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    const consumed = viewOnceMsg({ isConsumed: true, content: 'View Once message opened' });
    Message.find.mockReturnValue(msgFindChain([consumed], { sortLimit: true, skip: true }));
    Message.countDocuments.mockResolvedValue(1);
    const res = makeRes();
    await chat.getMessages(makeReq({ params: { id: 'c1' } }), res);
    expect(res.body.messages[0].content).toBe('View Once message opened');
  });

  it('getConversations strips view-once lastMessage preview', async () => {
    const conv = makeConv({ updatedAt: new Date('2025-06-01T00:00:00Z'), lastMessage: viewOnceMsg() });
    Conversation.find.mockReturnValue(populateChain([conv]));
    User.findById.mockReturnValue({ select: jest.fn(() => ({ lean: jest.fn().mockResolvedValue({ blockedUsers: [] }) })) });
    const res = makeRes();
    await chat.getConversations(makeReq(), res);
    expect(res.body.conversations[0].lastMessage.content).toBe('View Once message');
    expect(res.body.conversations[0].lastMessage.mediaUrl).toBe('');
  });

  it('getMediaGallery excludes unconsumed view-once media', async () => {
    Conversation.findById.mockResolvedValue(makeConv());
    const media = [
      viewOnceMsg({ messageType: 'image' }),
      makeMessage({ messageType: 'image', mediaUrl: 'https://x/y.png', content: '' })
    ];
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue(media) })
    });
    const res = makeRes();
    await chat.getMediaGallery(makeReq({ params: { conversationId: VALID_ID } }), res);
    expect(res.body.media).toHaveLength(1);
    expect(res.body.media[0]._id).toBe('m1');
  });

  it('getMessageInfo strips view-once content for a non-sender', async () => {
    const message = viewOnceMsg({ sender: 'user-2' });
    Message.findById.mockReturnValue(msgById3(message));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.getMessageInfo(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.body.messageInfo.content).toBe('View Once message');
    expect(res.body.messageInfo.mediaUrl).toBe('');
  });

  it('getMessageInfo keeps the real content for the sender', async () => {
    const message = viewOnceMsg({ sender: 'user-1' });
    Message.findById.mockReturnValue(msgById3(message));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.getMessageInfo(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.body.messageInfo.content).toBe('secret one-time text');
  });

  it('revealViewOnceMessage returns 404 for a missing message', async () => {
    Message.findById.mockResolvedValue(null);
    const res = makeRes();
    await chat.revealViewOnceMessage(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('revealViewOnceMessage forbids non-participants (403)', async () => {
    Message.findById.mockResolvedValue(viewOnceMsg());
    Conversation.findById.mockResolvedValue(makeConv({ participants: ['user-9'] }));
    const res = makeRes();
    await chat.revealViewOnceMessage(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('revealViewOnceMessage forbids the sender from revealing their own message (403)', async () => {
    Message.findById.mockResolvedValue(viewOnceMsg({ sender: 'user-1' }));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.revealViewOnceMessage(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('revealViewOnceMessage rejects non view-once messages (400)', async () => {
    Message.findById.mockResolvedValue(makeMessage({ sender: 'user-2' }));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.revealViewOnceMessage(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('revealViewOnceMessage rejects already-consumed messages (400)', async () => {
    Message.findById.mockResolvedValue(viewOnceMsg({ isConsumed: true }));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.revealViewOnceMessage(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('revealViewOnceMessage returns the real content once (happy path)', async () => {
    Message.findById.mockResolvedValue(viewOnceMsg({ sender: 'user-2', mediaUrl: 'https://example.com/secret.png' }));
    Conversation.findById.mockResolvedValue(makeConv());
    const res = makeRes();
    await chat.revealViewOnceMessage(makeReq({ params: { messageId: 'm1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.content).toBe('secret one-time text');
    expect(res.body.mediaUrl).toBe('https://example.com/secret.png');
  });
});
