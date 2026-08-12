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
const textRepeater = require('../controllers/automationToolsController');

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
  textRepeaterSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeConversation = (overrides = {}) => ({
  _id: 'conv-1',
  participants: ['user-1', 'user-2'],
  ...overrides
});

describe('textRepeaterController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await textRepeater.getTextRepeaterSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ textRepeaterSettings: { maxRepeatCount: 50 } }));
    const res = makeRes();
    await textRepeater.getTextRepeaterSettings(makeReq(), res);
    expect(res.body.settings.maxRepeatCount).toBe(50);
    expect(res.body.settings.defaultRepeatCount).toBe(10); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await textRepeater.updateTextRepeaterSettings(makeReq({ body: { settings: { addDelay: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.addDelay).toBe(true);
  });

  it('toggles the repeater (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await textRepeater.toggleTextRepeater(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.textRepeaterEnabled).toBe(false);
  });

  it('updates max repeat count (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await textRepeater.updateMaxRepeatCount(makeReq({ body: { maxCount: 200 } }), res);
    expect(res.body.settings.maxRepeatCount).toBe(200);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ textRepeaterSettings: { maxRepeatCount: 5 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await textRepeater.resetTextRepeaterSettings(makeReq(), res);
    expect(res.body.settings.maxRepeatCount).toBe(100); // default
  });
});

describe('textRepeaterController — repeat', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects repeat without text (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await textRepeater.repeatText(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Text is required');
  });

  it('rejects when the repeater is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ textRepeaterSettings: { textRepeaterEnabled: false } }));
    const res = makeRes();
    await textRepeater.repeatText(makeReq({ body: { text: 'hi' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('rejects a count above the max (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await textRepeater.repeatText(makeReq({ body: { text: 'hi', count: 500 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Maximum repeat count is 100');
  });

  it('blocks spam above the threshold (validation)', async () => {
    User.findById.mockResolvedValue(makeUser({ textRepeaterSettings: { spamThreshold: 10 } }));
    const res = makeRes();
    await textRepeater.repeatText(makeReq({ body: { text: 'hi', count: 20 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Spam protection: Maximum 10 repeats allowed');
  });

  it('returns a preview without sending (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await textRepeater.repeatText(makeReq({ body: { text: 'ha', count: 3, separator: '-' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.previewOnly).toBe(true);
    expect(res.body.repeatedText).toBe('ha-haha');
    expect(res.body.count).toBe(3);
  });

  it('sends the repeated text (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation());
    Message.create.mockResolvedValue({ _id: 'msg-1' });
    const res = makeRes();
    await textRepeater.repeatText(makeReq({ body: { conversationId: 'conv-1', text: 'go', count: 2, send: true } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.sent).toBe(true);
    expect(res.body.messageId).toBe('msg-1');
    expect(Message.create).toHaveBeenCalledWith(expect.objectContaining({ repeatedText: true }));
  });

  it('rejects repeatTextDelayed without text/conversation (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await textRepeater.repeatTextDelayed(makeReq({ body: { text: 'hi' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Text and conversation ID are required');
  });

  it('sends repeated messages with delay (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation());
    Message.create.mockResolvedValue({ _id: 'msg-1' });
    const res = makeRes();
    await textRepeater.repeatTextDelayed(makeReq({ body: { conversationId: 'conv-1', text: 'hi', count: 3, delay: 0 } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.sent).toBe(3);
    expect(res.body.failed).toBe(0);
    expect(Message.create).toHaveBeenCalledTimes(3);
  });
});
