const { isE2EEContent, parseEnvelope, stampE2EEMessage } = require('../utils/e2eeStamp');
const { computePublicKeyFingerprint } = require('../utils/keyFingerprint');

const makeEnvelope = (senderPublicKey, overrides = {}) =>
  JSON.stringify({
    version: 1,
    algorithm: 'ECDH-P256+AES-256-GCM',
    iv: 'aXZieXRlcw==',
    ciphertext: 'Y2lwaGVydGV4dA==',
    senderPublicKey,
    ...overrides
  });

describe('e2eeStamp utils', () => {
  it('detects client-side E2EE envelope content', () => {
    expect(isE2EEContent(makeEnvelope({ kty: 'EC' }))).toBe(true);
    expect(isE2EEContent('plain hello')).toBe(false);
    expect(isE2EEContent('{"foo":1}')).toBe(false);
    expect(isE2EEContent(null)).toBe(false);
  });

  it('parses the envelope and ignores invalid content', () => {
    const envelope = makeEnvelope({ kty: 'EC', crv: 'P-256', x: 'a', y: 'b' });
    expect(parseEnvelope(envelope).ciphertext).toBeTruthy();
    expect(parseEnvelope('not json')).toBeNull();
    expect(parseEnvelope('{"ciphertext":1}')).toBeNull();
  });

  it('stamps fingerprint + current status for the sender\'s registered key', () => {
    const key = { kty: 'EC', crv: 'P-256', x: 'abc', y: 'def' };
    const stamp = stampE2EEMessage(makeEnvelope(key), {
      encryptionKeys: { publicKey: JSON.stringify(key) },
      encryptionKeyHistory: []
    });
    expect(stamp.e2eeKeyFingerprint).toBe(computePublicKeyFingerprint(key));
    expect(stamp.e2eeKeyStatus).toBe('current');
  });

  it('stamps old status when the key was rotated', () => {
    const oldKey = { kty: 'EC', crv: 'P-256', x: 'old', y: 'old' };
    const currentKey = { kty: 'EC', crv: 'P-256', x: 'cur', y: 'cur' };
    const stamp = stampE2EEMessage(makeEnvelope(oldKey), {
      encryptionKeys: { publicKey: JSON.stringify(currentKey) },
      encryptionKeyHistory: [{ publicKey: JSON.stringify(oldKey) }]
    });
    expect(stamp.e2eeKeyStatus).toBe('old');
  });

  it('returns null for non-E2EE content and unknown without a sender doc', () => {
    expect(stampE2EEMessage('plain', null)).toBeNull();
    const stamp = stampE2EEMessage(makeEnvelope({ kty: 'EC' }), null);
    expect(stamp.e2eeKeyFingerprint).toBeTruthy();
    expect(stamp.e2eeKeyStatus).toBe('unknown');
  });
});
