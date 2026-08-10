jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const antiBan = require('../controllers/antiBanController');

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
  antiBanSettings: undefined,
  suspiciousActivities: [],
  messageCount: undefined,
  warningLevel: undefined,
  warningUntil: undefined,
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('antiBanController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAntiBanSettings returns 401 when user cannot be resolved', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await antiBan.getAntiBanSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('getAntiBanSettings returns defaults merged with stored (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ antiBanSettings: { deviceSpoof: true } }));
    const res = makeRes();
    await antiBan.getAntiBanSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.deviceSpoof).toBe(true);
    expect(res.body.settings.antiBanEnabled).toBe(true); // default
    expect(res.body.settings.maxMessagesPerMinute).toBe(60); // default
    expect(res.body.settings.banThreshold).toBe(5); // default
  });

  it('updateAntiBanSettings merges incoming settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await antiBan.updateAntiBanSettings(makeReq({ body: { settings: { messageDelay: 500 } } }), res);
    expect(user.antiBanSettings.messageDelay).toBe(500);
    expect(user.antiBanSettings.maxMessagesPerHour).toBe(1000); // default preserved
    expect(user.markModified).toHaveBeenCalledWith('antiBanSettings');
    expect(user.save).toHaveBeenCalled();
  });

  it('resetAntiBanSettings restores defaults (happy path)', async () => {
    const user = makeUser({ antiBanSettings: { antiBanEnabled: false, deviceSpoof: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await antiBan.resetAntiBanSettings(makeReq(), res);
    expect(user.antiBanSettings.antiBanEnabled).toBe(true);
    expect(user.antiBanSettings.deviceSpoof).toBe(false);
    expect(user.markModified).toHaveBeenCalledWith('antiBanSettings');
    expect(user.save).toHaveBeenCalled();
  });
});

describe('antiBanController — toggles', () => {
  beforeEach(() => jest.clearAllMocks());

  const toggleCases = [
    ['toggleAntiBan', 'antiBanEnabled'],
    ['toggleDeviceSpoof', 'deviceSpoof'],
    ['toggleIPMask', 'ipMask'],
    ['toggleSecureMode', 'secureMode']
  ];

  toggleCases.forEach(([handler, field]) => {
    it(`${handler} accepts an explicit flag`, async () => {
      const user = makeUser();
      User.findById.mockResolvedValue(user);
      const res = makeRes();
      await antiBan[handler](makeReq({ body: { enabled: true } }), res);
      expect(user.antiBanSettings[field]).toBe(true);
      expect(user.save).toHaveBeenCalled();
    });

    it(`${handler} flips the current value when absent`, async () => {
      const user = makeUser({ antiBanSettings: { [field]: true } });
      User.findById.mockResolvedValue(user);
      const res = makeRes();
      await antiBan[handler](makeReq({ body: {} }), res);
      expect(user.antiBanSettings[field]).toBe(false);
    });
  });

  it('toggles return 401 when user cannot be resolved', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await antiBan.toggleAntiBan(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('updateRateLimiting updates only provided fields (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await antiBan.updateRateLimiting(makeReq({ body: { messageDelay: 2000, maxMessagesPerMinute: 30 } }), res);
    expect(user.antiBanSettings.messageDelay).toBe(2000);
    expect(user.antiBanSettings.maxMessagesPerMinute).toBe(30);
    expect(user.antiBanSettings.maxMessagesPerHour).toBe(1000); // untouched default
    expect(user.markModified).toHaveBeenCalledWith('antiBanSettings');
  });
});

describe('antiBanController — checkRateLimit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('allows everything when rate limiting is disabled', async () => {
    User.findById.mockResolvedValue(makeUser({ antiBanSettings: { rateLimiting: false } }));
    const res = makeRes();
    await antiBan.checkRateLimit(makeReq(), res);
    expect(res.body.allowed).toBe(true);
    expect(res.body.message).toBe('Rate limiting is disabled');
  });

  it('allows when under the limits (happy path)', async () => {
    const now = Date.now();
    User.findById.mockResolvedValue(makeUser({
      messageCount: { minute: 5, hour: 100, lastReset: new Date(now) }
    }));
    const res = makeRes();
    await antiBan.checkRateLimit(makeReq(), res);
    expect(res.body.allowed).toBe(true);
    expect(res.body.minuteCount).toBe(5);
    expect(res.body.minuteLimit).toBe(60);
    expect(res.body.hourLimit).toBe(1000);
    expect(res.body.messageDelay).toBe(1000);
  });

  it('blocks when the minute limit is exceeded', async () => {
    const now = Date.now();
    User.findById.mockResolvedValue(makeUser({
      messageCount: { minute: 61, hour: 100, lastReset: new Date(now) }
    }));
    const res = makeRes();
    await antiBan.checkRateLimit(makeReq(), res);
    expect(res.body.allowed).toBe(false);
  });

  it('resets the minute counter after a minute passes', async () => {
    const now = Date.now();
    const user = makeUser({
      messageCount: { minute: 61, hour: 100, lastReset: new Date(now - 120000) }
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await antiBan.checkRateLimit(makeReq(), res);
    expect(res.body.minuteCount).toBe(0);
    expect(res.body.allowed).toBe(true);
  });
});

describe('antiBanController — recordSuspiciousActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing activity type (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await antiBan.recordSuspiciousActivity(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Activity type is required');
  });

  it('short-circuits when detection is disabled', async () => {
    User.findById.mockResolvedValue(makeUser({ antiBanSettings: { detectSuspiciousActivity: false } }));
    const res = makeRes();
    await antiBan.recordSuspiciousActivity(makeReq({ body: { activityType: 'mass-message' } }), res);
    expect(res.body.message).toBe('Suspicious activity detection is disabled');
    expect(res.body.success).toBe(true);
  });

  it('records activity and stays under the threshold (happy path)', async () => {
    const user = makeUser({ suspiciousActivities: [] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await antiBan.recordSuspiciousActivity(makeReq({ body: { activityType: 'mass-message', description: 'x' } }), res);
    expect(user.suspiciousActivities).toHaveLength(1);
    expect(user.suspiciousActivities[0].type).toBe('mass-message');
    expect(user.suspiciousActivities[0].severity).toBe('medium');
    expect(user.markModified).toHaveBeenCalledWith('suspiciousActivities');
    expect(res.body.recentActivityCount).toBe(1);
    expect(res.body.threshold).toBe(5);
    expect(user.save).toHaveBeenCalled();
  });

  it('raises the warning level when the threshold is reached', async () => {
    const now = Date.now();
    const user = makeUser({
      suspiciousActivities: Array.from({ length: 4 }, (_, i) => ({
        type: 'x',
        timestamp: new Date(now - i * 1000)
      }))
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await antiBan.recordSuspiciousActivity(makeReq({ body: { activityType: 'mass-message' } }), res);
    expect(user.warningLevel).toBe('high');
    expect(user.warningUntil).toBeInstanceOf(Date);
    expect(res.body.recentActivityCount).toBe(5);
  });
});

describe('antiBanController — security status / clear warning', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getSecurityStatus returns the computed score (happy path)', async () => {
    const now = Date.now();
    User.findById.mockResolvedValue(makeUser({
      warningLevel: 'high',
      warningUntil: new Date(now + 10000),
      suspiciousActivities: [{ type: 'x', timestamp: new Date(now - 1000) }],
      antiBanSettings: { deviceSpoof: true, ipMask: true }
    }));
    const res = makeRes();
    await antiBan.getSecurityStatus(makeReq(), res);
    expect(res.body.status.antiBanEnabled).toBe(true);
    expect(res.body.status.warningLevel).toBe('high');
    expect(res.body.status.recentSuspiciousActivities).toBe(1);
    // 100 - 0 (all enabled) - 1*5 = 95
    expect(res.body.status.securityScore).toBe(95);
  });

  it('getSecurityStatus lowers the score for disabled protections', async () => {
    User.findById.mockResolvedValue(makeUser({
      antiBanSettings: { antiBanEnabled: false, secureMode: false, rateLimiting: false, deviceSpoof: false, ipMask: false },
      suspiciousActivities: [{ type: 'x', timestamp: new Date() }]
    }));
    const res = makeRes();
    await antiBan.getSecurityStatus(makeReq(), res);
    // 100 - 30 - 20 - 15 - 10 - 10 - 5 = 10
    expect(res.body.status.securityScore).toBe(10);
  });

  it('getSecurityStatus floors the score at zero', async () => {
    User.findById.mockResolvedValue(makeUser({
      antiBanSettings: { antiBanEnabled: false, secureMode: false, rateLimiting: false, deviceSpoof: false, ipMask: false },
      suspiciousActivities: Array.from({ length: 10 }, () => ({ type: 'x', timestamp: new Date() }))
    }));
    const res = makeRes();
    await antiBan.getSecurityStatus(makeReq(), res);
    expect(res.body.status.securityScore).toBe(0);
  });

  it('clearWarning resets the warning state (happy path)', async () => {
    const user = makeUser({ warningLevel: 'high', warningUntil: new Date() });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await antiBan.clearWarning(makeReq(), res);
    expect(user.warningLevel).toBe('none');
    expect(user.warningUntil).toBeNull();
    expect(user.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Warning cleared');
  });
});
