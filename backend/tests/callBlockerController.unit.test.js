jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/CallLog', () => ({}));

const User = require('../models/User');
const callTools = require('../controllers/callToolsController');
const callBlocker = callTools;

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
  callBlockerSettings: {},
  blockedCallHistory: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('callToolsController (call blocker) — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await callBlocker.getCallBlockerSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: { blockUnknownNumbers: true } }));
    const res = makeRes();
    await callBlocker.getCallBlockerSettings(makeReq(), res);
    expect(res.body.settings.blockUnknownNumbers).toBe(true);
    expect(res.body.settings.callBlockerEnabled).toBe(true); // default
    expect(res.body.settings.rejectCountThreshold).toBe(3); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.updateCallBlockerSettings(makeReq({ body: { settings: { blockSpamCalls: false } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.blockSpamCalls).toBe(false);
  });

  it('toggles the blocker (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.toggleCallBlocker(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.callBlockerEnabled).toBe(false);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ callBlockerSettings: { blockSpamCalls: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.resetCallBlockerSettings(makeReq(), res);
    expect(res.body.settings.blockSpamCalls).toBe(true); // default
  });
});

describe('callToolsController (call blocker) — numbers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects blockNumber without a phone number (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await callBlocker.blockNumber(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Phone number is required');
  });

  it('rejects blocking an already-blocked number (400)', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: { blockedNumbers: ['255700000001'] } }));
    const res = makeRes();
    await callBlocker.blockNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Number already blocked');
  });

  it('blocks a number (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.blockNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.blockedNumbers).toContain('255700000001');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 404 when unblocking a missing number', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await callBlocker.unblockNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('unblocks a number (happy path)', async () => {
    const user = makeUser({ callBlockerSettings: { blockedNumbers: ['255700000001'] } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.unblockNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.blockedNumbers).not.toContain('255700000001');
  });

  it('returns the blocked list (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: { blockedNumbers: ['255700000001'] } }));
    const res = makeRes();
    await callBlocker.getBlockedNumbers(makeReq(), res);
    expect(res.body.blockedNumbers).toHaveLength(1);
  });

  it('adds a number to the allowed list (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.addAllowedNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.body.allowedNumbers).toContain('255700000001');
  });

  it('returns 404 when removing a missing allowed number', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await callBlocker.removeAllowedNumber(makeReq({ params: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('removes an allowed number (happy path)', async () => {
    const user = makeUser({ callBlockerSettings: { allowedNumbers: ['255700000001'] } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.removeAllowedNumber(makeReq({ params: { phoneNumber: '255700000001' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.allowedNumbers).toHaveLength(0);
  });

  it('returns blocked call history (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ blockedCallHistory: [{ phone: '255' }] }));
    const res = makeRes();
    await callBlocker.getCallBlockHistory(makeReq(), res);
    expect(res.body.history).toHaveLength(1);
  });
});

describe('callToolsController (call blocker) — check', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows when the blocker is disabled', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: { callBlockerEnabled: false } }));
    const res = makeRes();
    await callBlocker.checkCallBlock(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.body.shouldBlock).toBe(false);
    expect(res.body.reason).toBe('Call blocker disabled');
  });

  it('blocks a number in the blocked list', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: { blockedNumbers: ['255700000001'] } }));
    const res = makeRes();
    await callBlocker.checkCallBlock(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.body.shouldBlock).toBe(true);
    expect(res.body.reason).toBe('Number is in blocked list');
  });

  it('blocks private numbers when configured', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: { blockPrivateNumbers: true } }));
    const res = makeRes();
    await callBlocker.checkCallBlock(makeReq({ body: { phoneNumber: null, isPrivate: true } }), res);
    expect(res.body.shouldBlock).toBe(true);
    expect(res.body.reason).toBe('Private/unknown number blocked');
  });

  it('blocks international calls when configured', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: { blockInternationalCalls: true } }));
    const res = makeRes();
    await callBlocker.checkCallBlock(makeReq({ body: { phoneNumber: '123', isInternational: true } }), res);
    expect(res.body.shouldBlock).toBe(true);
  });

  it('allows a blocked number that is on the allowed list (override)', async () => {
    User.findById.mockResolvedValue(makeUser({
      callBlockerSettings: { blockedNumbers: ['255700000001'], allowedNumbers: ['255700000001'] }
    }));
    const res = makeRes();
    await callBlocker.checkCallBlock(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.body.shouldBlock).toBe(false);
    expect(res.body.reason).toBe('Number is in allowed list');
  });

  it('allows a normal call when no rule matches', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await callBlocker.checkCallBlock(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.body.shouldBlock).toBe(false);
    expect(res.body.reason).toBe('Call allowed');
    expect(res.body.settings.sendToVoicemail).toBe(true); // default
  });

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await callBlocker.checkCallBlock(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 500 when the DB read fails (error)', async () => {
    User.findById.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await callBlocker.checkCallBlock(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('db down');
  });
});

describe('callToolsController (call blocker) — validation & error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects unblockNumber without a phone number (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await callBlocker.unblockNumber(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Phone number is required');
  });

  it('returns 404 when unblocking with no blocked list at all', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: {} }));
    const res = makeRes();
    await callBlocker.unblockNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('No blocked numbers found');
  });

  it('rejects addAllowedNumber without a phone number (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await callBlocker.addAllowedNumber(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Phone number is required');
  });

  it('rejects adding a number already in the allowed list (400)', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: { allowedNumbers: ['255700000001'] } }));
    const res = makeRes();
    await callBlocker.addAllowedNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Number already in allowed list');
  });

  it('returns 404 when removing an allowed number with no list at all', async () => {
    User.findById.mockResolvedValue(makeUser({ callBlockerSettings: {} }));
    const res = makeRes();
    await callBlocker.removeAllowedNumber(makeReq({ params: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('No allowed numbers found');
  });

  it('returns 401 for blockNumber (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await callBlocker.blockNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 500 when saving a blocked number fails (error)', async () => {
    const user = makeUser();
    user.save.mockRejectedValue(new Error('db down'));
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.blockNumber(makeReq({ body: { phoneNumber: '255700000001' } }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('db down');
  });

  it('returns 401 for getBlockedNumbers (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await callBlocker.getBlockedNumbers(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for toggleCallBlocker (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await callBlocker.toggleCallBlocker(makeReq({ body: { enabled: true } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 500 for toggleCallBlocker when saving fails (error)', async () => {
    const user = makeUser();
    user.save.mockRejectedValue(new Error('db down'));
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callBlocker.toggleCallBlocker(makeReq({ body: { enabled: true } }), res);
    expect(res.statusCode).toBe(500);
  });
});
