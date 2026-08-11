jest.mock('../services/encryptionService', () => ({
  registerClientPublicKeys: jest.fn(),
  getUserPublicKeys: jest.fn(),
  rotateKeys: jest.fn(),
  deleteKeys: jest.fn(),
  hasEncryptionKeys: jest.fn()
}));

const encryptionService = require('../services/encryptionService');
const encryptionController = require('../controllers/encryptionController');

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

const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

describe('encryptionController — key management', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the current user public keys (happy path)', async () => {
    encryptionService.getUserPublicKeys.mockResolvedValue({ publicKey: 'pub' });
    const res = makeRes();
    await encryptionController.getMyPublicKeys(makeReq(), res);
    expect(res.body.keys).toEqual({ publicKey: 'pub' });
  });

  it('rotates keys (happy path)', async () => {
    encryptionService.rotateKeys.mockResolvedValue({ publicKey: 'new-pub' });
    const res = makeRes();
    await encryptionController.rotateKeys(makeReq(), res);
    expect(encryptionService.rotateKeys).toHaveBeenCalledWith('user-1');
    expect(res.body.message).toMatch(/rotated/i);
  });

  it('deletes keys (happy path)', async () => {
    encryptionService.deleteKeys.mockResolvedValue(undefined);
    const res = makeRes();
    await encryptionController.deleteKeys(makeReq(), res);
    expect(encryptionService.deleteKeys).toHaveBeenCalledWith('user-1');
    expect(res.body.success).toBe(true);
  });

  it('reports key status (happy path)', async () => {
    encryptionService.hasEncryptionKeys.mockResolvedValue(true);
    const res = makeRes();
    await encryptionController.checkKeysStatus(makeReq(), res);
    expect(res.body.hasKeys).toBe(true);
  });
});

describe('encryptionController — registerPublicKeys', () => {
  beforeEach(() => jest.clearAllMocks());

  it('registers client-generated public keys (happy path)', async () => {
    encryptionService.registerClientPublicKeys.mockResolvedValue({ publicKey: 'client-pub' });
    const res = makeRes();
    await encryptionController.registerPublicKeys(
      makeReq({ body: { publicKey: 'client-pub', signaturePublicKey: 'sig-pub' } }),
      res
    );
    expect(encryptionService.registerClientPublicKeys).toHaveBeenCalledWith('user-1', {
      publicKey: 'client-pub',
      signaturePublicKey: 'sig-pub'
    });
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when the service rejects the keys (validation)', async () => {
    encryptionService.registerClientPublicKeys.mockRejectedValue(new Error('Invalid public key format'));
    const res = makeRes();
    await encryptionController.registerPublicKeys(makeReq({ body: { publicKey: 'bad' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid public key format');
  });
});

describe('encryptionController — removed legacy server-side handlers', () => {
  it('no longer exports generateKeys, encryptMessage, decryptMessage or encryptGroupMessage', () => {
    expect(encryptionController.generateKeys).toBeUndefined();
    expect(encryptionController.encryptMessage).toBeUndefined();
    expect(encryptionController.decryptMessage).toBeUndefined();
    expect(encryptionController.encryptGroupMessage).toBeUndefined();
  });

  it('no longer depends on the removed server-side crypto service functions', () => {
    expect(encryptionService.generateUserKeys).toBeUndefined();
    expect(encryptionService.encryptForRecipient).toBeUndefined();
    expect(encryptionService.decryptFromSender).toBeUndefined();
    expect(encryptionService.encryptForGroup).toBeUndefined();
  });
});
