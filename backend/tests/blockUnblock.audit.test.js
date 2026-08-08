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

describe('Block/Unblock (WhatsApp semantics)', () => {
  let alice, bob;

  beforeEach(async () => {
    alice = await registerUser('alice', '255700000101');
    await verifyPhone(alice);
    bob = await registerUser('bob', '255700000102');
    await verifyPhone(bob);
  });

  describe('POST /api/chat/users/:id/block', () => {
    it('should block a user', async () => {
      const res = await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const aliceUser = await User.findById(alice.user._id);
      expect(aliceUser.blockedUsers.some(id => String(id) === String(bob.user._id))).toBe(true);
    });

    it('should be idempotent (blocking twice)', async () => {
      await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      const res = await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      const aliceUser = await User.findById(alice.user._id);
      const count = aliceUser.blockedUsers.filter(id => String(id) === String(bob.user._id)).length;
      expect(count).toBe(1);
    });

    it('should reject blocking self', async () => {
      const res = await request(app)
        .post(`/api/chat/users/${alice.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject blocking a non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/chat/users/${fakeId}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/chat/users/:id/block', () => {
    it('should unblock a user (no cooldown)', async () => {
      await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      const res = await request(app)
        .delete(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);

      const aliceUser = await User.findById(alice.user._id);
      expect(aliceUser.blockedUsers.some(id => String(id) === String(bob.user._id))).toBe(false);
    });

    it('should allow immediate re-block after unblock', async () => {
      await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);
      await request(app)
        .delete(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      const reblock = await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      expect(reblock.statusCode).toBe(200);
    });
  });

  describe('GET /api/auth/blocked', () => {
    it('should list blocked users', async () => {
      await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      const res = await request(app)
        .get('/api/auth/blocked')
        .set('Authorization', `Bearer ${alice.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.blockedUsers)).toBe(true);
      expect(res.body.blockedUsers.some(u => String(u._id) === String(bob.user._id))).toBe(true);
    });
  });

  describe('Messaging across block (WhatsApp semantics)', () => {
    const createChatAndSend = async (senderToken, content) => {
      const conv = await request(app)
        .post('/api/chat/conversation')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({ userId: bob.user._id });

      const conversationId = conv.body.conversation?._id || conv.body.conversation;
      return request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({ conversationId: String(conversationId), content });
    };

    it('should allow the BLOCKER (alice) to message the blocked user (bob)', async () => {
      await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      const res = await createChatAndSend(alice.token, 'hello bob');
      expect(res.statusCode).toBe(201);
    });

    it('should REJECT the blocked user (bob) messaging the blocker (alice)', async () => {
      await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      const conv = await request(app)
        .post('/api/chat/conversation')
        .set('Authorization', `Bearer ${bob.token}`)
        .send({ userId: alice.user._id });

      const conversationId = conv.body.conversation?._id || conv.body.conversation;
      const res = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${bob.token}`)
        .send({ conversationId: String(conversationId), content: 'can you hear me?' });

      expect(res.statusCode).toBe(403);
    });

    it('should allow bob to message alice again AFTER unblock', async () => {
      await request(app)
        .post(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);
      await request(app)
        .delete(`/api/chat/users/${bob.user._id}/block`)
        .set('Authorization', `Bearer ${alice.token}`);

      const conv = await request(app)
        .post('/api/chat/conversation')
        .set('Authorization', `Bearer ${bob.token}`)
        .send({ userId: alice.user._id });

      const conversationId = conv.body.conversation?._id || conv.body.conversation;
      const res = await request(app)
        .post('/api/chat/messages')
        .set('Authorization', `Bearer ${bob.token}`)
        .send({ conversationId: String(conversationId), content: 'unblocked!' });

      expect(res.statusCode).toBe(201);
    });
  });
});
