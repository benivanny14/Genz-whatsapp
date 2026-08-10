jest.mock('../models/Status', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../utils/messageSendHelpers', () => ({
  isEitherUserBlocked: jest.fn().mockResolvedValue(false)
}));

jest.mock('../utils/contentFilter', () => ({
  containsProfanity: jest.fn(() => false)
}));

const Status = require('../models/Status');
const User = require('../models/User');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');
const { containsProfanity } = require('../utils/contentFilter');
const statusCtrl = require('../controllers/statusController');

const VALID_ID = '507f1f77bcf86cd799439011';
const OTHER_ID = '507f191e810c19729de860ea';

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

const makeStatus = (overrides = {}) => ({
  _id: VALID_ID,
  user: 'user-1',
  userId: 'user-1',
  type: 'text',
  content: 'Hello',
  privacy: 'everyone',
  views: [],
  reactions: [],
  expiresAt: new Date(Date.now() + 3600000),
  save: jest.fn().mockResolvedValue(undefined),
  deleteOne: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

// Build a find() chain with N populate() calls ending in sort()
const findChain = (result, populates = 3) => {
  let chain = { sort: jest.fn().mockResolvedValue(result) };
  for (let i = 0; i < populates; i++) {
    chain = { populate: jest.fn().mockReturnValue(chain) };
  }
  return chain;
};

describe('statusController — createStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    containsProfanity.mockReturnValue(false);
  });

  it('rejects profane status content (validation)', async () => {
    containsProfanity.mockReturnValue(true);
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'text', content: 'bad words' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/maneno yasiyoruhusiwa/);
  });

  it('requires a type (validation)', async () => {
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Type inahitajika');
  });

  it('requires content for text statuses (validation)', async () => {
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'text' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Content inahitajika kwa text status');
  });

  it('requires mediaUrl for image statuses (validation)', async () => {
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'image' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('MediaUrl inahitajika');
  });

  it('requires quizQuestion for quiz statuses (validation)', async () => {
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'quiz' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('requires collageImages for collage statuses (validation)', async () => {
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'collage', collageImages: [] } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('creates a text status with a 24h expiry by default (happy path)', async () => {
    const created = makeStatus({ _id: VALID_ID, type: 'text' });
    Status.create.mockResolvedValue(created);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeStatus()) });
    Status.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(created) });

    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'text', content: 'Mambo vipi', caption: 'hi' } }), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Status.create).toHaveBeenCalledTimes(1);
    const args = Status.create.mock.calls[0][0];
    expect(args.user).toBe('user-1');
    expect(args.type).toBe('text');
    expect(args.content).toBe('Mambo vipi');
    expect(args.privacy).toBe('everyone');
    expect(args.expiresAt.getTime()).toBeGreaterThan(Date.now() + 23 * 3600000);
  });

  it('persists the real privacy choice (happy path)', async () => {
    Status.create.mockResolvedValue(makeStatus());
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeStatus()) });
    Status.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(makeStatus()) });
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'text', content: 'x', privacy: 'only_me' } }), res);
    expect(Status.create.mock.calls[0][0].privacy).toBe('only_me');
  });

  it('falls back to everyone for invalid privacy values', async () => {
    Status.create.mockResolvedValue(makeStatus());
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeStatus()) });
    Status.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(makeStatus()) });
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'text', content: 'x', privacy: 'hacked' } }), res);
    expect(Status.create.mock.calls[0][0].privacy).toBe('everyone');
  });

  it('uses the configured status duration when valid (happy path)', async () => {
    Status.create.mockResolvedValue(makeStatus());
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ statusFeaturesSettings: { statusDuration: 72 } }) });
    Status.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(makeStatus()) });
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({ body: { type: 'text', content: 'x' } }), res);
    const expiresAt = Status.create.mock.calls[0][0].expiresAt;
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + 71 * 3600000);
  });

  it('normalizes latitude/longitude location payloads', async () => {
    Status.create.mockResolvedValue(makeStatus());
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(makeStatus()) });
    Status.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(makeStatus()) });
    const res = makeRes();
    await statusCtrl.createStatus(makeReq({
      body: { type: 'location', locationData: { latitude: -6.79, longitude: 39.2, address: 'Dar' } }
    }), res);
    const loc = Status.create.mock.calls[0][0].locationData;
    expect(loc.lat).toBe(-6.79);
    expect(loc.lng).toBe(39.2);
    expect(loc.address).toBe('Dar');
  });
});

