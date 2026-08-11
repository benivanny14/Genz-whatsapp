// OTP flow regression guard (send-otp → verify-otp).
//
// Regression: sendOtp used to call otpStore.clearOtp() whenever WhatsApp
// delivery failed, wiping the freshly generated code BEFORE the caller could
// verify it. In dev/test the code is echoed as devOtp in that same response,
// so verify-otp always answered "OTP has expired" for the code it just
// handed out. The code must stay stored on delivery failure (same as the
// registration flow): the TTL, one-time use and max-attempts already protect
// it, and the echoed code has to remain verifiable.
//
// WHATSAPP_OTP_ENABLED is forced to 'true' here so delivery is *attempted*
// and fails (NODE_ENV=test short-circuits the WhatsApp client), which is
// exactly the scenario that used to break. This must be set before the
// server module is required so dotenv cannot override it.
process.env.WHATSAPP_OTP_ENABLED = 'true';

const request = require('supertest');
const { app } = require('../server');

// Unique per test + per run so the shared in-memory OTP store never collides
// between tests (and with the other test files running in the same process).
const phoneFor = (n) => `2557${String(Date.now()).slice(-6)}${n}`;

describe('WhatsApp OTP flow (send-otp / verify-otp)', () => {
  it('echoes a devOtp that stays verifiable even when delivery fails', async () => {
    const phoneNumber = phoneFor(1);

    // Delivery is attempted but fails (test environment) → non-2xx response,
    // but dev/test builds must still echo the code in the same response.
    const sent = await request(app)
      .post('/api/auth/send-otp')
      .send({ phoneNumber });

    expect(sent.body.devOtp).toMatch(/^\d{6}$/);

    const verified = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber, otp: sent.body.devOtp });

    expect(verified.statusCode).toBe(200);
    expect(verified.body.success).toBe(true);
    expect(verified.body.message).toMatch(/verified/i);
  });

  it('rejects a wrong OTP', async () => {
    const phoneNumber = phoneFor(2);
    await request(app)
      .post('/api/auth/send-otp')
      .send({ phoneNumber });

    const bad = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber, otp: '000000' });

    expect(bad.statusCode).toBe(400);
    expect(bad.body.success).toBe(false);
  });

  it('is one-time use — a consumed OTP cannot be reused', async () => {
    const phoneNumber = phoneFor(3);
    const sent = await request(app)
      .post('/api/auth/send-otp')
      .send({ phoneNumber });

    const first = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber, otp: sent.body.devOtp });
    expect(first.body.success).toBe(true);

    const second = await request(app)
      .post('/api/auth/verify-otp')
      .send({ phoneNumber, otp: sent.body.devOtp });
    expect(second.body.success).toBe(false);
  });
});
