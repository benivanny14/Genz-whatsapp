jest.mock('../models/SupportTicket', () => {
  const mock = jest.fn();
  mock.countDocuments = jest.fn();
  mock.find = jest.fn();
  mock.findById = jest.fn();
  mock.findOne = jest.fn();
  mock.findByIdAndUpdate = jest.fn();
  return mock;
});

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../utils/auditLogger', () => ({
  logAdminAction: jest.fn()
}));

const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { logAdminAction } = require('../utils/auditLogger');
const adminSupport = require('../controllers/adminSupportController');

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
  lean: jest.fn().mockResolvedValue(value)
});

const makeTicket = (overrides = {}) => ({
  _id: 't1',
  userId: 'user-1',
  status: 'open',
  category: 'general',
  conversation: [],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('adminSupportController — tickets', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists tickets with pagination (happy path)', async () => {
    SupportTicket.countDocuments.mockResolvedValue(30);
    SupportTicket.find.mockReturnValue(makeChainableFind([{ _id: 't1' }]));
    const res = makeRes();
    await adminSupport.listTickets(makeReq({ query: { page: '1', limit: '10' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.tickets).toHaveLength(1);
    expect(res.body.pagination.pages).toBe(3);
  });

  it('returns 404 for a missing ticket', async () => {
    SupportTicket.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
    const res = makeRes();
    await adminSupport.getTicket(makeReq({ params: { id: 't1' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Ticket not found');
  });

  it('gets a ticket (happy path)', async () => {
    SupportTicket.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 't1' }) }) });
    const res = makeRes();
    await adminSupport.getTicket(makeReq({ params: { id: 't1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket._id).toBe('t1');
  });

  it('rejects an empty reply (validation)', async () => {
    const res = makeRes();
    await adminSupport.replyToTicket(makeReq({ params: { id: 't1' }, body: { message: '   ' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Message is required');
  });

  it('replies to a ticket and notifies the user (happy path)', async () => {
    const ticket = makeTicket();
    SupportTicket.findById.mockResolvedValue(ticket);
    const res = makeRes();
    await adminSupport.replyToTicket(makeReq({ params: { id: 't1' }, body: { message: 'Welcome!' } }), res);
    expect(res.body.success).toBe(true);
    expect(ticket.conversation).toHaveLength(1);
    expect(ticket.conversation[0].sender).toBe('admin');
    expect(ticket.save).toHaveBeenCalled();
    expect(logAdminAction).toHaveBeenCalled();
  });

  it('rejects an invalid ticket status (validation)', async () => {
    const res = makeRes();
    await adminSupport.updateTicketStatus(makeReq({ params: { id: 't1' }, body: { status: 'nuked' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid status');
  });

  it('updates a ticket status (happy path)', async () => {
    SupportTicket.findByIdAndUpdate.mockResolvedValue(makeTicket({ status: 'resolved' }));
    const res = makeRes();
    await adminSupport.updateTicketStatus(makeReq({ params: { id: 't1' }, body: { status: 'resolved' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.ticket.status).toBe('resolved');
    expect(logAdminAction).toHaveBeenCalled();
  });
});

describe('adminSupportController — direct chats', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists direct chats (happy path)', async () => {
    SupportTicket.find.mockReturnValue(makeChainableFind([{ _id: 't1', category: 'direct_message' }]));
    const res = makeRes();
    await adminSupport.listDirectChats(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.chats).toHaveLength(1);
  });

  it('rejects starting a chat without userId/message (validation)', async () => {
    const res = makeRes();
    await adminSupport.startDirectChat(makeReq({ body: { userId: 'user-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('userId and message are required');
  });

  it('returns 404 when the target user does not exist', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await adminSupport.startDirectChat(makeReq({ body: { userId: 'user-1', message: 'Hi' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('starts a direct chat (happy path)', async () => {
    User.findById.mockResolvedValue({ _id: 'user-1' });
    SupportTicket.findOne.mockResolvedValue(null);
    SupportTicket.mockImplementation(() => makeTicket());
    const res = makeRes();
    await adminSupport.startDirectChat(makeReq({ body: { userId: 'user-1', message: 'Hi' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.chat.conversation).toHaveLength(1);
    expect(res.body.chat.status).toBe('open');
  });

  it('reuses an existing direct chat instead of creating a new one', async () => {
    User.findById.mockResolvedValue({ _id: 'user-1' });
    const existing = makeTicket({ category: 'direct_message', conversation: [] });
    SupportTicket.findOne.mockResolvedValue(existing);
    const res = makeRes();
    await adminSupport.startDirectChat(makeReq({ body: { userId: 'user-1', message: 'Hi' } }), res);
    expect(res.body.chat._id).toBe('t1');
    expect(existing.conversation).toHaveLength(1);
    expect(existing.save).toHaveBeenCalled();
  });
});