describe('statusController — getStatuses (feed)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isEitherUserBlocked.mockResolvedValue(false);
  });

  const poster = { _id: 'user-2', username: 'bob', contacts: [], settings: { privacy: {} }, encryptionKeys: 'k' };
  const myStatus = makeStatus({ _id: 's1', user: { _id: 'user-1', username: 'alice', contacts: [], settings: {} }, userId: 'user-1', views: [] });
  const otherStatus = makeStatus({ _id: 's2', user: 'user-2', userId: 'user-2', user: { ...poster, contacts: [{ user: 'user-1' }] }, views: [] });

  it('groups my statuses separately and strips user secrets (happy path)', async () => {
    Status.find.mockReturnValue(findChain([myStatus, otherStatus]));
    const res = makeRes();
    await statusCtrl.getStatuses(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.myStatuses).toHaveLength(1);
    expect(res.body.myStatuses[0]._id).toBe('s1');
    expect(res.body.others).toHaveLength(1);
    // secrets stripped from populated poster
    expect(res.body.others[0].user.contacts).toBeUndefined();
    expect(res.body.others[0].user.settings).toBeUndefined();
    expect(res.body.others[0].user.encryptionKeys).toBeUndefined();
  });

  it('marks hasUnviewed for statuses the viewer has not seen', async () => {
    const unviewed = makeStatus({ _id: 's2', user: 'user-2', userId: 'user-2', user: poster, views: [] });
    const viewed = makeStatus({ _id: 's3', user: 'user-2', userId: 'user-2', user: poster, views: [{ user: { _id: 'user-1' } }] });
    Status.find.mockReturnValue(findChain([unviewed, viewed]));
    const res = makeRes();
    await statusCtrl.getStatuses(makeReq(), res);
    const group = res.body.others[0];
    expect(group.hasUnviewed).toBe(true);
  });

  it('hides statuses from blocked users', async () => {
    isEitherUserBlocked.mockResolvedValue(true);
    Status.find.mockReturnValue(findChain([otherStatus]));
    const res = makeRes();
    await statusCtrl.getStatuses(makeReq(), res);
    expect(res.body.others).toHaveLength(0);
    expect(isEitherUserBlocked).toHaveBeenCalled();
  });

  it('hides only_me and nobody statuses from other viewers', async () => {
    const onlyMe = makeStatus({ _id: 's2', user: 'user-2', userId: 'user-2', user: poster, privacy: 'only_me', views: [] });
    const nobody = makeStatus({ _id: 's3', user: 'user-2', userId: 'user-2', user: poster, privacy: 'nobody', views: [] });
    Status.find.mockReturnValue(findChain([onlyMe, nobody]));
    const res = makeRes();
    await statusCtrl.getStatuses(makeReq(), res);
    expect(res.body.others).toHaveLength(0);
  });

  it('shows only_share_with statuses only to included viewers', async () => {
    const included = makeStatus({
      _id: 's2', user: 'user-2', userId: 'user-2', user: poster,
      privacy: 'only_share_with', includedViewers: ['user-1'], views: []
    });
    const excluded = makeStatus({
      _id: 's3', user: 'user-2', userId: 'user-2', user: poster,
      privacy: 'only_share_with', includedViewers: ['user-9'], views: []
    });
    Status.find.mockReturnValue(findChain([included, excluded]));
    const res = makeRes();
    await statusCtrl.getStatuses(makeReq(), res);
    expect(res.body.others).toHaveLength(1);
    expect(res.body.others[0].statuses[0]._id).toBe('s2');
  });

  it('filters contacts-only statuses by the poster contact list', async () => {
    const contactPoster = { _id: 'user-2', username: 'bob', contacts: [{ user: 'user-1' }] };
    const strangerPoster = { _id: 'user-3', username: 'carol', contacts: [] };
    const forContact = makeStatus({ _id: 's2', user: 'user-2', userId: 'user-2', user: contactPoster, privacy: 'contacts', views: [] });
    const forStranger = makeStatus({ _id: 's3', user: 'user-3', userId: 'user-3', user: strangerPoster, privacy: 'contacts', views: [] });
    Status.find.mockReturnValue(findChain([forContact, forStranger]));
    const res = makeRes();
    await statusCtrl.getStatuses(makeReq(), res);
    expect(res.body.others).toHaveLength(1);
    expect(res.body.others[0].statuses[0]._id).toBe('s2');
  });

  it('excludes contacts_except viewers who are in the excluded list', async () => {
    const posterWithContacts = { _id: 'user-2', username: 'bob', contacts: [{ user: 'user-1' }] };
    const excluded = makeStatus({
      _id: 's2', user: 'user-2', userId: 'user-2', user: posterWithContacts,
      privacy: 'contacts_except', excludedViewers: ['user-1'], views: []
    });
    Status.find.mockReturnValue(findChain([excluded]));
    const res = makeRes();
    await statusCtrl.getStatuses(makeReq(), res);
    expect(res.body.others).toHaveLength(0);
  });

  it('skips orphaned statuses whose poster account was deleted', async () => {
    const orphan = makeStatus({ _id: 's2', user: null, userId: 'user-2', views: [] });
    Status.find.mockReturnValue(findChain([orphan]));
    const res = makeRes();
    await statusCtrl.getStatuses(makeReq(), res);
    expect(res.body.myStatuses).toHaveLength(0);
    expect(res.body.others).toHaveLength(0);
  });
});

