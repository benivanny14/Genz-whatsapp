jest.mock('../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn()
}));

jest.mock('../models/Status', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const Status = require('../models/Status');
const statusFeatures = require('../controllers/statusToolsController');

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
  statusFeaturesSettings: {},
  statusHighlights: [],
  closeFriends: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('statusFeaturesController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusFeatures.getStatusFeaturesSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ statusFeaturesSettings: { statusPrivacy: 'nobody' } }));
    const res = makeRes();
    await statusFeatures.getStatusFeaturesSettings(makeReq(), res);
    expect(res.body.settings.statusPrivacy).toBe('nobody');
    expect(res.body.settings.statusDuration).toBe(24); // default
    expect(res.body.settings.statusHighlights).toBe(true); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.updateStatusFeaturesSettings(makeReq({ body: { settings: { statusViewCount: false } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.statusViewCount).toBe(false);
  });

  it('rejects an invalid privacy value (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await statusFeatures.updateStatusPrivacy(makeReq({ body: { privacy: 'everyone-and-their-dog' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid privacy setting');
  });

  it('updates privacy (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.updateStatusPrivacy(makeReq({ body: { privacy: 'contacts' } }), res);
    expect(res.body.settings.statusPrivacy).toBe('contacts');
    expect(user.save).toHaveBeenCalled();
  });

  it('toggles highlights (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.toggleStatusHighlights(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.statusHighlights).toBe(false);
  });

  it('rejects highlight creation without name/statusIds (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await statusFeatures.createStatusHighlight(makeReq({ body: { name: 'Trip' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Name and status IDs are required');
  });

  it('creates a status highlight (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.createStatusHighlight(makeReq({ body: { name: 'Trip', statusIds: ['s1', 's2'] } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.highlight.name).toBe('Trip');
    expect(user.statusHighlights).toHaveLength(1);
    expect(user.save).toHaveBeenCalled();
  });

  it('adds a user to close friends (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.addToCloseFriends(makeReq({ body: { userId: 'user-2' } }), res);
    expect(res.body.closeFriends).toContain('user-2');
    expect(user.save).toHaveBeenCalled();
  });

  it('does not duplicate a close friend (happy path)', async () => {
    const user = makeUser({ closeFriends: ['user-2'] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.addToCloseFriends(makeReq({ body: { userId: 'user-2' } }), res);
    expect(res.body.closeFriends).toHaveLength(1);
    expect(user.save).not.toHaveBeenCalled();
  });

  it('removes a user from close friends (happy path)', async () => {
    const user = makeUser({ closeFriends: ['user-2', 'user-3'] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.removeFromCloseFriends(makeReq({ body: { userId: 'user-2' } }), res);
    expect(res.body.closeFriends).toEqual(['user-3']);
  });

  it('rejects an out-of-range duration (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await statusFeatures.updateStatusDuration(makeReq({ body: { hours: 12 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Duration must be between 24 and 168 hours');
  });

  it('updates status duration (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.updateStatusDuration(makeReq({ body: { hours: 72 } }), res);
    expect(res.body.statusDuration).toBe(72);
    expect(user.save).toHaveBeenCalled();
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ statusFeaturesSettings: { statusDuration: 48 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusFeatures.resetStatusFeaturesSettings(makeReq(), res);
    expect(res.body.settings.statusDuration).toBe(24); // default
  });
});

describe('statusFeaturesController — viewers', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for a missing status', async () => {
    User.findById.mockResolvedValue(makeUser());
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusFeatures.getStatusViewers(makeReq({ params: { statusId: 's1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects viewing another user\'s status (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Status.findById.mockResolvedValue({ user: 'user-9', viewedBy: [] });
    const res = makeRes();
    await statusFeatures.getStatusViewers(makeReq({ params: { statusId: 's1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('returns the viewer list (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Status.findById.mockResolvedValue({ user: 'user-1', viewedBy: ['user-2'] });
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'user-2', username: 'bob' }]) });
    const res = makeRes();
    await statusFeatures.getStatusViewers(makeReq({ params: { statusId: 's1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.viewers).toHaveLength(1);
  });
});
