const {
  canonicalizeJwk,
  computePublicKeyFingerprint,
  classifyPublicKeyAgainstHistory
} = require('../utils/keyFingerprint');

describe('keyFingerprint utils', () => {
  it('canonicalizes JWKs stably regardless of property order', () => {
    const a = { crv: 'P-256', kty: 'EC', x: 'abc', y: 'def' };
    const b = { kty: 'EC', y: 'def', x: 'abc', crv: 'P-256' };
    expect(canonicalizeJwk(a)).toBe(canonicalizeJwk(b));
    expect(canonicalizeJwk(null)).toBe('');
  });

  it('computes a stable short fingerprint matching the client format', () => {
    const key = { kty: 'EC', crv: 'P-256', x: 'same-x', y: 'same-y' };
    const fp = computePublicKeyFingerprint(key);
    expect(fp).toMatch(/^[0-9A-F]{8}$/);
    // Same key, different property order → identical fingerprint.
    expect(fp).toBe(
      computePublicKeyFingerprint({ y: 'same-y', x: 'same-x', crv: 'P-256', kty: 'EC' })
    );
    // Different key → different fingerprint.
    expect(fp).not.toBe(
      computePublicKeyFingerprint({ kty: 'EC', crv: 'P-256', x: 'other-x', y: 'same-y' })
    );
  });

  it('classifies current, old (including serialized strings) and unknown keys', () => {
    const current = { kty: 'EC', crv: 'P-256', x: 'cur', y: 'cur' };
    const old = { kty: 'EC', crv: 'P-256', x: 'old', y: 'old' };
    const serializedOld = JSON.stringify(old); // how encryptionKeyHistory stores it
    const stranger = { kty: 'EC', crv: 'P-256', x: 'zzz', y: 'zzz' };

    // encryptionKeyHistory entries are { publicKey, ... } objects.
    const historyEntries = [{ publicKey: serializedOld }];
    expect(classifyPublicKeyAgainstHistory(current, current, [])).toBe('current');
    expect(classifyPublicKeyAgainstHistory(old, current, historyEntries)).toBe('old');
    expect(classifyPublicKeyAgainstHistory(stranger, current, historyEntries)).toBe('unknown');
    expect(classifyPublicKeyAgainstHistory(old, null, [])).toBe('unknown');
  });
});
