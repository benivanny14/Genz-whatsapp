jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn()
}));

const User = require('../models/User');
const Message = require('../models/Message');
const storyHighlights = require('../controllers/statusToolsController');

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
  storyHighlightsSettings: undefined,
  storyHighlights: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeHighlight = (overrides = {}) => ({
  _id: 'h1',
  title: 'Trip',
  statusIds: [],
  coverImage: null,
  category: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides
});

describe('storyHighlightsController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getStoryHighlightsSettings returns 401 when user cannot be resolved', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await storyHighlights.getStoryHighlightsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('getStoryHighlightsSettings returns defaults merged with stored (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ storyHighlightsSettings: { highlightPrivacy: 'contacts' } }));
    const res = makeRes();
    await storyHighlights.getStoryHighlightsSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.highlightPrivacy).toBe('contacts');
    expect(res.body.settings.storyHighlightsEnabled).toBe(true); // default
    expect(res.body.settings.maxHighlights).toBe(50); // default
    expect(res.body.settings.archiveAfterDays).toBe(30); // default
  });

  it('updateStoryHighlightsSettings merges incoming settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.updateStoryHighlightsSettings(makeReq({ body: { settings: { autoArchive: true } } }), res);
    expect(user.storyHighlightsSettings.autoArchive).toBe(true);
    expect(user.storyHighlightsSettings.allowSharing).toBe(true); // default preserved
    expect(user.markModified).toHaveBeenCalledWith('storyHighlightsSettings');
    expect(user.save).toHaveBeenCalled();
  });

  it('toggleStoryHighlights accepts an explicit flag', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.toggleStoryHighlights(makeReq({ body: { enabled: false } }), res);
    expect(user.storyHighlightsSettings.storyHighlightsEnabled).toBe(false);
  });

  it('toggleStoryHighlights flips the current value when absent', async () => {
    const user = makeUser({ storyHighlightsSettings: { storyHighlightsEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.toggleStoryHighlights(makeReq({ body: {} }), res);
    expect(user.storyHighlightsSettings.storyHighlightsEnabled).toBe(true);
  });

  it('resetStoryHighlightsSettings restores defaults (happy path)', async () => {
    const user = makeUser({ storyHighlightsSettings: { storyHighlightsEnabled: false, maxHighlights: 5 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.resetStoryHighlightsSettings(makeReq(), res);
    expect(user.storyHighlightsSettings.storyHighlightsEnabled).toBe(true);
    expect(user.storyHighlightsSettings.maxHighlights).toBe(50);
    expect(user.markModified).toHaveBeenCalledWith('storyHighlightsSettings');
    expect(user.save).toHaveBeenCalled();
  });
});

describe('storyHighlightsController — highlights CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createStoryHighlight validates title and statusIds (400)', async () => {
    User.findById.mockResolvedValue(makeUser());
    let res = makeRes();
    await storyHighlights.createStoryHighlight(makeReq({ body: { title: 'Trip' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Title and status IDs are required');

    res = makeRes();
    await storyHighlights.createStoryHighlight(makeReq({ body: { statusIds: ['s1'] } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('createStoryHighlight rejects when highlights are disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ storyHighlightsSettings: { storyHighlightsEnabled: false } }));
    const res = makeRes();
    await storyHighlights.createStoryHighlight(makeReq({ body: { title: 'Trip', statusIds: ['s1'] } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Story highlights are disabled');
  });

  it('createStoryHighlight enforces the max limit', async () => {
    const highlights = Array.from({ length: 50 }, (_, i) => makeHighlight({ _id: `h${i}` }));
    User.findById.mockResolvedValue(makeUser({ storyHighlights: highlights }));
    const res = makeRes();
    await storyHighlights.createStoryHighlight(makeReq({ body: { title: 'Trip', statusIds: ['s1'] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Maximum 50 highlights allowed');
  });

  it('createStoryHighlight pushes a new highlight (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.createStoryHighlight(makeReq({
      body: { title: 'Trip', statusIds: ['s1', 's2'], coverImage: 'c.png', category: 'travel' }
    }), res);
    expect(user.storyHighlights).toHaveLength(1);
    expect(user.storyHighlights[0].title).toBe('Trip');
    expect(user.storyHighlights[0].statusIds).toEqual(['s1', 's2']);
    expect(user.storyHighlights[0].coverImage).toBe('c.png');
    expect(user.storyHighlights[0].category).toBe('travel');
    expect(user.markModified).toHaveBeenCalledWith('storyHighlights');
    expect(user.save).toHaveBeenCalled();
    expect(res.body.highlight.title).toBe('Trip');
  });

  it('getStoryHighlights lists highlights (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ storyHighlights: [makeHighlight()] }));
    const res = makeRes();
    await storyHighlights.getStoryHighlights(makeReq(), res);
    expect(res.body.highlights).toHaveLength(1);
  });

  it('getStoryHighlight returns 404 for an unknown id', async () => {
    User.findById.mockResolvedValue(makeUser({ storyHighlights: [makeHighlight()] }));
    const res = makeRes();
    await storyHighlights.getStoryHighlight(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('getStoryHighlight fetches the status messages (happy path)', async () => {
    const highlight = makeHighlight({ statusIds: ['s1', 's2'] });
    User.findById.mockResolvedValue(makeUser({ storyHighlights: [highlight] }));
    Message.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([{ _id: 's1' }, { _id: 's2' }]) });
    const res = makeRes();
    await storyHighlights.getStoryHighlight(makeReq({ params: { id: 'h1' } }), res);
    expect(Message.find).toHaveBeenCalledWith({ _id: { $in: ['s1', 's2'] } });
    expect(res.body.highlight.title).toBe('Trip');
    expect(res.body.statusMessages).toHaveLength(2);
  });

  it('updateStoryHighlight returns 404 for an unknown id', async () => {
    User.findById.mockResolvedValue(makeUser({ storyHighlights: [makeHighlight()] }));
    const res = makeRes();
    await storyHighlights.updateStoryHighlight(makeReq({ params: { id: 'nope' }, body: { title: 'X' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updateStoryHighlight updates fields (happy path)', async () => {
    const user = makeUser({ storyHighlights: [makeHighlight({ title: 'Old' })] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.updateStoryHighlight(makeReq({
      params: { id: 'h1' },
      body: { title: 'New Trip', coverImage: 'new.png', statusIds: ['s9'] }
    }), res);
    expect(user.storyHighlights[0].title).toBe('New Trip');
    expect(user.storyHighlights[0].coverImage).toBe('new.png');
    expect(user.storyHighlights[0].statusIds).toEqual(['s9']);
    expect(user.markModified).toHaveBeenCalledWith('storyHighlights');
    expect(user.save).toHaveBeenCalled();
  });

  it('deleteStoryHighlight returns 404 for an unknown id', async () => {
    User.findById.mockResolvedValue(makeUser({ storyHighlights: [makeHighlight()] }));
    const res = makeRes();
    await storyHighlights.deleteStoryHighlight(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deleteStoryHighlight removes the highlight (happy path)', async () => {
    const user = makeUser({ storyHighlights: [makeHighlight(), makeHighlight({ _id: 'h2' })] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.deleteStoryHighlight(makeReq({ params: { id: 'h1' } }), res);
    expect(user.storyHighlights).toHaveLength(1);
    expect(user.storyHighlights[0]._id).toBe('h2');
    expect(user.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Highlight deleted');
  });
});

describe('storyHighlightsController — add/remove status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('addStatusToHighlight requires a status id (400)', async () => {
    User.findById.mockResolvedValue(makeUser({ storyHighlights: [makeHighlight()] }));
    const res = makeRes();
    await storyHighlights.addStatusToHighlight(makeReq({ params: { highlightId: 'h1' }, body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Status ID is required');
  });

  it('addStatusToHighlight returns 404 for an unknown highlight', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await storyHighlights.addStatusToHighlight(makeReq({ params: { highlightId: 'nope' }, body: { statusId: 's1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('addStatusToHighlight appends the status (happy path)', async () => {
    const user = makeUser({ storyHighlights: [makeHighlight()] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.addStatusToHighlight(makeReq({ params: { highlightId: 'h1' }, body: { statusId: 's1' } }), res);
    expect(user.storyHighlights[0].statusIds).toEqual(['s1']);
    expect(user.markModified).toHaveBeenCalledWith('storyHighlights');
    expect(user.save).toHaveBeenCalled();
  });

  it('addStatusToHighlight skips duplicates', async () => {
    const user = makeUser({ storyHighlights: [makeHighlight({ statusIds: ['s1'] })] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.addStatusToHighlight(makeReq({ params: { highlightId: 'h1' }, body: { statusId: 's1' } }), res);
    expect(user.storyHighlights[0].statusIds).toEqual(['s1']);
  });

  it('removeStatusFromHighlight returns 404 for an unknown highlight', async () => {
    User.findById.mockResolvedValue(makeUser({ storyHighlights: [makeHighlight()] }));
    const res = makeRes();
    await storyHighlights.removeStatusFromHighlight(makeReq({ params: { highlightId: 'nope', statusId: 's1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('removeStatusFromHighlight filters the status out (happy path)', async () => {
    const user = makeUser({ storyHighlights: [makeHighlight({ statusIds: ['s1', 's2'] })] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await storyHighlights.removeStatusFromHighlight(makeReq({ params: { highlightId: 'h1', statusId: 's1' } }), res);
    expect(user.storyHighlights[0].statusIds).toEqual(['s2']);
    expect(user.save).toHaveBeenCalled();
  });
});
