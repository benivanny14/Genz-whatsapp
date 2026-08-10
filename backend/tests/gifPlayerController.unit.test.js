jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const gifPlayer = require('../controllers/gifPlayerController');

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
  gifPlayerSettings: {},
  savedGIFs: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('gifPlayerController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await gifPlayer.getGIFPlayerSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ gifPlayerSettings: { gifQuality: 'low' } }));
    const res = makeRes();
    await gifPlayer.getGIFPlayerSettings(makeReq(), res);
    expect(res.body.settings.gifQuality).toBe('low');
    expect(res.body.settings.gifPlayerEnabled).toBe(true); // default
    expect(res.body.settings.gifPlaybackSpeed).toBe(1.0); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await gifPlayer.updateGIFPlayerSettings(makeReq({ body: { settings: { loopGIFs: false } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.loopGIFs).toBe(false);
  });

  it('toggles the player (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await gifPlayer.toggleGIFPlayer(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.gifPlayerEnabled).toBe(false);
  });

  it('toggles auto-play (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await gifPlayer.toggleAutoPlayGIFs(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.autoPlayGIFs).toBe(false);
  });

  it('rejects an invalid quality level (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await gifPlayer.updateGIFQuality(makeReq({ body: { quality: 'ultra' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid quality level');
  });

  it('updates GIF quality (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await gifPlayer.updateGIFQuality(makeReq({ body: { quality: 'high' } }), res);
    expect(res.body.settings.gifQuality).toBe('high');
  });

  it('rejects an out-of-range playback speed (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await gifPlayer.updateGIFPlaybackSpeed(makeReq({ body: { speed: 3 } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('updates playback speed (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await gifPlayer.updateGIFPlaybackSpeed(makeReq({ body: { speed: 1.5 } }), res);
    expect(res.body.settings.gifPlaybackSpeed).toBe(1.5);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ gifPlayerSettings: { gifQuality: 'low' } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await gifPlayer.resetGIFPlayerSettings(makeReq(), res);
    expect(res.body.settings.gifQuality).toBe('high'); // default
  });
});

describe('gifPlayerController — saved GIFs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns saved GIFs (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ savedGIFs: [{ _id: 'g1' }] }));
    const res = makeRes();
    await gifPlayer.getSavedGIFs(makeReq(), res);
    expect(res.body.savedGIFs).toHaveLength(1);
  });

  it('rejects saving without a GIF URL (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await gifPlayer.saveGIF(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('GIF URL is required');
  });

  it('rejects saving when GIF saving is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ gifPlayerSettings: { saveGIFs: false } }));
    const res = makeRes();
    await gifPlayer.saveGIF(makeReq({ body: { gifUrl: 'https://x/g.gif' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('saves a GIF (happy path)', async () => {
    const user = makeUser({ gifPlayerSettings: { saveGIFs: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await gifPlayer.saveGIF(makeReq({ body: { gifUrl: 'https://x/g.gif', name: 'Dance' } }), res);
    expect(res.body.success).toBe(true);
    expect(user.savedGIFs).toHaveLength(1);
    expect(user.savedGIFs[0].name).toBe('Dance');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 404 when deleting a missing GIF', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await gifPlayer.deleteSavedGIF(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes a saved GIF (happy path)', async () => {
    const user = makeUser({ savedGIFs: [{ _id: 'g1' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await gifPlayer.deleteSavedGIF(makeReq({ params: { id: 'g1' } }), res);
    expect(res.body.success).toBe(true);
    expect(user.savedGIFs).toHaveLength(0);
    expect(user.save).toHaveBeenCalled();
  });
});
