// Phone-verification OTP flow regression guard (register → verify-phone-otp).
//
// Covers the DB-backed path: registration stores the OTP on the user record
// and (in dev/test) echoes it as phoneVerificationOTP in the response; the
// verify-phone-otp endpoint must accept that exact code, flip the user to
// phoneVerified=true and consume the code. Guards against regressions like
// the code being wiped before it can be used, verification never persisting,
// or a consumed code remaining reusable.

const request = require('supertest');
const { app } = require('../server');
const User = require('../models/User');

const PASSWORD = 'Password123!';

const register = async (username, phoneNumber) =>
  request(app)
    .post('/api/auth/register')
    .send({ username, phoneNumber, password: PASSWORD });

const verify = (token, phoneNumber, otp) =>
  request(app)
    .post('/api/auth/verify-phone-otp')
    .set('Authorization', `Bearer ${token}`)
    .send({ phoneNumber, otp });

describe('Phone verification OTP flow (register → verify-phone-otp)', () => {
  it('verifies the phone with the OTP echoed at registration', async () => {
    const phoneNumber = '255700000010';
    const reg = await register('verify_user_a', phoneNumber);

    expect(reg.statusCode).toBe(201);
    expect(reg.body.success).toBe(true);
    expect(reg.body.requiresPhoneVerification).toBe(true);
    expect(reg.body.phoneVerified).toBe(false);
    // Dev/test builds must echo the OTP so the flow is testable without a
    // real WhatsApp send — and it must actually work.
    expect(reg.body.phoneVerificationOTP).toMatch(/^\d{6}$/);

    const verified = await verify(reg.body.token, phoneNumber, reg.body.phoneVerificationOTP);
    expect(verified.statusCode).toBe(200);
    expect(verified.body.success).toBe(true);
    expect(verified.body.message).toMatch(/verified/i);

    const user = await User.findOne({ phoneNumber });
    expect(user.phoneVerified).toBe(true);
    expect(user.phoneVerificationOTP).toBeNull();
    expect(user.phoneVerificationOTPExpiry).toBeNull();
  });

  it('rejects a wrong OTP and leaves the phone unverified', async () => {
    const phoneNumber = '255700000011';
    const reg = await register('verify_user_b', phoneNumber);

    const bad = await verify(reg.body.token, phoneNumber, '000000');
    expect(bad.statusCode).toBe(400);
    expect(bad.body.success).toBe(false);

    const user = await User.findOne({ phoneNumber });
    expect(user.phoneVerified).toBe(false);
    expect(user.phoneVerificationOTP).not.toBeNull();
  });

  it('consumes the OTP — it cannot be reused after a successful verify', async () => {
    const phoneNumber = '255700000012';
    const reg = await register('verify_user_c', phoneNumber);

    const first = await verify(reg.body.token, phoneNumber, reg.body.phoneVerificationOTP);
    expect(first.body.success).toBe(true);

    const second = await verify(reg.body.token, phoneNumber, reg.body.phoneVerificationOTP);
    expect(second.statusCode).toBe(400);
    expect(second.body.success).toBe(false);
  });

  it('rejects a phone number that does not match the session', async () => {
    const phoneA = '255700000013';
    const phoneB = '255700000014';
    await register('verify_user_d', phoneA);
    const regB = await register('verify_user_e', phoneB);

    // Submit user A's OTP against user B's phone → the submitted phone
    // resolves to a different user than the token session.
    const mismatch = await verify(regB.body.token, phoneA, regB.body.phoneVerificationOTP);
    expect(mismatch.statusCode).toBe(403);
  });
});