describe('statusController — getSharedStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isEitherUserBlocked.mockResolvedValue(false);
  });

  it('returns 404 for an invalid id format', async () => {
    const res = makeRes();
    await statusCtrl.getSharedStatus(makeReq({ params: { id: 'abc' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Status haipatikani');
  });

  it('returns 404 when the status does not exist', async () => {
    Status.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) }) });
    const res = makeRes();
    await statusCtrl.getSharedStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for auto-expired statuses', async () => {
    const expired = makeStatus({ expiresAt: new Date(Date.now() - 1000) });
    Status.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(expired) }) });
    const res = makeRes();
    await statusCtrl.getSharedStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Status imeisha muda wake');
  });

  it('allows anonymous visitors to see everyone statuses', async () => {
    const status = makeStatus({ user: { _id: 'user-2', username: 'bob', contacts: [] }, privacy: 'everyone' });
    Status.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(status) }) });
    const res = makeRes();
    await statusCtrl.getSharedStatus(makeReq({ user: undefined, params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(status.user.contacts).toBeUndefined(); // secrets stripped
  });

  it('denies only_me statuses with 403', async () => {
    const status = makeStatus({ user: { _id: 'user-2', username: 'bob', contacts: [] }, privacy: 'only_me' });
    Status.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(status) }) });
    const res = makeRes();
    await statusCtrl.getSharedStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Status hii haijasharewa hadharani');
  });

  it('denies statuses from blocked posters with 403', async () => {
    isEitherUserBlocked.mockResolvedValue(true);
    const status = makeStatus({ user: { _id: 'user-2', username: 'bob', contacts: [] }, privacy: 'contacts' });
    Status.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(status) }) });
    const res = makeRes();
    await statusCtrl.getSharedStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('allows the owner to view their own status (happy path)', async () => {
    const status = makeStatus({ user: { _id: 'user-1', username: 'alice', contacts: [] }, privacy: 'only_me' });
    Status.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(status) }) });
    const res = makeRes();
    await statusCtrl.getSharedStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(200);
  });
});

