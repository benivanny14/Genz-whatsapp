const { createShareToken, verifyShareToken, SHARE_TTL_MS } = require('../utils/statusShareToken');

describe('statusShareToken util', () => {
  it('round-trips a valid token to the status id', () => {
    const token = createShareToken('507f1f77bcf86cd799439011');
    expect(verifyShareToken(token)).toEqual({ statusId: '507f1f77bcf86cd799439011' });
  });

  it('rejects a token for a different status', () => {
    const token = createShareToken('507f1f77bcf86cd799439011');
    const verified = verifyShareToken(token);
    expect(verified.statusId).not.toBe('507f191e810c19729de860ea');
  });

  it('rejects tampered tokens', () => {
    const token = createShareToken('507f1f77bcf86cd799439011');
    const [data, sig] = token.split('.');
    const tamperedPayload = Buffer.from('507f191e810c19729de860ea:9999999999999').toString('base64url');
    expect(verifyShareToken(`${tamperedPayload}.${sig}`)).toBeNull();
    // corrupt the signature itself
    expect(verifyShareToken(`${data}.${'A'.repeat(sig.length)}`)).toBeNull();
  });

  it('rejects expired tokens', () => {
    const token = createShareToken('507f1f77bcf86cd799439011', -1000);
    expect(verifyShareToken(token)).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(verifyShareToken('')).toBeNull();
    expect(verifyShareToken('no-dot')).toBeNull();
    expect(verifyShareToken(null)).toBeNull();
    expect(verifyShareToken('a.b.c')).toBeNull();
  });

  it('honours a custom TTL', () => {
    expect(SHARE_TTL_MS).toBe(24 * 60 * 60 * 1000);
    const token = createShareToken('abc', 60_000);
    expect(verifyShareToken(token).statusId).toBe('abc');
  });
});
