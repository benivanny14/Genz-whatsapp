const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');
const PrivacyAllowedContact = require('../models/PrivacyAllowedContact');

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
  return { token: res.body.token, user: res.body.user, otp: res.body.phoneVerificationOTP, phoneNumber: res.body.user.phoneNumber };
};

const verifyPhone = async ({ token, otp, phoneNumber }) => {
  expect(otp).toBeTruthy();
  const res = await request(app)
    .post('/api/auth/verify-phone-otp')
    .set('Authorization', `Bearer ${token}`)
    .send({ phoneNumber, otp });
    expect(res.statusCode).toBe(200);
  return res.body;
};

describe('Settings API audit', () => {
  let alice, bob;

  beforeEach(async () => {
    alice = await registerUser('alice', '255700000201');
    await verifyPhone(alice);
    bob = await registerUser('bob', '255700000202');
    await verifyPhone(bob);
  });

  describe('GET /api/settings', () => {
    it('should return default settings for a fresh user', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.privacy.lastSeen).toBe('everyone');
      expect(res.body.settings.privacy.status).toBe('contacts');
      expect(res.body.settings.app.language).toBe('system');
      expect(res.body.settings.chats.theme).toBe('system');
    });

    it('should return 401 without a token', async () => {
      const res = await request(app).get('/api/settings');
      expect(res.statusCode).toBe(401);
    });

    it('should return 401 for a deleted user (token invalidated)', async () => {
      const user = await User.findByIdAndDelete(alice.user._id);
      expect(user).not.toBeNull();
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${alice.token}`);
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/settings', () => {
    it('should persist a partial nested update', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ privacy: { lastSeen: 'nobody' } });

      expect(res.statusCode).toBe(200);
      expect(res.body.settings.privacy.lastSeen).toBe('nobody');
      expect(res.body.settings.privacy.online).toBe('same_as_last_seen');

      const persisted = await User.findById(alice.user._id);
      expect(persisted.settings.privacy.lastSeen).toBe('nobody');
    });

    it('should merge without wiping untouched top-level sections', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ notifications: { messages: false } });

      expect(res.body.settings.privacy.lastSeen).toBe('everyone');
      expect(res.body.settings.chats.theme).toBe('system');
      expect(res.body.settings.notifications.messages).toBe(false);
      expect(res.body.settings.notifications.groups).toBe(true);
    });

    it('should reject unknown/invalid keys and fall back options', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          hacker: 'x',
          privacy: { lastSeen: 'spies', hacked: true },
          app: { language: 'nope' }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.settings.hacker).toBeUndefined();
      expect(res.body.settings.privacy.hacked).toBeUndefined();
      expect(res.body.settings.privacy.lastSeen).toBe('everyone');
      expect(res.body.settings.app.language).toBe('system');
    });

    it('should protect against prototype pollution', async () => {
      const payload = JSON.parse('{"__proto__":{"polluted":true}}');
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send(payload);

      expect(res.statusCode).toBe(200);
      expect(res.body.settings.polluted).toBeUndefined();
      expect({}.polluted).toBeUndefined();
    });
  });

  describe('POST /api/settings/reset', () => {
    it('should reset modified settings back to defaults', async () => {
      await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          privacy: { lastSeen: 'nobody' },
          chats: { theme: 'dark' },
          notifications: { messages: false }
        });

      const res = await request(app)
        .post('/api/settings/reset')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.settings.privacy.lastSeen).toBe('everyone');
      expect(res.body.settings.chats.theme).toBe('system');
      expect(res.body.settings.notifications.messages).toBe(true);

      const persisted = await User.findById(alice.user._id);
      expect(persisted.settings.privacy.lastSeen).toBe('everyone');
    });

    it('should require a token', async () => {
      const res = await request(app).post('/api/settings/reset');
      expect(res.statusCode).toBe(401);
    });
  });

  describe('PUT /api/auth/settings (legacy auth route)', () => {
    it('should merge and persist settings', async () => {
      const res = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          settings: {
            privacy: { lastSeen: 'contacts' }
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.settings.privacy.lastSeen).toBe('contacts');

      const persisted = await User.findById(alice.user._id);
      expect(persisted.settings.privacy.lastSeen).toBe('contacts');
    });

    it('should record requestAccountInfoAt when requested', async () => {
      const res = await request(app)
        .put('/api/auth/settings')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ settings: { account: { requestAccountInfoAt: new Date().toISOString() } } });

      expect(res.statusCode).toBe(200);
      expect(res.body.settings.account.requestAccountInfoAt).toBeTruthy();
    });
  });

  describe('GET /api/auth/settings (legacy auth route)', () => {
    it('should return normalized settings', async () => {
      const res = await request(app)
        .get('/api/auth/settings')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.settings.privacy.lastSeen).toBe('everyone');
    });
  });

  describe('Profile update (PUT /api/auth/profile)', () => {
    it('should update allowed fields only', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          username: 'alice2',
          about: 'hello there',
          role: 'admin',
          isAdmin: true,
          passwordHash: 'hacked'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.username).toBe('alice2');
      expect(res.body.user.about).toBe('hello there');

      const persisted = await User.findById(alice.user._id);
      expect(persisted.role).toBe('user');
      expect(persisted.isAdmin).toBe(false);
      expect(persisted.passwordHash).not.toBe('hacked');
    });

    it('should sync bio and about', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ bio: 'my bio' });

      expect(res.body.user.bio).toBe('my bio');
      expect(res.body.user.about).toBe('my bio');
    });

    it('should reject duplicate phone number', async () => {
      const res = await request(app)
        .post('/api/auth/change-number')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ newPhoneNumber: '255700000202' });

      expect(res.statusCode).toBe(400);
    });

    it('should change phone number successfully with OTP verification', async () => {
      const newNumber = '255700000299';
      // Step 1 — request OTP on the new number
      const reqRes = await request(app)
        .post('/api/auth/change-number')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ newPhoneNumber: newNumber });

      expect(reqRes.statusCode).toBe(200);
      expect(reqRes.body.requiresOtp).toBe(true);
      const otp = reqRes.body.otp; // exposed only in non-production for dev/test

      // Step 2 — verify OTP before the number is persisted
      const res = await request(app)
        .post('/api/auth/change-number')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ newPhoneNumber: newNumber, verifyOtp: otp });

      expect(res.statusCode).toBe(200);
      const persisted = await User.findById(alice.user._id);
      expect(persisted.phoneNumber).toBe(newNumber);
    });

    it('should delete the account', async () => {
      const res = await request(app)
        .post('/api/auth/delete-account')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      const user = await User.findById(alice.user._id);
      expect(user).toBeNull();
    });
  });

  describe('Privacy contact lists (excluded / allowed)', () => {
    it('should bulk-add excluded contacts and list them', async () => {
      const res = await request(app)
        .post('/api/privacy/excluded/bulk')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          privacyType: 'last_seen',
          contacts: [{ id: bob.user._id, name: 'Bob', phone: '255700000202' }]
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.excludedContacts.length).toBe(1);
      expect(String(res.body.excludedContacts[0].excludedContactId)).toBe(String(bob.user._id));

      const list = await request(app)
        .get('/api/privacy/excluded/last_seen')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(list.statusCode).toBe(200);
      expect(list.body.excludedContacts.length).toBe(1);
    });

    it('should bulk-add allowed contacts and list them', async () => {
      const res = await request(app)
        .post('/api/privacy/allowed/bulk')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          privacyType: 'status',
          contacts: [{ id: bob.user._id, name: 'Bob', phone: '255700000202' }]
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.allowedContacts.length).toBe(1);

      const list = await request(app)
        .get('/api/privacy/allowed/status')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(list.body.allowedContacts.length).toBe(1);
    });

    it('should clear excluded contacts for a privacy type', async () => {
      await request(app)
        .post('/api/privacy/excluded/bulk')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          privacyType: 'about',
          contacts: [{ id: bob.user._id, name: 'Bob', phone: '255700000202' }]
        });

      const res = await request(app)
        .delete('/api/privacy/excluded/type/about')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      const remaining = await PrivacyExcludedContact.countDocuments({
        ownerUserId: alice.user._id,
        privacyType: 'about'
      });
      expect(remaining).toBe(0);
    });

    it('should reject bulk-add without a valid body', async () => {
      const res = await request(app)
        .post('/api/privacy/excluded/bulk')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ privacyType: 'last_seen', contacts: [] });

      expect(res.statusCode).toBe(400);
    });

    it('should keep alice and bob lists isolated', async () => {
      await request(app)
        .post('/api/privacy/excluded/bulk')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({
          privacyType: 'last_seen',
          contacts: [{ id: bob.user._id, name: 'Bob', phone: '255700000202' }]
        });

      const bobList = await request(app)
        .get('/api/privacy/excluded/last_seen')
        .set('Authorization', `Bearer ${bob.token}`);

      expect(bobList.body.excludedContacts.length).toBe(0);
    });
  describe('Phone verification (verify/resend OTP)', () => {
    it('should verify a phone number with the valid OTP', async () => {
      const fresh = await registerUser('verify1', '255700000203');
      expect(fresh.otp).toBeTruthy();
      const res = await request(app)
        .post('/api/auth/verify-phone-otp')
        .set('Authorization', `Bearer ${fresh.token}`)
        .send({ phoneNumber: '255700000203', otp: fresh.otp });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const persisted = await User.findById(fresh.user._id);
      expect(persisted.phoneVerified).toBe(true);
      expect(persisted.phoneVerificationOTP).toBeNull();
    });

    it('should reject an invalid OTP', async () => {
      const fresh = await registerUser('verify2', '255700000204');
      const res = await request(app)
        .post('/api/auth/verify-phone-otp')
        .set('Authorization', `Bearer ${fresh.token}`)
        .send({ phoneNumber: '255700000204', otp: '000000' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);

      const persisted = await User.findById(fresh.user._id);
      expect(persisted.phoneVerified).toBe(false);
    });

    it('should reject OTP verification for another session phone', async () => {
      const res = await request(app)
        .post('/api/auth/verify-phone-otp')
        .set('Authorization', `Bearer ${alice.token}`)
        .send({ phoneNumber: '255700000202', otp: bob.otp });

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should require a token', async () => {
      const res = await request(app)
        .post('/api/auth/verify-phone-otp')
        .send({ phoneNumber: '255700000201', otp: '123456' });

      expect(res.statusCode).toBe(401);
    });

    it('should resend a new OTP and verify with it', async () => {
      const fresh = await registerUser('verify3', '255700000205');
      const resend = await request(app)
        .post('/api/auth/resend-phone-otp')
        .set('Authorization', `Bearer ${fresh.token}`)
        .send({ phoneNumber: '255700000205' });

      expect(resend.statusCode).toBe(200);
      expect(resend.body.otp).toBeTruthy();
      expect(resend.body.otp).not.toBe(fresh.otp);

      const res = await request(app)
        .post('/api/auth/verify-phone-otp')
        .set('Authorization', `Bearer ${fresh.token}`)
        .send({ phoneNumber: '255700000205', otp: resend.body.otp });

      expect(res.statusCode).toBe(200);
      const persisted = await User.findById(fresh.user._id);
      expect(persisted.phoneVerified).toBe(true);
    });
  });
});
});