describe('statusController — view/react/delete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('viewStatus tolerates an invalid id format', async () => {
    const res = makeRes();
    await statusCtrl.viewStatus(makeReq({ params: { id: 'abc' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Invalid status ID format');
  });

  it('viewStatus returns 404 for a missing status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusCtrl.viewStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('viewStatus records a new view (happy path)', async () => {
    const status = makeStatus({ user: 'user-2', userId: 'user-2', views: [] });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusCtrl.viewStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(status.views).toHaveLength(1);
    expect(status.views[0].user).toBe('user-1');
    expect(status.save).toHaveBeenCalled();
  });

  it('viewStatus does not double-count the same viewer', async () => {
    const status = makeStatus({ views: [{ user: 'user-1' }] });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusCtrl.viewStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(status.views).toHaveLength(1);
    expect(status.save).not.toHaveBeenCalled();
  });

  it('reactToStatus replaces the previous reaction (happy path)', async () => {
    const status = makeStatus({ reactions: [{ user: 'user-1', emoji: '😀' }] });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusCtrl.reactToStatus(makeReq({ params: { id: VALID_ID }, body: { emoji: '🔥' } }), res);
    expect(status.reactions).toHaveLength(1);
    expect(status.reactions[0].emoji).toBe('🔥');
    expect(status.save).toHaveBeenCalled();
  });

  it('reactToStatus with no emoji only clears the previous reaction', async () => {
    const status = makeStatus({ reactions: [{ user: 'user-1', emoji: '😀' }] });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusCtrl.reactToStatus(makeReq({ params: { id: VALID_ID }, body: {} }), res);
    expect(status.reactions).toHaveLength(0);
  });

  it('deleteStatus returns 404 for a missing status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusCtrl.deleteStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deleteStatus forbids non-owners (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-9' }));
    const res = makeRes();
    await statusCtrl.deleteStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('deleteStatus deletes the owner status (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusCtrl.deleteStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(status.deleteOne).toHaveBeenCalled();
    expect(res.body.message).toBe('Status imefutwa');
  });

  it('getViewers forbids non-owners (403)', async () => {
    Status.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(makeStatus({ user: 'user-9' })) })
    });
    const res = makeRes();
    await statusCtrl.getViewers(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('getViewers returns views + viewCount (happy path)', async () => {
    const status = makeStatus({ views: [{ user: 'u1' }, { user: 'u2' }], reactions: [{ user: 'u1' }] });
    Status.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(status) })
    });
    const res = makeRes();
    await statusCtrl.getViewers(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.body.views).toHaveLength(2);
    expect(res.body.viewCount).toBe(2);
  });
});

describe('statusController — uploads', () => {
  beforeEach(() => jest.clearAllMocks());

  it('uploadStatusMedia rejects a missing file (validation)', async () => {
    const res = makeRes();
    await statusCtrl.uploadStatusMedia(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No file uploaded');
  });

  it('uploadStatusMedia detects video mimetypes (happy path)', async () => {
    const res = makeRes();
    await statusCtrl.uploadStatusMedia(makeReq({ file: { path: 'https://cdn/x.mp4', mimetype: 'video/mp4' } }), res);
    expect(res.body.mediaType).toBe('video');
    expect(res.body.fileUrl).toBe('https://cdn/x.mp4');
  });

  it('uploadStatusMedia falls back to the /uploads path (happy path)', async () => {
    const res = makeRes();
    await statusCtrl.uploadStatusMedia(makeReq({ file: { filename: 'x.png', mimetype: 'image/png' } }), res);
    expect(res.body.fileUrl).toBe('/uploads/x.png');
    expect(res.body.mediaType).toBe('image');
  });

  it('uploadCollageImages rejects empty uploads (validation)', async () => {
    const res = makeRes();
    await statusCtrl.uploadCollageImages(makeReq(), res);
    expect(res.statusCode).toBe(400);
  });

  it('uploadCollageImages maps all file urls (happy path)', async () => {
    const res = makeRes();
    await statusCtrl.uploadCollageImages(makeReq({
      files: [{ path: '/uploads/a.png' }, { location: 'https://cdn/b.png' }]
    }), res);
    expect(res.body.imageUrls).toEqual(['/uploads/a.png', 'https://cdn/b.png']);
  });
});
