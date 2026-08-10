jest.mock('../models/CallLog', () => {
  const MockCallLog = jest.fn();
  MockCallLog.find = jest.fn();
  MockCallLog.create = jest.fn();
  MockCallLog.findById = jest.fn();
  MockCallLog.deleteMany = jest.fn();
  return MockCallLog;
});

jest.mock('../models/Conversation', () => ({
  findById: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));

jest.mock('../config/webrtc', () => ({
  getWebRTCConfig: jest.fn(),
  getQualityConfig: jest.fn(),
  validateTurnConfig: jest.fn()
}));

const mongoose = require('mongoose');
const CallLog = require('../models/CallLog');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const {
  getWebRTCConfig,
  getQualityConfig,
  validateTurnConfig
} = require('../config/webrtc');
const {
  getCallLogs,
  createCallLog,
  deleteCallLog,
  clearCallLogs,
  generateCallLink,
  getCallLink
} = require('../controllers/callController');
const webrtcController = require('../controllers/webrtcController');

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
  user: { _id: 'user-1', id: 'user-1', username: 'alice' },
  ...overrides
});

const validObjectId = () => new mongoose.Types.ObjectId().toString();

// Build a CallLog document-shaped object with the fields formatCallLog reads.
const makeLog = (overrides = {}) => ({
  _id: 'log-1',
  callerId: { _id: 'user-1', username: 'alice', profilePicture: null },
  calleeId: { _id: 'user-2', username: 'bob', profilePicture: null },
  conversationId: null,
  callType: 'voice',
  duration: 42,
  status: 'completed',
  isGroup: false,
  startedAt: new Date('2026-01-01T00:00:00Z'),
  endedAt: new Date('2026-01-01T00:01:00Z'),
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides
});

