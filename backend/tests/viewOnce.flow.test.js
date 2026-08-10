/**
 * Integration test for the complete view-once flow against the real app:
 *   send → feed stripped → reveal (revealedAt audit) → consume → TTL,
 * plus the server-side guard rails (no forwarding, sender cannot reveal).
 *
 * Uses the in-memory MongoDB provided by tests/setup.js (non-unit tests),
 * and cleans all collections between tests.
 */
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { app } = require('../server');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const mintToken = (user) =>
  jwt.sign(
    { id: String(user._id), role: user.role || 'user', typ: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

describe('View-once flow (integration)', () => {
  let sender, receiver, senderToken, receiverToken, conversation;

  beforeEach(async () => {
    sender = await User.create({
      username: 'vo-sender',
      phoneNumber: '255700000101',
      phoneVerified: true
    });
    receiver = await User.create({
      username: 'vo-receiver',
      phoneNumber: '255700000102',
      phoneVerified: true
    });
    senderToken = mintToken(sender);
    receiverToken = mintToken(receiver);
    conversation = await Conversation.create({
      participants: [sender._id, receiver._id],
      isGroup: false
    });
  });

  const sendViewOnce = (content, token = senderToken) =>
    request(app)
      .post('/api/chat/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ conversationId: String(conversation._id), content, isViewOnce: true });

  it('send → feed stripped → reveal (revealedAt) → consume → TTL', async () => {
    // 1. Sender sends a view-once message
    const sendRes = await sendViewOnce('top secret one-time');
    expect(sendRes.statusCode).toBe(201);
    expect(sendRes.body.message.isViewOnce).toBe(true);
    const messageId = sendRes.body.message._id;

    // 2. Receiver feed must NOT contain the real content
    const feedRes = await request(app)
      .get(`/api/chat/conversations/${conversation._id}/messages`)
      .set('Authorization', `Bearer ${receiverToken}`);
    expect(feedRes.statusCode).toBe(200);
    const inFeed = feedRes.body.messages.find((m) => m._id === messageId);
    expect(inFeed.content).toBe('View Once message');
    expect(inFeed.mediaUrl).toBe('');
    expect(inFeed.isViewOnce).toBe(true);

    // 3. Reveal returns the real content once and records revealedAt (audit)
    const revealRes = await request(app)
      .post(`/api/chat/messages/${messageId}/view-once-reveal`)
      .set('Authorization', `Bearer ${receiverToken}`);
    expect(revealRes.statusCode).toBe(200);
    expect(revealRes.body.content).toBe('top secret one-time');
    const afterReveal = await Message.findById(messageId);
    expect(afterReveal.revealedAt).toBeInstanceOf(Date);

    // 4. Consume clears the content and marks it consumed
    const consumeRes = await request(app)
      .put(`/api/chat/messages/${messageId}/view-once-viewed`)
      .set('Authorization', `Bearer ${receiverToken}`);
    expect(consumeRes.statusCode).toBe(200);

    const afterConsume = await Message.findById(messageId);
    expect(afterConsume.isConsumed).toBe(true);
    expect(afterConsume.content).toBe('View Once message opened');
    expect(afterConsume.mediaUrl).toBe('');

    // Reveal after consume → 400
    const revealAgain = await request(app)
      .post(`/api/chat/messages/${messageId}/view-once-reveal`)
      .set('Authorization', `Bearer ${receiverToken}`);
    expect(revealAgain.statusCode).toBe(400);
    expect(revealAgain.body.message).toMatch(/already opened/i);

    // 5. TTL: a 24h disappearAt was set at send time so never-opened content
    //    is garbage-collected by the Mongo TTL index.
    expect(afterConsume.disappearAt).toBeInstanceOf(Date);
    const ttlMs = afterConsume.disappearAt.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(ttlMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
  });

  it('blocks forwarding view-once messages (400)', async () => {
    const sendRes = await sendViewOnce('cannot forward this');
    const messageId = sendRes.body.message._id;

    const fwdRes = await request(app)
      .post(`/api/chat/messages/${messageId}/forward`)
      .set('Authorization', `Bearer ${senderToken}`)
      .send({ targetConversationIds: [String(conversation._id)] });
    expect(fwdRes.statusCode).toBe(400);
    expect(fwdRes.body.message).toMatch(/cannot be forwarded/i);
  });

  it('sender cannot reveal their own view-once message (403)', async () => {
    const sendRes = await sendViewOnce('my own secret');
    const messageId = sendRes.body.message._id;

    const revealRes = await request(app)
      .post(`/api/chat/messages/${messageId}/view-once-reveal`)
      .set('Authorization', `Bearer ${senderToken}`);
    expect(revealRes.statusCode).toBe(403);
    expect(revealRes.body.message).toMatch(/their own view-once message/i);
  });
});
