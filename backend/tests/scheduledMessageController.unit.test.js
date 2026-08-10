jest.mock('../models/ScheduledMessage', () => {
  const mock = jest.fn();
  mock.find = jest.fn();
  mock.findById = jest.fn();
  mock.findByIdAndDelete = jest.fn();
  mock.create = jest.fn();
  return mock;
});

jest.mock('../models/Message', () => ({
  create: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn()
}));

const ScheduledMessage = require('../models/ScheduledMessage');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const scheduledMessage = require('../controllers/scheduledMessageController');

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
  app: { get: jest.fn(() => null) },
  ...overrides
});

const makeScheduled = (overrides = {}) => ({
  _id: 's1',
  sender: 'user-1',
  conversationId: { _id: 'c1' },
  content: 'hi',
  status: 'pending',
  sendAt: new Date(Date.now() + 3600000),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const FUTURE = new Date(Date.now() + 3600000).toISOString();

describe('scheduledMessageController — CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects without conversationId/content/sendAt (validation)', async () => {
    const res = makeRes();
    await scheduledMessage.createScheduledMessage(makeReq({ body: { conversationId: 'c1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('conversationId, content, and sendAt are required');
  });

  it('rejects a past sendAt (validation)', async () => {
    const res = makeRes();
    await scheduledMessage.createScheduledMessage(makeReq({ body: { conversationId: 'c1', content: 'hi', sendAt: '2020-01-01T00:00:00Z' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('sendAt must be a future date');
  });

  it('returns 404 for a missing conversation', async () => {
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await scheduledMessage.createScheduledMessage(makeReq({ body: { conversationId: 'c1', content: 'hi', sendAt: FUTURE } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects scheduling to a conversation the user is not in (403)', async () => {
    Conversation.findById.mockResolvedValue({ participants: ['user-9'] });
    const res = makeRes();
    await scheduledMessage.createScheduledMessage(makeReq({ body: { conversationId: 'c1', content: 'hi', sendAt: FUTURE } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You are not a participant in this conversation');
  });

  it('creates a scheduled message (happy path)', async () => {
    Conversation.findById.mockResolvedValue({ participants: ['user-1'] });
    ScheduledMessage.create.mockResolvedValue(makeScheduled());
    const res = makeRes();
    await scheduledMessage.createScheduledMessage(makeReq({ body: { conversationId: 'c1', content: 'hi', sendAt: FUTURE } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(ScheduledMessage.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
  });

  it('lists scheduled messages with filters (happy path)', async () => {
    ScheduledMessage.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([makeScheduled()])
    });
    const res = makeRes();
    await scheduledMessage.getScheduledMessages(makeReq({ query: { status: 'pending' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.scheduledMessages).toHaveLength(1);
  });

  it('returns 404 for a missing scheduled message', async () => {
    ScheduledMessage.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await scheduledMessage.getScheduledMessage(makeReq({ params: { id: 's1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects viewing another user\'s scheduled message (403)', async () => {
    ScheduledMessage.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(makeScheduled({ sender: 'user-9' })) });
    const res = makeRes();
    await scheduledMessage.getScheduledMessage(makeReq({ params: { id: 's1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('gets a single scheduled message (happy path)', async () => {
    ScheduledMessage.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(makeScheduled()) });
    const res = makeRes();
    await scheduledMessage.getScheduledMessage(makeReq({ params: { id: 's1' } }), res);
    expect(res.body.success).toBe(true);
  });

  it('rejects cancelling a non-pending message (400)', async () => {
    ScheduledMessage.findById.mockResolvedValue(makeScheduled({ status: 'sent' }));
    const res = makeRes();
    await scheduledMessage.cancelScheduledMessage(makeReq({ params: { id: 's1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Can only cancel pending messages');
  });

  it('cancels a scheduled message (happy path)', async () => {
    const scheduled = makeScheduled();
    ScheduledMessage.findById.mockResolvedValue(scheduled);
    const res = makeRes();
    await scheduledMessage.cancelScheduledMessage(makeReq({ params: { id: 's1' } }), res);
    expect(res.body.success).toBe(true);
    expect(scheduled.status).toBe('cancelled');
    expect(scheduled.save).toHaveBeenCalled();
  });

  it('deletes a scheduled message (happy path)', async () => {
    ScheduledMessage.findById.mockResolvedValue(makeScheduled());
    ScheduledMessage.findByIdAndDelete.mockResolvedValue({});
    const res = makeRes();
    await scheduledMessage.deleteScheduledMessage(makeReq({ params: { id: 's1' } }), res);
    expect(res.body.success).toBe(true);
    expect(ScheduledMessage.findByIdAndDelete).toHaveBeenCalledWith('s1');
  });
});

describe('scheduledMessageController — process', () => {
  beforeEach(() => jest.clearAllMocks());

  it('processes due messages and reports counts (happy path)', async () => {
    const due = makeScheduled({ conversationId: { _id: 'c1' } });
    ScheduledMessage.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([due]) });
    Message.create.mockResolvedValue({ _id: 'm1' });
    const res = makeRes();
    await scheduledMessage.processScheduledMessages(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.processedCount).toBe(1);
    expect(res.body.failedCount).toBe(0);
    expect(due.status).toBe('sent');
    expect(due.save).toHaveBeenCalled();
    expect(Message.create).toHaveBeenCalled();
  });

  it('marks a failed send and retries (happy path)', async () => {
    const due = makeScheduled({ retryCount: 0, maxRetries: 3 });
    ScheduledMessage.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([due]) });
    Message.create.mockRejectedValue(new Error('send failed'));
    const res = makeRes();
    await scheduledMessage.processScheduledMessages(makeReq(), res);
    expect(res.body.processedCount).toBe(0);
    expect(res.body.failedCount).toBe(1);
    expect(due.status).toBe('pending'); // retry later
    expect(due.retryCount).toBe(1);
  });
});
