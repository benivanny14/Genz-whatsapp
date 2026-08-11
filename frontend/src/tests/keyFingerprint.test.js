import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalJwk,
  computeKeyFingerprint,
  classifyKeyAgainstHistory
} from '../utils/keyFingerprint.js';

test('canonicalJwk is stable regardless of JWK property order', () => {
  const a = canonicalJwk({ crv: 'P-256', kty: 'EC', x: 'abc', y: 'def' });
  const b = canonicalJwk({ kty: 'EC', y: 'def', x: 'abc', crv: 'P-256' });
  assert.equal(a, b);
  assert.equal(canonicalJwk(null), '');
  assert.equal(canonicalJwk('raw-string'), 'raw-string');
});

test('computeKeyFingerprint returns a short stable hex fingerprint', async () => {
  const key = { kty: 'EC', crv: 'P-256', x: 'same-x', y: 'same-y' };
  const fp1 = await computeKeyFingerprint(key);
  const fp2 = await computeKeyFingerprint({ y: 'same-y', x: 'same-x', crv: 'P-256', kty: 'EC' });
  const fp3 = await computeKeyFingerprint({ kty: 'EC', crv: 'P-256', x: 'other-x', y: 'same-y' });

  assert.equal(fp1, fp2, 'same key (different property order) → same fingerprint');
  assert.notEqual(fp1, fp3, 'different key → different fingerprint');
  assert.match(fp1, /^[0-9A-F]{8}$/);
});

test('classifyKeyAgainstHistory distinguishes current, old and unknown keys', () => {
  const current = { kty: 'EC', crv: 'P-256', x: 'cur', y: 'cur' };
  const old = { kty: 'EC', crv: 'P-256', x: 'old', y: 'old' };
  const stranger = { kty: 'EC', crv: 'P-256', x: 'zzz', y: 'zzz' };
  const history = { currentPublicKey: current, history: [{ publicKey: old }] };

  assert.equal(classifyKeyAgainstHistory(current, history), 'current');
  assert.equal(classifyKeyAgainstHistory(old, history), 'old');
  assert.equal(classifyKeyAgainstHistory(stranger, history), 'unknown');
  assert.equal(classifyKeyAgainstHistory(current, null), 'unknown');
});
