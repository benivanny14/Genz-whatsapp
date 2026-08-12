jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/CallLog', () => ({}));

const User = require('../models/User');
const callTools = require('../controllers/callToolsController');
const callFeatures = callTools;

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
  callFeaturesSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('callToolsController (call features)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await callFeatures.getCallFeaturesSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ callFeaturesSettings: { callRecording: true } }));
    const res = makeRes();
    await callFeatures.getCallFeaturesSettings(makeReq(), res);
    expect(res.body.settings.callRecording).toBe(true);
    expect(res.body.settings.callTimeout).toBe(60); // default
    expect(res.body.settings.maxCallDuration).toBe(3600); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.updateCallFeaturesSettings(makeReq({ body: { settings: { callTransfer: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.callTransfer).toBe(true);
  });

  it('toggles call recording with mode flags (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.toggleCallRecording(makeReq({ body: { enabled: true, audioOnly: true } }), res);
    expect(res.body.settings.callRecording).toBe(true);
    expect(res.body.settings.recordAudioOnly).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('toggles a generic feature (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.toggleCallWaiting(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.callWaiting).toBe(false);
  });

  it('toggles hide call button (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.toggleHideCallButton(makeReq({ body: { enabled: true } }), res);
    expect(res.body.settings.hideCallButton).toBe(true);
  });

  it('updates call timeout (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.updateCallTimeout(makeReq({ body: { timeout: 30 } }), res);
    expect(res.body.settings.callTimeout).toBe(30);
  });

  it('updates max call duration (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.updateMaxCallDuration(makeReq({ body: { duration: 7200 } }), res);
    expect(res.body.settings.maxCallDuration).toBe(7200);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ callFeaturesSettings: { callRecording: true, callTimeout: 10 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.resetCallFeaturesSettings(makeReq(), res);
    expect(res.body.settings.callRecording).toBe(false); // default
    expect(res.body.settings.callTimeout).toBe(60); // default
  });
});

describe('callToolsController (call features) — remaining toggles', () => {
  beforeEach(() => jest.clearAllMocks());

  const TOGGLES = [
    ['toggleCallHold', 'callHold'],
    ['toggleCallTransfer', 'callTransfer'],
    ['toggleCallScreenShare', 'callScreenShare'],
    ['toggleCallVideoToggle', 'callVideoToggle'],
    ['toggleCallMute', 'callMute'],
    ['toggleCallFeaturesBlocker', 'callBlocker'],
    ['toggleCallHistory', 'callHistory'],
    ['toggleCallLink', 'callLink'],
    ['toggleDNDModeForCalls', 'dndModeForCalls'],
    ['toggleDisableVoiceCalls', 'disableVoiceCalls'],
    ['toggleDisableVideoCalls', 'disableVideoCalls']
  ];

  it.each(TOGGLES)('%s honors an explicit { enabled } and saves (happy path)', async (handlerName, field) => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures[handlerName](makeReq({ body: { enabled: true } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.settings[field]).toBe(true);
    expect(user.markModified).toHaveBeenCalledWith('callFeaturesSettings');
    expect(user.save).toHaveBeenCalled();
  });

  it.each(TOGGLES)('%s toggles off when no body value is given', async (handlerName, field) => {
    const user = makeUser({ callFeaturesSettings: { [field]: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures[handlerName](makeReq(), res);
    expect(res.body.settings[field]).toBe(false);
  });

  it.each(TOGGLES)('%s returns 401 when the user cannot be resolved (auth)', async (handlerName) => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await callFeatures[handlerName](makeReq({ body: { enabled: true } }), res);
    expect(res.statusCode).toBe(401);
  });

  it.each(TOGGLES)('%s returns 500 when saving fails (error)', async (handlerName) => {
    const user = makeUser();
    user.save.mockRejectedValue(new Error('db down'));
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures[handlerName](makeReq({ body: { enabled: true } }), res);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('db down');
  });

  it('toggleCallRecording keeps mode flags when not provided', async () => {
    const user = makeUser({ callFeaturesSettings: { callRecording: false, recordAudioOnly: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.toggleCallRecording(makeReq({ body: { enabled: true } }), res);
    expect(res.body.settings.recordAudioOnly).toBe(true);
  });

  it('toggleCallRecording returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await callFeatures.toggleCallRecording(makeReq({ body: { enabled: true } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('updateCallTimeout keeps the existing value when timeout is missing', async () => {
    const user = makeUser({ callFeaturesSettings: { callTimeout: 45 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.updateCallTimeout(makeReq({ body: {} }), res);
    expect(res.body.settings.callTimeout).toBe(45);
  });

  it('updateMaxCallDuration keeps the existing value when duration is missing', async () => {
    const user = makeUser({ callFeaturesSettings: { maxCallDuration: 1200 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await callFeatures.updateMaxCallDuration(makeReq({ body: {} }), res);
    expect(res.body.settings.maxCallDuration).toBe(1200);
  });

  it('getCallFeaturesSettings returns 500 when the DB read fails (error)', async () => {
    User.findById.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await callFeatures.getCallFeaturesSettings(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });
});
