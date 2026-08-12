/**
 * Unit tests for controllers/webrtcController.js — verifies the per-user
 * "Protect IP address in calls" setting forces a relay-only ICE policy.
 */

jest.mock('../config/webrtc', () => ({
  getWebRTCConfig: jest.fn(() => ({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    iceTransportPolicy: 'all',
    iceCandidatePoolSize: 10,
    bundlePolicy: 'balanced',
    rtcpMuxPolicy: 'require'
  })),
  getQualityConfig: jest.fn(() => ({ low: {}, medium: {}, high: {} })),
  validateTurnConfig: jest.fn(() => ({ valid: true, errors: [] }))
}));

const { getConfig } = require('../controllers/webrtcController');

const makeReq = (privacy = {}) => ({
  user: { _id: 'user-1', settings: { privacy } }
});

const makeRes = () => {
  const res = { body: null, statusCode: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  return res;
};

describe('webrtcController.getConfig', () => {
  it('returns the default policy when IP protection is off', () => {
    const res = makeRes();
    getConfig(makeReq({ protectIpAddressInCalls: false }), res);
    expect(res.body.config.iceTransportPolicy).toBe('all');
  });

  it('forces relay-only ICE policy when the user enables IP protection', () => {
    const res = makeRes();
    getConfig(makeReq({ protectIpAddressInCalls: true }), res);
    expect(res.body.config.iceTransportPolicy).toBe('relay');
    expect(res.body.success).toBe(true);
  });

  it('still reports TURN availability and validation', () => {
    const res = makeRes();
    getConfig(makeReq({ protectIpAddressInCalls: true }), res);
    expect(res.body.hasTurn).toBe(false); // STUN-only mock config
    expect(res.body.turnValid).toBe(true);
    expect(res.body.quality).toBeDefined();
  });
});
