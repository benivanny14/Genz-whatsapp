jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Message', () => ({
  create: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const messageTools = require('../controllers/messageToolsController');

const VALID_CONV_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';

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

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  phoneNumber: '255700000001',
  messageModsSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeConversation = (overrides = {}) => ({
  _id: VALID_CONV_ID,
  isGroup: true,
  participants: ['user-1', 'user-2'],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('messageToolsController — message MODs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await messageTools.getMessageModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication required');
  });

  it('returns merged MODs settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ messageModsSettings: { sendAnyFileType: true } }));
    const res = makeRes();
    await messageTools.getMessageModsSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.sendAnyFileType).toBe(true);
    expect(res.body.settings.blankMessages).toBe(false); // default
  });

  it('updates MODs settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await messageTools.updateMessageModsSettings(makeReq({ body: { settings: { editSentMessages: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(user.markModified).toHaveBeenCalledWith('messageModsSettings');
    expect(res.body.settings.editSentMessages).toBe(true);
  });

  it('toggles a MOD (happy path)', async () => {
    const user = makeUser({ messageModsSettings: { sendAnyFileType: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await messageTools.toggleSendAnyFile(makeReq(), res);
    expect(res.body.sendAnyFileType).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('toggles a different MOD independently', async () => {
    const user = makeUser({ messageModsSettings: { messageEncryptionToggle: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await messageTools.toggleEncryption(makeReq(), res);
    expect(res.body.messageEncryptionToggle).toBe(false);
  });
});

describe('messageToolsController — send blank message', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects sending when the blank-messages mod is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await messageTools.sendBlankMessage(makeReq({ body: { conversationId: VALID_CONV_ID } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Blank messages mod is not enabled');
  });

  it('rejects an invalid conversationId (validation)', async () => {
    User.findById.mockResolvedValue(makeUser({ messageModsSettings: { blankMessages: true } }));
    const res = makeRes();
    await messageTools.sendBlankMessage(makeReq({ body: { conversationId: 'not-an-id' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('A valid conversationId is required');
  });

  it('rejects a missing conversation (404)', async () => {
    User.findById.mockResolvedValue(makeUser({ messageModsSettings: { blankMessages: true } }));
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await messageTools.sendBlankMessage(makeReq({ body: { conversationId: VALID_CONV_ID } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Conversation not found');
  });

  it('rejects sending to a conversation the user is not part of (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ messageModsSettings: { blankMessages: true } }));
    Conversation.findById.mockResolvedValue(makeConversation({ participants: ['user-9'] }));
    const res = makeRes();
    await messageTools.sendBlankMessage(makeReq({ body: { conversationId: VALID_CONV_ID } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Not a participant of this conversation');
  });

  it('sends a blank message (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ messageModsSettings: { blankMessages: true } }));
    Conversation.findById.mockResolvedValue(makeConversation());
    Message.create.mockResolvedValue({ _id: 'msg-1', content: '\u200B', messageType: 'text' });
    const res = makeRes();
    await messageTools.sendBlankMessage(makeReq({ body: { conversationId: VALID_CONV_ID } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({ messageType: 'text' }));
  });
});

