jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/Message', () => ({
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const bulkSender = require('../controllers/bulkSenderController');

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
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  bulkSenderSettings: {},
  scheduledBulkMessages: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeChainableFind = (value) => ({
  populate: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockResolvedValue(value)
});

describe('bulkSenderController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await bulkSender.getBulkSenderSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ bulkSenderSettings: { trackDelivery: false } }));
    const res = makeRes();
    await bulkSender.getBulkSenderSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.trackDelivery).toBe(false);
    expect(res.body.settings.maxRecipientsPerBatch).toBe(100); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await bulkSender.updateBulkSenderSettings(makeReq({ body: { settings: { maxRecipientsPerBatch: 200 } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.maxRecipientsPerBatch).toBe(200);
  });

  it('toggles bulk sending (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await bulkSender.toggleBulkSending(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.bulkSendingEnabled).toBe(false);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ bulkSenderSettings: { maxRecipientsPerBatch: 5 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await bulkSender.resetBulkSenderSettings(makeReq(), res);
    expect(res.body.settings.maxRecipientsPerBatch).toBe(100); // default
  });
});

describe('bulkSenderController — send bulk message', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an empty recipients list (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await bulkSender.sendBulkMessage(makeReq({ body: { recipients: [], content: 'hi' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Recipients are required');
  });

  it('rejects missing content and media (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await bulkSender.sendBulkMessage(makeReq({ body: { recipients: ['user-2'] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Content or media URL is required');
  });

  it('rejects when bulk sending is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ bulkSenderSettings: { bulkSendingEnabled: false } }));
    const res = makeRes();
    await bulkSender.sendBulkMessage(makeReq({ body: { recipients: ['user-2'], content: 'hi' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Bulk sending is disabled');
  });

  it('rejects a batch larger than the configured limit (validation)', async () => {
    User.findById.mockResolvedValue(makeUser({ bulkSenderSettings: { maxRecipientsPerBatch: 1 } }));
    const res = makeRes();
    await bulkSender.sendBulkMessage(makeReq({ body: { recipients: ['user-2', 'user-3'], content: 'hi' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Maximum 1 recipients allowed per batch');
  });

  it('schedules the bulk message when scheduleTime is provided (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await bulkSender.sendBulkMessage(makeReq({ body: { recipients: ['user-2'], content: 'hi', scheduleTime: '2026-09-01T10:00:00Z' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.scheduledMessageId).toBeDefined();
    expect(user.scheduledBulkMessages).toHaveLength(1);
    expect(user.scheduledBulkMessages[0].status).toBe('scheduled');
    expect(user.save).toHaveBeenCalled();
  });

  it('sends to each recipient immediately (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findOne.mockResolvedValue({ _id: 'conv-1' });
    Message.create.mockResolvedValue({ _id: 'msg-1' });
    const res = makeRes();
    await bulkSender.sendBulkMessage(makeReq({ body: { recipients: ['user-2', 'user-3'], content: 'hi', delay: 0 } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.sent).toBe(2);
    expect(res.body.failed).toBe(0);
    expect(Message.create).toHaveBeenCalledTimes(2);
  });

  it('reports recipients without an existing conversation as failed', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findOne.mockResolvedValue(null);
    const res = makeRes();
    await bulkSender.sendBulkMessage(makeReq({ body: { recipients: ['user-2'], content: 'hi', delay: 0 } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.sent).toBe(0);
    expect(res.body.failed).toBe(1);
    expect(res.body.errors[0].error).toBe('Conversation not found');
  });
});

describe('bulkSenderController — scheduled & history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns scheduled messages (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ scheduledBulkMessages: [{ _id: 's1' }] }));
    const res = makeRes();
    await bulkSender.getScheduledBulkMessages(makeReq(), res);
    expect(res.body.scheduled).toHaveLength(1);
  });

  it('returns 404 when cancelling a missing scheduled message', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await bulkSender.cancelScheduledBulkMessage(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('cancels a scheduled message (happy path)', async () => {
    const user = makeUser({ scheduledBulkMessages: [{ _id: 's1' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await bulkSender.cancelScheduledBulkMessage(makeReq({ params: { id: 's1' } }), res);
    expect(res.body.success).toBe(true);
    expect(user.scheduledBulkMessages).toHaveLength(0);
    expect(user.save).toHaveBeenCalled();
  });

  it('returns bulk message history (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.find.mockReturnValue(makeChainableFind([{ _id: 'm1' }]));
    Message.countDocuments.mockResolvedValue(1);
    const res = makeRes();
    await bulkSender.getBulkMessageHistory(makeReq({ query: { limit: '20', offset: '0' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it('returns delivery status for a batch (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Message.find.mockResolvedValue([
      { status: 'delivered' },
      { status: 'delivered' },
      { status: 'failed' },
      { status: 'sent' }
    ]);
    const res = makeRes();
    await bulkSender.getBulkMessageDeliveryStatus(makeReq({ params: { batchId: 'batch-1' } }), res);
    expect(res.body.total).toBe(4);
    expect(res.body.delivered).toBe(2);
    expect(res.body.failed).toBe(1);
    expect(res.body.pending).toBe(1);
  });
});
