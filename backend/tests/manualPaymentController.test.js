jest.mock('../models/ManualPayment', () => {
  const Mock = jest.fn();
  Mock.findOne = jest.fn();
  Mock.findOneAndUpdate = jest.fn();
  Mock.updateOne = jest.fn();
  Mock.find = jest.fn();
  Mock.findById = jest.fn();
  Mock.countDocuments = jest.fn();
  Mock.aggregate = jest.fn();
  return Mock;
});

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  countDocuments: jest.fn()
}));

jest.mock('../utils/mobileMoneySmsParser', () => ({
  parsePaymentSms: jest.fn(),
  isValidTransactionId: jest.fn()
}));

const ManualPayment = require('../models/ManualPayment');
const User = require('../models/User');
const { parsePaymentSms, isValidTransactionId } = require('../utils/mobileMoneySmsParser');

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

// submitPayment chains .sort({ createdAt: 1 }) on ManualPayment.findOne.
const mockFindOneSorted = (value) => ({
  sort: jest.fn().mockResolvedValue(value)
});

// User.findById(...).select(...) chains used in detail views.
const mockFindByIdSelected = (value) => ({
  select: jest.fn().mockResolvedValue(value)
});

// ManualPayment.find(...).sort(...) chains used in history queries.
const mockFindSorted = (value) => ({
  sort: jest.fn().mockResolvedValue(value)
});

const makePayment = (overrides = {}) => ({
  _id: 'pay-1',
  userId: 'user-1',
  username: 'alice',
  registeredPhone: '255700000001',
  paymentSMS: 'sms',
  transactionId: 'TXN123',
  amount: 10000,
  status: 'Pending',
  subscriptionDays: 30,
  duplicateOfPaymentId: null,
  conversation: [],
  approvalHistory: [],
  submittedAt: new Date(),
  toObject: () => ({ _id: 'pay-1', amount: 10000, status: 'Pending' }),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('manual payment — public info', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.MANUAL_PAYMENT_RECEIVER_NAME;
    delete process.env.MANUAL_PAYMENT_RECEIVER_NUMBER;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('uses the latest receiver details from the environment for the payment info response', async () => {
    process.env.MANUAL_PAYMENT_RECEIVER_NAME = 'Old Receiver';
    process.env.MANUAL_PAYMENT_RECEIVER_NUMBER = '0711111111';

    const controller = require('../controllers/manualPaymentController');

    process.env.MANUAL_PAYMENT_RECEIVER_NAME = 'New Receiver';
    process.env.MANUAL_PAYMENT_RECEIVER_NUMBER = '0712345678';

    const res = { json: jest.fn() };
    await controller.getPaymentInfo({}, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      receiverName: 'New Receiver',
      receiverNumber: '0712345678'
    }));
  });

  it('falls back to default receiver details (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const res = { json: jest.fn() };
    await controller.getPaymentInfo({}, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      plan: { name: 'Premium', days: 30, amount: 10000 }
    }));
  });
});

