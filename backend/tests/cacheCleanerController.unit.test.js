jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  find: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const cacheCleaner = require('../controllers/cacheCleanerController');

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
  cacheCleanerSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('cacheCleanerController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await cacheCleaner.getCacheCleanerSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged default settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ cacheCleanerSettings: { autoCleanCache: true } }));
    const res = makeRes();
    await cacheCleaner.getCacheCleanerSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.autoCleanCache).toBe(true);
    expect(res.body.settings.cacheCleanerEnabled).toBe(true); // from defaults
  });

  it('updates settings by merging with defaults (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await cacheCleaner.updateCacheCleanerSettings(
      makeReq({ body: { settings: { cleanIntervalDays: 14, maxCacheSizeMB: 1000 } } }),
      res
    );
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.cleanIntervalDays).toBe(14);
    expect(res.body.settings.maxCacheSizeMB).toBe(1000);
  });

  it('toggles the cache cleaner (happy path)', async () => {
    const user = makeUser({ cacheCleanerSettings: { cacheCleanerEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await cacheCleaner.toggleCacheCleaner(makeReq({ body: { enabled: true } }), res);
    expect(res.body.settings.cacheCleanerEnabled).toBe(true);
  });

  it('sets max cache size (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await cacheCleaner.setMaxCacheSize(makeReq({ body: { maxSizeMB: 750 } }), res);
    expect(res.body.settings.maxCacheSizeMB).toBe(750);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ cacheCleanerSettings: { maxCacheSizeMB: 9999 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await cacheCleaner.resetCacheCleanerSettings(makeReq(), res);
    expect(res.body.settings.maxCacheSizeMB).toBe(500);
    expect(res.body.settings.cacheCleanerEnabled).toBe(true);
  });
});

describe('cacheCleanerController — cache size', () => {
  beforeEach(() => jest.clearAllMocks());

  it('estimates cache size from media messages (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'c1' }]);
    Message.find.mockResolvedValue([
      { messageType: 'image' },
      { messageType: 'image' },
      { messageType: 'video' },
      { messageType: 'audio' },
      { messageType: 'document' }
    ]);
    const res = makeRes();
    await cacheCleaner.getCacheSize(makeReq(), res);
    expect(Conversation.find).toHaveBeenCalledWith({ participants: 'user-1' });
    expect(res.body.cacheSize.images).toBe(4); // 2 * 2 MB
    expect(res.body.cacheSize.videos).toBe(5); // 1 * 5 MB
    expect(res.body.cacheSize.audio).toBe(1);
    expect(res.body.cacheSize.documents).toBe(0.5);
    expect(res.body.percentageUsed).toEqual(expect.any(String));
    expect(res.body.warningLevel).toBe('normal');
  });

  it('reports a warning level when cache exceeds 80% (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ cacheCleanerSettings: { maxCacheSizeMB: 5 } }));
    Conversation.find.mockResolvedValue([{ _id: 'c1' }]);
    Message.find.mockResolvedValue([{ messageType: 'video' }, { messageType: 'video' }]);
    const res = makeRes();
    await cacheCleaner.getCacheSize(makeReq(), res);
    expect(res.body.warningLevel).toBe('warning');
  });

  it('returns 500 when estimating cache size fails (error)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await cacheCleaner.getCacheSize(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});

describe('cacheCleanerController — clear endpoints', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 501 for clearCache (disabled for safety)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await cacheCleaner.clearCache(makeReq(), res);
    expect(res.statusCode).toBe(501);
    expect(res.body.success).toBe(false);
  });

  it('returns 501 for clearOldCache (disabled for safety)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await cacheCleaner.clearOldCache(makeReq(), res);
    expect(res.statusCode).toBe(501);
    expect(res.body.success).toBe(false);
  });
});
