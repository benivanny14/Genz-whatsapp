jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const automationMods = require('../controllers/automationToolsController');

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
  automationModsSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('automationModsController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await automationMods.getAutomationModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ automationModsSettings: { autoReplyEnabled: true } }));
    const res = makeRes();
    await automationMods.getAutomationModsSettings(makeReq(), res);
    expect(res.body.settings.autoReplyEnabled).toBe(true);
    expect(res.body.settings.autoDeleteAfterDays).toBe(30); // default
    expect(res.body.settings.autoArchiveAfterDays).toBe(90); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await automationMods.updateAutomationModsSettings(makeReq({ body: { settings: { welcomeMessageEnabled: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.welcomeMessageEnabled).toBe(true);
  });
});

describe('automationModsController — toggles', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    ['toggleAutoReply', 'autoReplyEnabled'],
    ['toggleAutoReplyAI', 'autoReplyAIEnabled'],
    ['toggleAutoDelete', 'autoDeleteMessages'],
    ['toggleAutoArchive', 'autoArchiveChats'],
    ['toggleAutoMuteGroups', 'autoMuteGroups'],
    ['toggleWelcomeMessage', 'welcomeMessageEnabled'],
    ['toggleGoodbyeMessage', 'goodbyeMessageEnabled']
  ])('%s flips the setting and persists', async (handlerName, field) => {
    const user = makeUser({ automationModsSettings: { [field]: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await automationMods[handlerName](makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body[field]).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('toggleAutoReply mirrors into the canonical auto-reply fields the socket reads', async () => {
    const user = makeUser({
      automationModsSettings: { autoReplyEnabled: false },
      genzMods: { autoReply: { enabled: false, message: 'Busy', keywords: ['hi'] } },
      autoReplyEnabled: false,
      autoReplyMessage: ''
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await automationMods.toggleAutoReply(makeReq(), res);
    expect(res.body.autoReplyEnabled).toBe(true);
    expect(user.automationModsSettings.autoReplyEnabled).toBe(true);
    // The message pipeline reads these canonical fields — they must be in sync.
    expect(user.autoReplyEnabled).toBe(true);
    expect(user.autoReplyMessage).toBe('Busy');
    expect(user.genzMods.autoReply.enabled).toBe(true);
    expect(user.genzMods.autoReply.message).toBe('Busy');
    expect(user.genzMods.autoReply.keywords).toEqual(['hi']);
    expect(user.save).toHaveBeenCalled();
  });

  it('flips a setting back to false when already enabled', async () => {
    const user = makeUser({ automationModsSettings: { autoArchiveChats: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await automationMods.toggleAutoArchive(makeReq(), res);
    expect(res.body.autoArchiveChats).toBe(false);
  });

  it('updates the auto-delete days (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await automationMods.updateAutoDeleteDays(makeReq({ body: { days: 7 } }), res);
    expect(res.body.autoDeleteAfterDays).toBe(7);
    expect(user.save).toHaveBeenCalled();
  });

  it('updates the auto-archive days (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await automationMods.updateAutoArchiveDays(makeReq({ body: { days: 30 } }), res);
    expect(res.body.autoArchiveAfterDays).toBe(30);
  });

  it('updates the welcome message text (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await automationMods.updateWelcomeMessageText(makeReq({ body: { text: 'Karibu!' } }), res);
    expect(res.body.welcomeMessageText).toBe('Karibu!');
  });

  it('updates the goodbye message text (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await automationMods.updateGoodbyeMessageText(makeReq({ body: { text: 'Kwaheri!' } }), res);
    expect(res.body.goodbyeMessageText).toBe('Kwaheri!');
  });
});
