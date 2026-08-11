/**
 * Anti-revoke regression: the full delete-for-everyone cycle.
 *
 * SECURITY (1.6) scrubs message.content to '[deleted]' at delete time, but
 * the pre-delete text must survive in originalContent so the GENZ Mod
 * deleted-messages viewer (GET /genz-mods/deleted-messages) can list it and
 * the restore endpoint (POST /genz-mods/restore-message/:id) can bring it
 * back. This walks the whole cycle against the real controllers (mocked DB):
 *   1. chatController.deleteMessage(forEveryone) → scrubbed + originalContent kept
 *   2. genzModsController.getDeletedMessages      → returns the original text
 *   3. genzModsController.restoreDeletedMessage   → content restored
 * Plus the hard-delete retention rule: when the deleter has the anti-revoke
 * mod on, the 30-day purge is skipped so the viewer keeps working.
 */
jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  updateOne: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn(),
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
  updateOne: jest.fn(),
  countDocuments: jest.fn(),
  deleteOne: jest.fn()
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

const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const chat = require('../controllers/chatController');
const genzMods = require('../controllers/genzModsController');
const { antiRevokeRetainsMessage, hardDeleteDelayFor } = require('../utils/hardDelete');

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

const makeDeletedMessage = (overrides = {}) => ({
  _id: 'm1',
  conversationId: 'c1',
  sender: 'user-2',
  content: '[deleted]',
  originalContent: 'Secret text',
  messageType: 'text',
  deletedForEveryone: true,
  wasDeletedBySender: false,
  deletedByAdmin: true,
  deletedAt: new Date(),
  status: 'delivered',
  readBy: [],
  reactions: [],
  save: jest.fn().mockResolvedValue(),
  ...overrides
});

describe('anti-revoke cycle: delete → view → restore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deleteMessage scrubs content but preserves originalContent', async () => {
    const message = makeDeletedMessage({
      content: 'Secret text',
      originalContent: '',
      deletedForEveryone: false,
      deletedAt: null
    });
    Message.findById.mockResolvedValue(message);
    Conversation.findById.mockResolvedValue({
      participants: ['user-1', 'user-2'],
      isGroup: true,
      admins: ['user-1'],
      createdBy: 'user-1'
    });

    const res = makeRes();
    await chat.deleteMessage(makeReq({ params: { id: 'm1' }, body: { forEveryone: true } }), res);

    expect(res.statusCode).toBe(200);
    expect(message.deletedForEveryone).toBe(true);
    expect(message.content).toBe('[deleted]');
    expect(message.originalContent).toBe('Secret text');
  });

  it('getDeletedMessages surfaces the preserved original text, not the placeholder', async () => {
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([makeDeletedMessage()])
    });

    const res = makeRes();
    await genzMods.getDeletedMessages(makeReq(), res);

    expect(res.statusCode).toBe(200);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.messages[0].content).toBe('Secret text');
    expect(res.body.messages[0].id).toBe('m1');
  });

  it('restoreDeletedMessage brings the original content back', async () => {
    const message = makeDeletedMessage();
    Message.findById.mockResolvedValue(message);
    Conversation.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ participants: ['user-1', 'user-2'] })
    });

    const res = makeRes();
    await genzMods.restoreDeletedMessage(makeReq({ params: { id: 'm1' } }), res);

    expect(res.statusCode).toBe(200);
    expect(message.content).toBe('Secret text');
    expect(message.deletedForEveryone).toBe(false);
    expect(message.deletedAt).toBeNull();
    expect(message.save).toHaveBeenCalled();
  });

  it('restore returns 404 when the message no longer exists', async () => {
    Message.findById.mockResolvedValue(null);

    const res = makeRes();
    await genzMods.restoreDeletedMessage(makeReq({ params: { id: 'gone' } }), res);

    expect(res.statusCode).toBe(404);
  });
});

describe('hard-delete retention rule (anti-revoke)', () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * DAY_MS;

  it('retains the doc when the mod is enabled and caching', () => {
    expect(antiRevokeRetainsMessage({ antiRevokeEnabled: true, cacheDeletedMessages: true })).toBe(true);
  });

  it('purges after cacheRetentionDays when the mod is on', () => {
    expect(hardDeleteDelayFor({ antiRevokeEnabled: true, cacheDeletedMessages: true, cacheRetentionDays: 3 })).toBe(3 * DAY_MS);
    expect(hardDeleteDelayFor({ antiRevokeEnabled: true, cacheDeletedMessages: true, cacheRetentionDays: 14 })).toBe(14 * DAY_MS);
  });

  it('defaults to 7 days when the mod is on but retention is unset/invalid', () => {
    expect(hardDeleteDelayFor({ antiRevokeEnabled: true, cacheDeletedMessages: true })).toBe(7 * DAY_MS);
    expect(hardDeleteDelayFor({ antiRevokeEnabled: true, cacheDeletedMessages: true, cacheRetentionDays: 0 })).toBe(7 * DAY_MS);
    expect(hardDeleteDelayFor({ antiRevokeEnabled: true, cacheDeletedMessages: true, cacheRetentionDays: -5 })).toBe(7 * DAY_MS);
  });

  it('purges at 30 days when the mod is off or caching is disabled', () => {
    expect(hardDeleteDelayFor({ antiRevokeEnabled: false, cacheDeletedMessages: true })).toBe(THIRTY_DAYS_MS);
    expect(hardDeleteDelayFor({ antiRevokeEnabled: true, cacheDeletedMessages: false })).toBe(THIRTY_DAYS_MS);
    expect(hardDeleteDelayFor(undefined)).toBe(THIRTY_DAYS_MS);
    expect(hardDeleteDelayFor({})).toBe(THIRTY_DAYS_MS);
  });
});
