/**
 * Integration test: E2EE message stamping against a REAL MongoDB.
 *
 * Exercises the full send → stamp path without mocking models:
 *   1. two users register client-generated ECDH P-256 public keys
 *   2. one sends a genuine E2EE envelope (ECDH-P256 + AES-256-GCM, built with
 *      Node webcrypto exactly like frontend/src/services/encryptionService.js)
 *      through chatController.sendMessage (the REST /api/chat/messages path)
 *   3. the stored message carries e2eeKeyFingerprint + e2eeKeyStatus
 *      ('current'), and after rotating the sender's key a new envelope with
 *      the old key is stamped 'old'
 *
 * Safe by construction: the suite SKIPS unless MONGO_TEST_URI is explicitly
 * set, and the caller must point it at an ISOLATED database (collections are
 * wiped in beforeAll/afterAll) — same convention as adminAuthIntegration,
 * adminPrepIntegration and deletedMessageIntegration.
 */
const mongoose = require('mongoose');

const URI = process.env.MONGO_TEST_URI;

if (!URI) {
  describe.skip('E2EE message stamping (integration)', () => {
    it('skipped — set MONGO_TEST_URI to an isolated MongoDB to run', () => {});
  });
} else {
  const crypto = require('crypto');
  const User = require('../models/User');
  const Conversation = require('../models/Conversation');
  const Message = require('../models/Message');
  const chat = require('../controllers/chatController');
  const encryptionService = require('../services/encryptionService');
  const { computePublicKeyFingerprint } = require('../utils/keyFingerprint');

  const subtle = crypto.webcrypto.subtle;

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

  const makeReq = (user, body) => ({
    user,
    body,
    app: { get: () => undefined } // no socket.io in tests
  });

  let userCounter = 0;
  async function createUser() {
    userCounter += 1;
    const phoneNumber = `25570${String(10000000 + userCounter)}`;
    return User.create({ username: `e2ee_user_${userCounter}`, phoneNumber, phoneVerified: true });
  }

  async function makeKeyPair() {
    const pair = await subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey']
    );
    return {
      pair,
      publicJwk: await subtle.exportKey('jwk', pair.publicKey)
    };
  }

  // Builds a genuine client-side E2EE envelope (same shape as
  // frontend/src/services/encryptionService.js::encryptMessage).
  async function buildEnvelope(senderPair, recipientPublicJwk, text) {
    const iv = crypto.webcrypto.getRandomValues(new Uint8Array(12));
    const recipientKey = await subtle.importKey(
      'jwk',
      recipientPublicJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      []
    );
    const shared = await subtle.deriveKey(
      { name: 'ECDH', public: recipientKey },
      senderPair.pair.privateKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
    const ciphertext = await subtle.encrypt(
      { name: 'AES-GCM', iv },
      shared,
      new TextEncoder().encode(text)
    );
    return JSON.stringify({
      version: 1,
      algorithm: 'ECDH-P256+AES-256-GCM',
      iv: Buffer.from(iv).toString('base64'),
      ciphertext: Buffer.from(ciphertext).toString('base64'),
      senderPublicKey: senderPair.publicJwk,
      createdAt: new Date().toISOString()
    });
  }

  async function makeFixtures() {
    const alice = await createUser();
    const bob = await createUser();
    const aliceKeys = await makeKeyPair();
    const bobKeys = await makeKeyPair();
    await encryptionService.registerClientPublicKeys(alice._id, { publicKey: aliceKeys.publicJwk });
    await encryptionService.registerClientPublicKeys(bob._id, { publicKey: bobKeys.publicJwk });
    const conversation = await Conversation.create({
      participants: [alice._id, bob._id],
      isGroup: false
    });
    return { alice, bob, aliceKeys, bobKeys, conversation };
  }

  describe('E2EE message stamping (integration)', () => {
    beforeAll(async () => {
      await mongoose.disconnect().catch(() => {});
      await mongoose.connect(URI, { serverSelectionTimeoutMS: 5000 });
      await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
    });

    afterAll(async () => {
      if (mongoose.connection.readyState === 1) {
        await Promise.all([User.deleteMany({}), Conversation.deleteMany({}), Message.deleteMany({})]);
      }
      await mongoose.disconnect().catch(() => {});
    });

    it('stamps a REST-sent E2EE message with fingerprint + current status and persists it', async () => {
      const { bob, bobKeys, aliceKeys, conversation } = await makeFixtures();
      const envelope = await buildEnvelope(bobKeys, aliceKeys.publicJwk, 'secret hello');

      const res = makeRes();
      await chat.sendMessage(
        makeReq({ _id: bob._id }, { conversationId: conversation._id, content: envelope }),
        res
      );

      expect(res.statusCode).toBe(201);
      const sent = res.body.message;
      expect(sent.isClientE2EE).toBe(true);
      expect(sent.e2eeKeyStatus).toBe('current');
      expect(sent.e2eeKeyFingerprint).toBe(computePublicKeyFingerprint(bobKeys.publicJwk));

      // Persisted on the message document too.
      const stored = await Message.findById(sent._id);
      expect(stored.e2eeKeyFingerprint).toBe(computePublicKeyFingerprint(bobKeys.publicJwk));
      expect(stored.e2eeKeyStatus).toBe('current');
    });

    it('stamps messages sent with a rotated key as old, and the new key as current', async () => {
      const { bob, bobKeys, aliceKeys, conversation } = await makeFixtures();

      // Rotate bob's key — the old pair is now part of his key history.
      const newBobKeys = await makeKeyPair();
      await encryptionService.rotateKeys(bob._id, { publicKey: newBobKeys.publicJwk });

      // Message encrypted with the OLD key → 'old'.
      const staleEnvelope = await buildEnvelope(bobKeys, aliceKeys.publicJwk, 'stale key');
      const res1 = makeRes();
      await chat.sendMessage(
        makeReq({ _id: bob._id }, { conversationId: conversation._id, content: staleEnvelope }),
        res1
      );
      expect(res1.statusCode).toBe(201);
      expect(res1.body.message.e2eeKeyStatus).toBe('old');

      // Message encrypted with the NEW key → 'current'.
      const freshEnvelope = await buildEnvelope(newBobKeys, aliceKeys.publicJwk, 'fresh key');
      const res2 = makeRes();
      await chat.sendMessage(
        makeReq({ _id: bob._id }, { conversationId: conversation._id, content: freshEnvelope }),
        res2
      );
      expect(res2.statusCode).toBe(201);
      expect(res2.body.message.e2eeKeyStatus).toBe('current');
      expect(res2.body.message.e2eeKeyFingerprint).toBe(computePublicKeyFingerprint(newBobKeys.publicJwk));
    });

    it('leaves plain messages unstamped', async () => {
      const { bob, conversation } = await makeFixtures();
      const res = makeRes();
      await chat.sendMessage(
        makeReq({ _id: bob._id }, { conversationId: conversation._id, content: 'just a plain message' }),
        res
      );
      expect(res.statusCode).toBe(201);
      expect(res.body.message.isClientE2EE).toBe(false);
      expect(res.body.message.e2eeKeyFingerprint).toBeNull();
      expect(res.body.message.e2eeKeyStatus).toBeNull();
    });
  });
}