describe('manual payment — subscription status & SMS preview', () => {
  beforeEach(() => jest.resetAllMocks());

  it('reports an active subscription (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ premium: true, subscriptionExpiresAt: future }) });
    const res = makeRes();
    await controller.getSubscriptionStatus(makeReq(), res);
    expect(res.body.isActive).toBe(true);
    expect(res.body.remainingDays).toBeGreaterThan(0);
  });

  it('reports an expired subscription (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ premium: true, subscriptionExpiresAt: past }) });
    const res = makeRes();
    await controller.getSubscriptionStatus(makeReq(), res);
    expect(res.body.isActive).toBe(false);
    expect(res.body.remainingDays).toBe(0);
  });

  it('handles a missing user gracefully (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await controller.getSubscriptionStatus(makeReq(), res);
    expect(res.body.hasSubscription).toBe(false);
  });

  it('rejects a preview without SMS text (validation)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const res = makeRes();
    await controller.previewSms(makeReq({ body: { sms: '   ' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('previews parsed SMS data (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    parsePaymentSms.mockReturnValue({ transactionId: 'TXN1', amount: 10000 });
    const res = makeRes();
    await controller.previewSms(makeReq({ body: { sms: 'Payment of 10000 received' } }), res);
    expect(parsePaymentSms).toHaveBeenCalledWith('Payment of 10000 received');
    expect(res.body.parsed.transactionId).toBe('TXN1');
  });
});

describe('manual payment — submitPayment', () => {
  beforeEach(() => jest.resetAllMocks());

  it('rejects a submission without SMS (validation)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const res = makeRes();
    await controller.submitPayment(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a submission with an invalid transaction id (validation)', async () => {
    const controller = require('../controllers/manualPaymentController');
    parsePaymentSms.mockReturnValue({});
    isValidTransactionId.mockReturnValue(false);
    const res = makeRes();
    await controller.submitPayment(makeReq({ body: { sms: 'Payment received' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects a submission with an invalid amount (validation)', async () => {
    const controller = require('../controllers/manualPaymentController');
    parsePaymentSms.mockReturnValue({ transactionId: 'TXN1' });
    isValidTransactionId.mockReturnValue(true);
    const res = makeRes();
    await controller.submitPayment(makeReq({ body: { sms: 'Payment received' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 401 when the user is not found (auth)', async () => {
    const controller = require('../controllers/manualPaymentController');
    parsePaymentSms.mockReturnValue({ transactionId: 'TXN1', amount: 10000 });
    isValidTransactionId.mockReturnValue(true);
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await controller.submitPayment(makeReq({ body: { sms: 'Payment received' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('submits a new payment (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    parsePaymentSms.mockReturnValue({ transactionId: 'TXN1', amount: 10000, operator: 'Vodacom', confidence: 0.9 });
    isValidTransactionId.mockReturnValue(true);
    User.findById.mockResolvedValue({ _id: 'user-1', username: 'alice', phoneNumber: '255700000001' });
    ManualPayment.findOne.mockReturnValue(mockFindOneSorted(null));
    const payment = makePayment();
    ManualPayment.mockImplementation(() => payment);
    const res = makeRes();
    await controller.submitPayment(makeReq({ body: { sms: 'Payment of 10000 TZS received. TXN1' } }), res);
    expect(payment.save).toHaveBeenCalled();
    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/submitted/i);
  });

  it('flags a duplicate transaction (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    parsePaymentSms.mockReturnValue({ transactionId: 'TXN1', amount: 10000 });
    isValidTransactionId.mockReturnValue(true);
    User.findById.mockResolvedValue({ _id: 'user-1', username: 'alice', phoneNumber: '255700000001' });
    ManualPayment.findOne.mockReturnValue(mockFindOneSorted({ _id: 'pay-original', username: 'bob', submittedAt: new Date() }));
    const payment = makePayment();
    ManualPayment.mockImplementation(() => payment);
    const res = makeRes();
    await controller.submitPayment(makeReq({ body: { sms: 'Payment of 10000 TZS received. TXN1' } }), res);
    expect(payment.status).toBe('Duplicate');
    expect(payment.duplicateOfPaymentId).toBe('pay-original');
    expect(res.body.message).toMatch(/flagged/i);
  });
});

describe('manual payment — user payment views & replies', () => {
  beforeEach(() => jest.resetAllMocks());

  it('lists my payments (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.find.mockReturnValue(mockFindSorted([makePayment()]));
    const res = makeRes();
    await controller.getMyPayments(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.payments).toHaveLength(1);
  });

  it('returns 404 for a missing payment (auth)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findOne.mockResolvedValue(null);
    const res = makeRes();
    await controller.getMyPaymentById(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns a single payment (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findOne.mockResolvedValue(makePayment());
    const res = makeRes();
    await controller.getMyPaymentById(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.body.payment._id).toBe('pay-1');
  });

  it('rejects a user reply without a message (validation)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const res = makeRes();
    await controller.userReply(makeReq({ params: { id: 'pay-1' }, body: { message: ' ' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when replying to a missing payment (auth)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findOne.mockResolvedValue(null);
    const res = makeRes();
    await controller.userReply(makeReq({ params: { id: 'pay-1' }, body: { message: 'hi' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('appends a user reply (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const payment = makePayment();
    ManualPayment.findOne.mockResolvedValue(payment);
    const res = makeRes();
    await controller.userReply(makeReq({ params: { id: 'pay-1' }, body: { message: '<b>hi</b>' } }), res);
    expect(payment.conversation).toHaveLength(1);
    expect(payment.conversation[0].sender).toBe('user');
    expect(payment.conversation[0].message).toBe('&lt;b&gt;hi&lt;/b&gt;'); // HTML-escaped
    expect(payment.save).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });
});

describe('manual payment — admin list & stats', () => {
  beforeEach(() => jest.resetAllMocks());

  it('lists payments with filters and pagination (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const chain = {
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([makePayment()]) })
      })
    };
    ManualPayment.find.mockReturnValue(chain);
    ManualPayment.countDocuments.mockResolvedValue(1);
    const res = makeRes();
    await controller.listPayments(makeReq({
      query: { status: 'Pending', search: 'alice', page: '1', limit: '10' }
    }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination.total).toBe(1);
    expect(res.body.payments).toHaveLength(1);
  });

  it('clamps pagination and builds a search regex (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const chain = {
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue([]) })
      })
    };
    ManualPayment.find.mockReturnValue(chain);
    ManualPayment.countDocuments.mockResolvedValue(0);
    const res = makeRes();
    await controller.listPayments(makeReq({
      query: { status: 'All', search: 'bob[', page: '0', limit: '9999' }
    }), res);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('computes statistics (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.countDocuments
      .mockResolvedValueOnce(3) // pending
      .mockResolvedValueOnce(5) // approved
      .mockResolvedValueOnce(1) // rejected
      .mockResolvedValueOnce(2) // duplicate
      .mockResolvedValueOnce(1) // expired
      .mockResolvedValueOnce(4); // today
    User.countDocuments.mockResolvedValue(8);
    ManualPayment.aggregate
      .mockResolvedValueOnce([{ total: 50000 }])
      .mockResolvedValueOnce([{ total: 200000 }]);
    const res = makeRes();
    await controller.getStatistics(makeReq(), res);
    expect(res.body.stats.pendingPayments).toBe(3);
    expect(res.body.stats.approvedPayments).toBe(5);
    expect(res.body.stats.activeSubscribers).toBe(8);
    expect(res.body.stats.monthlyRevenue).toBe(50000);
    expect(res.body.stats.totalRevenue).toBe(200000);
  });

  it('returns 500 when statistics fail (error)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.countDocuments.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await controller.getStatistics(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('manual payment — admin details', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 404 for missing payment details (auth)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findById.mockResolvedValue(null);
    const res = makeRes();
    await controller.getPaymentDetails(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns payment details with history and duplicate link (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findById
      .mockResolvedValueOnce(makePayment({ duplicateOfPaymentId: 'dup-1' }))
      .mockReturnValueOnce(mockFindByIdSelected({ _id: 'dup-1', status: 'Approved' }));
    User.findById.mockReturnValue(mockFindByIdSelected({ _id: 'user-1', username: 'alice' }));
    ManualPayment.find.mockReturnValue(mockFindSorted([makePayment({ status: 'Approved' })]));
    const res = makeRes();
    await controller.getPaymentDetails(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.duplicateOf._id).toBe('dup-1');
    expect(res.body.stats.totalPayments).toBe(1);
  });

  it('returns 404 for a missing user profile (auth)', async () => {
    const controller = require('../controllers/manualPaymentController');
    User.findById.mockReturnValue(mockFindByIdSelected(null));
    const res = makeRes();
    await controller.getUserProfile(makeReq({ params: { userId: 'u1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns a user profile with payment stats (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    User.findById.mockReturnValue(mockFindByIdSelected({ _id: 'user-1', username: 'alice' }));
    ManualPayment.find.mockReturnValue(mockFindSorted([
      makePayment({ status: 'Approved', amount: 10000 }),
      makePayment({ status: 'Rejected', amount: 5000 })
    ]));
    const res = makeRes();
    await controller.getUserProfile(makeReq({ params: { userId: 'user-1' } }), res);
    expect(res.body.stats.totalPayments).toBe(2);
    expect(res.body.stats.approvedPayments).toBe(1);
    expect(res.body.stats.totalPaid).toBe(10000);
  });
});

describe('manual payment — approve/reject', () => {
  beforeEach(() => jest.resetAllMocks());

  it('returns 404 when approving a missing payment (atomic claim fails)', async () => {
    const controller = require('../controllers/manualPaymentController');
    // findOneAndUpdate returns null — payment doesn't exist or already claimed
    ManualPayment.findOneAndUpdate.mockResolvedValue(null);
    ManualPayment.findById.mockResolvedValue(null);
    const res = makeRes();
    await controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects approving a duplicate payment (atomic claim fails, then findById finds Duplicate)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findOneAndUpdate.mockResolvedValue(null);
    ManualPayment.findById.mockResolvedValue(makePayment({ status: 'Duplicate' }));
    const res = makeRes();
    await controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/duplicate/i);
  });

  it('rejects approving an already-approved payment (atomic claim fails, then findById finds Approved)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findOneAndUpdate.mockResolvedValue(null);
    ManualPayment.findById.mockResolvedValue(makePayment({ status: 'Approved' }));
    const res = makeRes();
    await controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/already approved/i);
  });

  it('returns 404 when the payment user is missing (claim succeeds but user gone)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const payment = makePayment();
    ManualPayment.findOneAndUpdate.mockResolvedValue(payment);
    User.findById.mockResolvedValue(null);
    ManualPayment.updateOne.mockResolvedValue({});
    const res = makeRes();
    await controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.statusCode).toBe(404);
    // Status should be rolled back to Pending
    expect(ManualPayment.updateOne).toHaveBeenCalledWith(
      { _id: payment._id, status: 'Approving' },
      { $set: { status: 'Pending' } }
    );
  });

  it('approves a payment and activates premium (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const payment = makePayment();
    ManualPayment.findOneAndUpdate.mockResolvedValue(payment);
    const user = { premium: false, subscriptionExpiresAt: null, save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res);
    expect(user.premium).toBe(true);
    expect(payment.status).toBe('Approved');
    expect(payment.approvalHistory).toHaveLength(1);
    expect(res.body.success).toBe(true);
  });

  it('extends from the current expiry when still active (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const payment = makePayment();
    ManualPayment.findOneAndUpdate.mockResolvedValue(payment);
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const user = { premium: true, subscriptionExpiresAt: future, save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res);
    expect(user.subscriptionExpiresAt.getTime()).toBeGreaterThan(future.getTime());
  });

  it('rolls back to Pending on failure after claim (prevents stuck Approving status)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const payment = makePayment();
    ManualPayment.findOneAndUpdate.mockResolvedValue(payment);
    const user = { premium: false, subscriptionExpiresAt: null, save: jest.fn().mockRejectedValue(new Error('DB write failed')) };
    User.findById.mockResolvedValue(user);
    ManualPayment.updateOne.mockResolvedValue({});
    const res = makeRes();
    await controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res);
    expect(res.statusCode).toBe(500);
    // Verify rollback was attempted
    expect(ManualPayment.updateOne).toHaveBeenCalledWith(
      { _id: payment._id, status: 'Approving' },
      { $set: { status: 'Pending' } }
    );
  });

  it('only one of two concurrent approve calls succeeds (double-approval prevention)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const payment = makePayment();
    const user = { premium: false, subscriptionExpiresAt: null, save: jest.fn().mockResolvedValue(undefined) };

    // Simulate: first call wins the atomic claim, second call gets null
    ManualPayment.findOneAndUpdate
      .mockResolvedValueOnce(payment)    // First request claims the payment
      .mockResolvedValueOnce(null);      // Second request fails (already claimed)
    ManualPayment.findById.mockResolvedValue(makePayment({ status: 'Approved' }));
    User.findById.mockResolvedValue(user);

    const res1 = makeRes();
    const res2 = makeRes();

    // Run both concurrently
    await Promise.all([
      controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res1),
      controller.approvePayment(makeReq({ params: { id: 'pay-1' } }), res2)
    ]);

    // Exactly one should succeed
    const results = [res1, res2];
    const successes = results.filter(r => r.body?.success === true);
    const failures = results.filter(r => r.statusCode === 400);
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    // Subscription should only be extended once (30 days), not twice
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  it('rejects a payment without a reason (validation)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const res = makeRes();
    await controller.rejectPayment(makeReq({ params: { id: 'pay-1' }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when rejecting a missing payment (auth)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findById.mockResolvedValue(null);
    const res = makeRes();
    await controller.rejectPayment(makeReq({ params: { id: 'pay-1' }, body: { reason: 'no proof' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects a payment and stores the reason (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const payment = makePayment();
    ManualPayment.findById.mockResolvedValue(payment);
    const res = makeRes();
    await controller.rejectPayment(makeReq({ params: { id: 'pay-1' }, body: { reason: 'no proof' } }), res);
    expect(payment.status).toBe('Rejected');
    expect(payment.rejectedReason).toBe('no proof');
    expect(res.body.success).toBe(true);
  });
});

describe('manual payment — admin conversation & expiry check', () => {
  beforeEach(() => jest.resetAllMocks());

  it('rejects an admin message without content (validation)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const res = makeRes();
    await controller.adminSendMessage(makeReq({ params: { id: 'pay-1' }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns 404 when messaging a missing payment (auth)', async () => {
    const controller = require('../controllers/manualPaymentController');
    ManualPayment.findById.mockResolvedValue(null);
    const res = makeRes();
    await controller.adminSendMessage(makeReq({ params: { id: 'pay-1' }, body: { message: 'hi' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('appends an admin message (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const payment = makePayment();
    ManualPayment.findById.mockResolvedValue(payment);
    const res = makeRes();
    await controller.adminSendMessage(makeReq({ params: { id: 'pay-1' }, body: { message: 'hello' } }), res);
    expect(payment.conversation[0].sender).toBe('admin');
    expect(res.body.conversation).toHaveLength(1);
  });

  it('expires overdue subscriptions (happy path)', async () => {
    const controller = require('../controllers/manualPaymentController');
    const expired = makePayment({ status: 'Approved' });
    const io = { to: jest.fn().mockReturnValue({ emit: jest.fn() }) };
    // runExpiryCheck awaits ManualPayment.find directly (no .sort chain).
    ManualPayment.find.mockResolvedValue([expired]);
    const user = { premium: true, subscriptionExpiresAt: new Date(Date.now() - 1000), save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);
    const count = await controller.runExpiryCheck(io);
    expect(count).toBe(1);
    expect(expired.status).toBe('Expired');
    expect(user.premium).toBe(false);
    expect(io.to).toHaveBeenCalledWith('user-1');
  });

  it('does not expire a subscription that is still active', async () => {
    const controller = require('../controllers/manualPaymentController');
    const expired = makePayment({ status: 'Approved' });
    ManualPayment.find.mockResolvedValue([expired]);
    const user = { premium: true, subscriptionExpiresAt: new Date(Date.now() + 100000), save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);
    const count = await controller.runExpiryCheck(null);
    expect(count).toBe(1);
    expect(user.premium).toBe(true);
  });
});
