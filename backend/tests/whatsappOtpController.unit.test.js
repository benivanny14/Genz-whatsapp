jest.mock('../services/otpStore', () => ({
  generateOtp: jest.fn(),
  storeOtp: jest.fn(),
  verifyOtp: jest.fn(),
  TTL_MINUTES: 5
}));

jest.mock('../services/otpDeliveryService', () => ({
  deliverOtp: jest.fn()
}));

jest.mock('../services/whatsappOtpService', () => ({
  getStatus: jest.fn(),
  getQrDataUrl: jest.fn(),
  resetClient: jest.fn()
}));

const otpStore = require('../services/otpStore');
const { deliverOtp } = require('../services/otpDeliveryService');
const whatsappOtp = require('../services/whatsappOtpService');
const {
  sendOtp,
  verifyOtp,
  getWhatsAppStatus,
  getWhatsAppQr,
  resetWhatsApp
} = require('../controllers/whatsappOtpController');

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
  ...overrides
});

describe('whatsappOtpController — sendOtp validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a phone number that is too short (validation)', async () => {
    const res = makeRes();
    await sendOtp(makeReq({ body: { phoneNumber: '123' } }), res);
    expect(res.statusCode).toBe(400);
    expect(otpStore.generateOtp).not.toHaveBeenCalled();
  });

  it('stores the OTP and echoes devOtp when delivery fails (dev)', async () => {
    otpStore.generateOtp.mockReturnValue('123456');
    deliverOtp.mockResolvedValue({
      delivered: 'none',
      error: { message: 'WhatsApp client is not ready — scan the QR' }
    });
    const res = makeRes();
    await sendOtp(makeReq({ body: { phoneNumber: '255712345678' } }), res);

    expect(otpStore.storeOtp).toHaveBeenCalledWith('255712345678', '123456');
    expect(otpStore.clearOtp).toBeUndefined(); // must NOT clear before verification
    expect(res.body.devOtp).toBe('123456');
  });
});

describe('whatsappOtpController — verifyOtp', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing phone number (validation)', async () => {
    const res = makeRes();
    await verifyOtp(makeReq({ body: { otp: '123456' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Phone number is required');
  });

  it('rejects a missing OTP (validation)', async () => {
    const res = makeRes();
    await verifyOtp(makeReq({ body: { phoneNumber: '255712345678' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('OTP is required');
  });

  it('rejects an invalid OTP with a clear message', async () => {
    otpStore.verifyOtp.mockReturnValue({ success: false, reason: 'invalid' });
    const res = makeRes();
    await verifyOtp(makeReq({ body: { phoneNumber: '255712345678', otp: '000000' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid OTP');
  });

  it('returns 400 with an expiry message for an expired OTP', async () => {
    otpStore.verifyOtp.mockReturnValue({ success: false, reason: 'expired' });
    const res = makeRes();
    await verifyOtp(makeReq({ body: { phoneNumber: '255712345678', otp: '123456' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it('verifies a valid OTP (happy path)', async () => {
    otpStore.verifyOtp.mockReturnValue({ success: true });
    const res = makeRes();
    await verifyOtp(makeReq({ body: { phoneNumber: '255712345678', otp: '123456' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('whatsappOtpController — status / QR / reset', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reports WhatsApp client status (happy path)', async () => {
    whatsappOtp.getStatus.mockReturnValue({ clientReady: true, linkedPhone: '255712345678' });
    const res = makeRes();
    await getWhatsAppStatus(makeReq(), res);
    expect(res.body.status.clientReady).toBe(true);
  });

  it('returns the QR data URL when available (happy path)', async () => {
    whatsappOtp.getQrDataUrl.mockResolvedValue('data:image/png;base64,AAAA');
    whatsappOtp.getStatus.mockReturnValue({ clientReady: false });
    const res = makeRes();
    await getWhatsAppQr(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.qr).toMatch(/^data:image\/png/);
  });

  it('resets the WhatsApp client (happy path)', async () => {
    whatsappOtp.resetClient.mockResolvedValue({ clientReady: false });
    const res = makeRes();
    await resetWhatsApp(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/reset/i);
  });
});