describe('webrtcController — getConfig', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the WebRTC config with TURN detection and validation (happy path)', () => {
    getWebRTCConfig.mockReturnValue({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'turn:turn.example.com:3478', username: 'u', credential: 'p' }]
    });
    getQualityConfig.mockReturnValue({ maxBitrate: 1500000 });
    validateTurnConfig.mockReturnValue({ valid: true, errors: [] });

    const res = makeRes();
    webrtcController.getConfig({}, res);

    expect(res.body.success).toBe(true);
    expect(res.body.hasTurn).toBe(true);
    expect(res.body.turnValid).toBe(true);
    expect(res.body.warnings).toEqual([]);
    expect(getWebRTCConfig).toHaveBeenCalled();
  });

  it('flags hasTurn=false when only STUN servers are configured', () => {
    getWebRTCConfig.mockReturnValue({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    getQualityConfig.mockReturnValue({});
    validateTurnConfig.mockReturnValue({ valid: true, errors: [] });

    const res = makeRes();
    webrtcController.getConfig({}, res);

    expect(res.body.hasTurn).toBe(false);
  });

  it('surfaces TURN validation errors as warnings', () => {
    getWebRTCConfig.mockReturnValue({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    getQualityConfig.mockReturnValue({});
    validateTurnConfig.mockReturnValue({ valid: false, errors: ['TURN_CREDENTIAL is missing'] });

    const res = makeRes();
    webrtcController.getConfig({}, res);

    expect(res.body.turnValid).toBe(false);
    expect(res.body.warnings).toContain('TURN_CREDENTIAL is missing');
  });
});

describe('callController — getCallLogs / createCallLog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns formatted call logs for the current user (happy path)', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve([makeLog(), makeLog({ _id: 'log-2', status: 'missed' })]))
    };
    CallLog.find.mockReturnValue(chain);

    const res = makeRes();
    await getCallLogs(makeReq(), res);

    expect(res.body.success).toBe(true);
    expect(res.body.callLogs).toHaveLength(2);
    expect(res.body.callLogs[0].type).toBe('outgoing');
    expect(res.body.callLogs[0].callerName).toBe('bob');
    expect(res.body.callLogs[0].missed).toBe(false);
    expect(res.body.callLogs[1].missed).toBe(true);
  });

  it('caps the limit at 100', async () => {
    const chain = {
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve([]))
    };
    CallLog.find.mockReturnValue(chain);

    await getCallLogs(makeReq({ query: { limit: '9999' } }), makeRes());

    expect(chain.limit).toHaveBeenCalledWith(100);
  });

  it('creates a call log (happy path)', async () => {
    const created = makeLog();
    CallLog.create.mockResolvedValue(created);
    CallLog.findById.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      then: jest.fn((resolve) => resolve(created))
    });

    const res = makeRes();
    await createCallLog(makeReq({ body: { calleeId: 'user-2', callType: 'video', duration: 30 } }), res);

    expect(CallLog.create).toHaveBeenCalledWith(expect.objectContaining({ callType: 'video', callerId: 'user-1' }));
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('callController — deleteCallLog / clearCallLogs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for a missing call log', async () => {
    CallLog.findById.mockResolvedValue(null);
    const res = makeRes();
    await deleteCallLog(makeReq({ params: { id: validObjectId() } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('denies deletion to a user not involved in the call (403 authz)', async () => {
    CallLog.findById.mockResolvedValue(makeLog({ callerId: { _id: 'user-9' }, calleeId: { _id: 'user-8' } }));
    const res = makeRes();
    await deleteCallLog(makeReq({ params: { id: validObjectId() } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deletes an involved user’s call log (happy path)', async () => {
    // deleteCallLog reads raw string ids (unpopulated) — callerId is 'user-1'.
    const log = makeLog({
      callerId: 'user-1',
      calleeId: 'user-2',
      participants: ['user-1', 'user-2']
    });
    log.deleteOne = jest.fn().mockResolvedValue(undefined);
    CallLog.findById.mockResolvedValue(log);
    const res = makeRes();
    await deleteCallLog(makeReq({ params: { id: validObjectId() } }), res);
    expect(log.deleteOne).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('clears all call logs for the current user', async () => {
    CallLog.deleteMany.mockResolvedValue({ deletedCount: 3 });
    const res = makeRes();
    await clearCallLogs(makeReq(), res);
    expect(CallLog.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ $or: expect.any(Array) }));
    expect(res.body.success).toBe(true);
  });
});

describe('callController — call links', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 when the link creator user is missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await generateCallLink(makeReq({ body: { conversationId: validObjectId(), callType: 'video' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('User not found');
  });

  it('generates a shareable call link (happy path)', async () => {
    const user = {
      _id: 'user-1',
      username: 'alice',
      callLinkSettings: undefined,
      save: jest.fn().mockResolvedValue(undefined)
    };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await generateCallLink(makeReq({ body: { callType: 'video', expiresInHours: 12 } }), res);

    expect(user.callLinkSettings.links).toHaveLength(1);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
    expect(res.body.callLink.url).toMatch(/\/join-call\/[a-f0-9]{32}$/);
  });

  it('returns 404 for an unknown link token', async () => {
    User.find.mockResolvedValue([]);
    const res = makeRes();
    await getCallLink(makeReq({ params: { token: 'deadbeef' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 410 for an expired link', async () => {
    User.find.mockResolvedValue([{
      _id: 'user-1',
      username: 'alice',
      callLinkSettings: {
        links: [{
          token: 'tok-1',
          callType: 'video',
          isGroup: false,
          expiresAt: new Date(Date.now() - 60 * 1000),
          conversationId: null
        }]
      }
    }]);
    const res = makeRes();
    await getCallLink(makeReq({ params: { token: 'tok-1' } }), res);
    expect(res.statusCode).toBe(410);
    expect(res.body.message).toBe('Call link has expired');
  });

  it('resolves a valid, non-expired link (happy path)', async () => {
    User.find.mockResolvedValue([{
      _id: 'user-1',
      username: 'alice',
      profilePicture: null,
      callLinkSettings: {
        links: [{
          token: 'tok-1',
          callType: 'video',
          isGroup: false,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          conversationId: null
        }]
      }
    }]);
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await getCallLink(makeReq({ params: { token: 'tok-1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.callLink.creator.username).toBe('alice');
  });
});
