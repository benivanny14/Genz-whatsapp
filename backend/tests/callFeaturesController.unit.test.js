jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/CallLog', () => ({}));

const User = require('../models/User');
const callFeatures = require('../controllers/callFeaturesController');

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

describe('callFeaturesController', () => {
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
