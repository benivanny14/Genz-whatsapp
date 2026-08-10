jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

const User = require('../models/User');
const sticker = require('../controllers/stickerController');

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

describe('stickerController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists sticker packs without a user (happy path)', async () => {
    const res = makeRes();
    await sticker.getPacks(makeReq({ user: null }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.packs.length).toBeGreaterThan(0);
    expect(res.body.packs[0].stickers.length).toBeGreaterThan(0);
  });

  it('marks packs as downloaded for the current user (happy path)', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ downloadedStickerPackIds: ['genz-classics'] }) })
    });
    const res = makeRes();
    await sticker.getPacks(makeReq(), res);
    const classics = res.body.packs.find((p) => p.id === 'genz-classics');
    expect(classics.isDownloaded).toBe(true);
  });

  it('returns 401 for downloadPack without a user (auth)', async () => {
    const res = makeRes();
    await sticker.downloadPack(makeReq({ user: null, params: { packId: 'genz-classics' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 404 for an unknown sticker pack', async () => {
    const res = makeRes();
    await sticker.downloadPack(makeReq({ params: { packId: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Sticker pack not found');
  });

  it('downloads a sticker pack (happy path)', async () => {
    User.findByIdAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await sticker.downloadPack(makeReq({ params: { packId: 'genz-classics' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.pack.id).toBe('genz-classics');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { $addToSet: { downloadedStickerPackIds: 'genz-classics' } });
  });

  it('removes a sticker pack (happy path)', async () => {
    User.findByIdAndUpdate.mockResolvedValue({});
    const res = makeRes();
    await sticker.removePack(makeReq({ params: { packId: 'genz-classics' } }), res);
    expect(res.body.success).toBe(true);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', { $pull: { downloadedStickerPackIds: 'genz-classics' } });
  });

  it('returns 401 for toggleFavorite without a user (auth)', async () => {
    const res = makeRes();
    await sticker.toggleFavorite(makeReq({ user: null, params: { stickerId: 'x' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('adds a favorite sticker (happy path)', async () => {
    const user = { favoriteStickers: [], save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const res = makeRes();
    await sticker.toggleFavorite(makeReq({ params: { stickerId: 's1' }, body: { url: 'https://x/s.png' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.isFavorited).toBe(true);
    expect(res.body.favorites).toEqual(['https://x/s.png']);
    expect(user.save).toHaveBeenCalled();
  });

  it('removes a favorite sticker (happy path)', async () => {
    const user = { favoriteStickers: ['https://x/s.png'], save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const res = makeRes();
    await sticker.toggleFavorite(makeReq({ params: { stickerId: 's1' }, body: { url: 'https://x/s.png' } }), res);
    expect(res.body.isFavorited).toBe(false);
    expect(res.body.favorites).toEqual([]);
  });

  it('returns the user\'s sticker state (happy path)', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ downloadedStickerPackIds: ['genz-classics'], favoriteStickers: ['https://x/s.png'] }) })
    });
    const res = makeRes();
    await sticker.getMyStickers(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.downloadedPackIds).toEqual(['genz-classics']);
    expect(res.body.downloadedStickers.length).toBeGreaterThan(0);
    expect(res.body.favoriteStickers).toEqual(['https://x/s.png']);
  });

  it('returns 401 for getMyStickers without a user (auth)', async () => {
    const res = makeRes();
    await sticker.getMyStickers(makeReq({ user: null }), res);
    expect(res.statusCode).toBe(401);
  });
});
