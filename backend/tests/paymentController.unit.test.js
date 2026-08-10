jest.mock('../models/PaymentRequest', () => {
  const MockPaymentRequest = jest.fn().mockImplementation((data = {}) => ({
    ...data,
    _id: 'pr-123',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    status: 'pending',
    amount: data.amount,
    currency: data.currency,
    requesterId: data.requesterId,
    recipientId: data.recipientId,
    save: jest.fn().mockResolvedValue(undefined)
  }));
  MockPaymentRequest.findById = jest.fn();
  MockPaymentRequest.find = jest.fn();
  MockPaymentRequest.countDocuments = jest.fn();
  return MockPaymentRequest;
});

// PaymentRequest.findById() and User.findById() are used with query chains
// (.populate() / .select()). Provide a helper that resolves through the chain.
const chainResolve = (value) => ({
  populate: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  lean: jest.fn().mockReturnThis(),
  then: jest.fn((resolve) => resolve(value))
});

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({}));

jest.mock('../utils/logger', () => ({
  error: jest.fn()
}));

const mongoose = require('mongoose');
const PaymentRequest = require('../models/PaymentRequest');
const User = require('../models/User');
const {
  createPaymentRequest,
  getPaymentRequests,
  getPaymentRequest,
  payRequest,
  cancelRequest,
  getPaymentBalance
} = require('../controllers/paymentController');

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
  user: { _id: 'user-requester', id: 'user-requester', username: 'alice', phoneNumber: '255700000001' },
  app: { get: jest.fn(() => ({ to: jest.fn(() => ({ emit: jest.fn() })) })) },
  ...overrides
});

const validObjectId = () => new mongoose.Types.ObjectId().toString();

describe('paymentController — createPaymentRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a non-ObjectId recipient with 400 (validation)', async () => {
    const req = makeReq({ body: { recipientId: 'not-an-id', amount: 5000 } });
    const res = makeRes();

    await createPaymentRequest(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid recipient');
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('rejects amount below 1 with 400 (validation)', async () => {
    const req = makeReq({ body: { recipientId: validObjectId(), amount: 0 } });
    const res = makeRes();

    await createPaymentRequest(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Amount must be at least 1');
  });

  it('returns 404 when recipient does not exist', async () => {
    User.findById.mockReturnValue(chainResolve(null));
    const req = makeReq({ body: { recipientId: validObjectId(), amount: 5000 } });
    const res = makeRes();

    await createPaymentRequest(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Recipient not found');
  });

  it('creates a payment request and notifies the recipient (happy path)', async () => {
    const recipientId = validObjectId();
    User.findById.mockReturnValue(chainResolve({ _id: recipientId, username: 'bob', phoneNumber: '255700000002' }));
    const req = makeReq({ body: { recipientId, amount: 5000, note: 'lunch' } });
    const res = makeRes();

    await createPaymentRequest(req, res);

    expect(PaymentRequest).toHaveBeenCalledWith(expect.objectContaining({
      requesterId: 'user-requester',
      recipientId,
      amount: 5000,
      requesterName: 'alice',
      recipientName: 'bob'
    }));
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('paymentController — getPaymentRequests / getPaymentRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists payment requests for the current user (happy path)', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([{ _id: 'pr-1', amount: 100 }])
    };
    PaymentRequest.find.mockReturnValue(chain);
    const req = makeReq({ query: { status: 'pending' } });
    const res = makeRes();

    await getPaymentRequests(req, res);

    expect(PaymentRequest.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
    expect(res.body.success).toBe(true);
    expect(res.body.requests).toHaveLength(1);
  });

  it('rejects an invalid request id with 400 (validation)', async () => {
    const req = makeReq({ params: { id: 'garbage' } });
    const res = makeRes();

    await getPaymentRequest(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid payment request ID');
  });

  it('returns 404 for a missing request', async () => {
    PaymentRequest.findById.mockReturnValue(chainResolve(null));
    const req = makeReq({ params: { id: validObjectId() } });
    const res = makeRes();

    await getPaymentRequest(req, res);

    expect(res.statusCode).toBe(404);
  });

  it('denies access to a request the user is not party to (403 authz)', async () => {
    PaymentRequest.findById.mockReturnValue(chainResolve({
      requesterId: { _id: 'someone-else' },
      recipientId: { _id: 'another-person' }
    }));
    const req = makeReq({ params: { id: validObjectId() } });
    const res = makeRes();

    await getPaymentRequest(req, res);

    expect(res.statusCode).toBe(403);
  });
});

describe('paymentController — payRequest / cancelRequest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('only allows the recipient to pay (403 authz)', async () => {
    PaymentRequest.findById.mockResolvedValue({ recipientId: 'other-user', status: 'pending', save: jest.fn() });
    const req = makeReq({ params: { id: validObjectId() } });
    const res = makeRes();

    await payRequest(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('rejects paying a non-pending request (validation)', async () => {
    PaymentRequest.findById.mockResolvedValue({ recipientId: 'user-requester', status: 'paid', save: jest.fn() });
    const req = makeReq({ params: { id: validObjectId() } });
    const res = makeRes();

    await payRequest(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/Payment request is paid/);
  });

  it('marks the request as paid and notifies the requester (happy path)', async () => {
    const request = {
      recipientId: 'user-requester',
      requesterId: 'requester-id',
      amount: 5000,
      currency: 'TZS',
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined)
    };
    PaymentRequest.findById.mockResolvedValue(request);
    const req = makeReq({ params: { id: validObjectId() } });
    const res = makeRes();

    await payRequest(req, res);

    expect(request.status).toBe('paid');
    expect(request.save).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('only allows the requester to cancel (403 authz)', async () => {
    PaymentRequest.findById.mockResolvedValue({ requesterId: 'other-user', status: 'pending', save: jest.fn() });
    const req = makeReq({ params: { id: validObjectId() } });
    const res = makeRes();

    await cancelRequest(req, res);

    expect(res.statusCode).toBe(403);
  });

  it('cancels a pending request (happy path)', async () => {
    const request = {
      requesterId: 'user-requester',
      recipientId: 'recipient-id',
      amount: 5000,
      currency: 'TZS',
      status: 'pending',
      save: jest.fn().mockResolvedValue(undefined)
    };
    PaymentRequest.findById.mockResolvedValue(request);
    const req = makeReq({ params: { id: validObjectId() } });
    const res = makeRes();

    await cancelRequest(req, res);

    expect(request.status).toBe('cancelled');
    expect(res.body.success).toBe(true);
  });
});

describe('paymentController — getPaymentBalance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns paid sent/received counts (happy path)', async () => {
    PaymentRequest.countDocuments
      .mockResolvedValueOnce(3)  // sent
      .mockResolvedValueOnce(7); // received
    const req = makeReq();
    const res = makeRes();

    await getPaymentBalance(req, res);

    expect(res.body.success).toBe(true);
    expect(res.body.stats).toEqual({ sent: 3, received: 7 });
  });
});
