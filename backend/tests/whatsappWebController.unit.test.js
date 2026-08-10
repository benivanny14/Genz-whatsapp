jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn()
}));

const User = require('../models/User');
const qrcode = require('qrcode');
const whatsappSession = require('../controllers/whatsappSessionController');
const whatsappWeb = whatsappSession;

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
  whatsappWebSettings: {},
  whatsappWebSessions: [],
  connectedDevices: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('whatsappWebController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await whatsappWeb.getWhatsAppWebSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ whatsappWebSettings: { maxConnectedDevices: 2 } }));
    const res = makeRes();
    await whatsappWeb.getWhatsAppWebSettings(makeReq(), res);
    expect(res.body.settings.maxConnectedDevices).toBe(2);
    expect(res.body.settings.whatsappWebEnabled).toBe(false); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await whatsappWeb.updateWhatsAppWebSettings(makeReq({ body: { settings: { keepLoggedIn: false } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.keepLoggedIn).toBe(false);
  });

  it('toggles WhatsApp Web (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await whatsappWeb.toggleWhatsAppWeb(makeReq({ body: { enabled: true } }), res);
    expect(res.body.settings.whatsappWebEnabled).toBe(true);
  });

  it('updates sync settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await whatsappWeb.updateSyncSettings(makeReq({ body: { syncChats: false, syncContacts: true } }), res);
    expect(res.body.settings.syncChats).toBe(false);
    expect(res.body.settings.syncContacts).toBe(true);
    expect(res.body.settings.syncMedia).toBe(true); // unchanged
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ whatsappWebSettings: { whatsappWebEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await whatsappWeb.resetWhatsAppWebSettings(makeReq(), res);
    expect(res.body.settings.whatsappWebEnabled).toBe(false); // default
  });
});

describe('whatsappWebController — QR & devices', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects QR generation when WhatsApp Web is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await whatsappWeb.generateQRCode(makeReq(), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('WhatsApp Web is disabled');
  });

  it('rejects QR generation when the device limit is reached (400)', async () => {
    User.findById.mockResolvedValue(makeUser({
      whatsappWebSettings: { whatsappWebEnabled: true, maxConnectedDevices: 1 },
      connectedDevices: [{ _id: 'd1' }]
    }));
    const res = makeRes();
    await whatsappWeb.generateQRCode(makeReq(), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Maximum 1 devices allowed');
  });

  it('generates a QR code and stores the session (happy path)', async () => {
    qrcode.toDataURL.mockResolvedValue('data:image/png;base64,xxx');
    const user = makeUser({ whatsappWebSettings: { whatsappWebEnabled: true, qrCodeRefreshInterval: 60 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await whatsappWeb.generateQRCode(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.qrCode).toBe('data:image/png;base64,xxx');
    expect(user.whatsappWebSessions).toHaveLength(1);
    expect(user.whatsappWebSessions[0].status).toBe('pending');
    expect(user.save).toHaveBeenCalled();
  });

  it('reports connection status (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({
      whatsappWebSettings: { whatsappWebEnabled: true },
      whatsappWebSessions: [{ status: 'connected', expiresAt: null }],
      connectedDevices: [{ _id: 'd1' }]
    }));
    const res = makeRes();
    await whatsappWeb.getConnectionStatus(makeReq(), res);
    expect(res.body.connected).toBe(true);
    expect(res.body.connectedDevices).toBe(1);
    expect(res.body.activeSessions).toBe(1);
  });

  it('rejects connectDevice without session/name (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await whatsappWeb.connectDevice(makeReq({ body: { sessionId: 's1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Session ID and device name are required');
  });

  it('rejects connecting a missing session (404)', async () => {
    User.findById.mockResolvedValue(makeUser({ whatsappWebSettings: { whatsappWebEnabled: true } }));
    const res = makeRes();
    await whatsappWeb.connectDevice(makeReq({ body: { sessionId: 'nope', deviceName: 'PC' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Session not found');
  });

  it('rejects connecting an expired session (400)', async () => {
    User.findById.mockResolvedValue(makeUser({
      whatsappWebSettings: { whatsappWebEnabled: true },
      whatsappWebSessions: [{ _id: 's1', status: 'pending', expiresAt: new Date(Date.now() - 1000) }]
    }));
    const res = makeRes();
    await whatsappWeb.connectDevice(makeReq({ body: { sessionId: 's1', deviceName: 'PC' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Session has expired');
  });

  it('connects a device and updates the session (happy path)', async () => {
    const user = makeUser({
      whatsappWebSettings: { whatsappWebEnabled: true },
      whatsappWebSessions: [{ _id: 's1', status: 'pending', expiresAt: null }]
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await whatsappWeb.connectDevice(makeReq({ body: { sessionId: 's1', deviceName: 'PC', deviceType: 'desktop' } }), res);
    expect(res.body.success).toBe(true);
    expect(user.connectedDevices).toHaveLength(1);
    expect(user.whatsappWebSessions[0].status).toBe('connected');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 404 when disconnecting a missing device', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await whatsappWeb.disconnectDevice(makeReq({ params: { deviceId: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('disconnects a device (happy path)', async () => {
    const user = makeUser({
      connectedDevices: [{ _id: 'd1', sessionId: 's1' }],
      whatsappWebSessions: [{ _id: 's1', sessionId: 's1', status: 'connected' }]
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await whatsappWeb.disconnectDevice(makeReq({ params: { deviceId: 'd1' } }), res);
    expect(res.body.success).toBe(true);
    expect(user.connectedDevices).toHaveLength(0);
    expect(user.whatsappWebSessions[0].status).toBe('disconnected');
  });

  it('returns connected devices (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ connectedDevices: [{ _id: 'd1' }] }));
    const res = makeRes();
    await whatsappWeb.getConnectedDevices(makeReq(), res);
    expect(res.body.devices).toHaveLength(1);
  });

  it('logs out from all devices (happy path)', async () => {
    const user = makeUser({
      connectedDevices: [{ _id: 'd1' }],
      whatsappWebSessions: [{ status: 'connected' }]
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await whatsappWeb.logoutAllDevices(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(user.connectedDevices).toEqual([]);
    expect(user.whatsappWebSessions[0].status).toBe('disconnected');
  });
});
