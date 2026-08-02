process.env.SMTP_HOST = '';
process.env.SMTP_PORT = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');

jest.setTimeout(30000);

const registerUser = async (username, phone) => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      username,
      phoneNumber: phone,
      password: 'Password123!'
    });
  expect(res.statusCode).toBe(201);
  return { token: res.body.token, user: res.body.user };
};

describe('Email verification API', () => {
  let user;

  beforeEach(async () => {
    user = await registerUser('emailuser', '255700000301');
  });

  describe('GET /api/security/email/status', () => {
    it('should return 401 without a token', async () => {
      const res = await request(app).get('/api/security/email/status');
      expect(res.statusCode).toBe(401);
    });

    it('should return emailVerified false and empty email by default', async () => {
      const res = await request(app)
        .get('/api/security/email/status')
        .set('Authorization', `Bearer ${user.token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.verified).toBe(false);
    });
  });

  describe('POST /api/security/email/send-verification', () => {
    it('should store a verification token and return success', async () => {
      const res = await request(app)
        .post('/api/security/email/send-verification')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ email: 'emailuser@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const dbUser = await User.findById(user.user._id);
      expect(dbUser.email).toBe('emailuser@example.com');
      expect(dbUser.emailVerified).toBe(false);
      expect(dbUser.emailVerificationToken).toBeTruthy();
      expect(dbUser.emailVerificationExpiresAt).toBeTruthy();
    });
  });

  describe('POST /api/security/email/verify', () => {
    it('should reject an invalid token', async () => {
      const res = await request(app)
        .post('/api/security/email/verify')
        .send({ token: 'not-a-real-token' });
      expect(res.statusCode).toBe(400);
    });

    it('should verify the email with a valid token', async () => {
      const sendRes = await request(app)
        .post('/api/security/email/send-verification')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ email: 'emailuser@example.com' });
      expect(sendRes.statusCode).toBe(200);
      expect(sendRes.body.token).toBeTruthy();

      const verifyRes = await request(app)
        .post('/api/security/email/verify')
        .send({ token: sendRes.body.token });
      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      const updated = await User.findById(user.user._id);
      expect(updated.emailVerified).toBe(true);
      expect(updated.emailVerificationToken).toBeNull();
    });
  });
});
