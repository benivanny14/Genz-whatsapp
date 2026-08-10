jest.mock('../services/encryptionService', () => ({
  generateUserKeys: jest.fn(),
  registerClientPublicKeys: jest.fn(),
  getUserPublicKeys: jest.fn(),
  encryptForRecipient: jest.fn(),
  decryptFromSender: jest.fn(),
  encryptForGroup: jest.fn(),
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

  it('generates keys for the current user (happy path)', async () => {
    encryptionService.generateUserKeys.mockResolvedValue({ publicKey: 'pub', privateKey: 'priv' });
    const res = makeRes();
    await encryptionController.generateKeys(makeReq(), res);
    expect(encryptionService.generateUserKeys).toHaveBeenCalledWith('user-1');
    expect(res.body.success).toBe(true);
    expect(res.body.keys.publicKey).toBe('pub');
  });

  it('returns 500 when key generation fails', async () => {
    encryptionService.generateUserKeys.mockRejectedValue(new Error('boom'));
    const res = makeRes();
    await encryptionController.generateKeys(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });

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

describe('encryptionController — message encryption/decryption', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects encryptMessage without a message (validation)', async () => {
    const res = makeRes();
    await encryptionController.encryptMessage(makeReq({ body: { recipientId: 'user-2' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Message is required');
  });

  it('rejects encryptMessage without a recipient (validation)', async () => {
    const res = makeRes();
    await encryptionController.encryptMessage(makeReq({ body: { message: 'hello' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Recipient ID is required');
  });

  it('encrypts a message for a recipient (happy path)', async () => {
    encryptionService.encryptForRecipient.mockResolvedValue({ ciphertext: 'abc' });
    const res = makeRes();
    await encryptionController.encryptMessage(makeReq({ body: { message: 'hello', recipientId: 'user-2' } }), res);
    expect(encryptionService.encryptForRecipient).toHaveBeenCalledWith('hello', 'user-1', 'user-2');
    expect(res.body.encrypted).toEqual({ ciphertext: 'abc' });
  });

  it('rejects decryptMessage without encryptedMessage (validation)', async () => {
    const res = makeRes();
    await encryptionController.decryptMessage(makeReq({ body: { senderId: 'user-2' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Encrypted message is required');
  });

  it('rejects decryptMessage without a sender (validation)', async () => {
    const res = makeRes();
    await encryptionController.decryptMessage(makeReq({ body: { encryptedMessage: 'abc' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Sender ID is required');
  });

  it('decrypts a message (happy path)', async () => {
    encryptionService.decryptFromSender.mockResolvedValue('hello');
    const res = makeRes();
    await encryptionController.decryptMessage(makeReq({ body: { encryptedMessage: 'abc', senderId: 'user-2' } }), res);
    expect(encryptionService.decryptFromSender).toHaveBeenCalledWith('abc', 'user-1', 'user-2');
    expect(res.body.message).toBe('hello');
  });

  it('rejects encryptGroupMessage without recipientIds (validation)', async () => {
    const res = makeRes();
    await encryptionController.encryptGroupMessage(makeReq({ body: { message: 'hello' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Recipient IDs are required');
  });

  it('encrypts a group message (happy path)', async () => {
    encryptionService.encryptForGroup.mockResolvedValue({ ciphertext: 'group-abc' });
    const res = makeRes();
    await encryptionController.encryptGroupMessage(
      makeReq({ body: { message: 'hello all', recipientIds: ['user-2', 'user-3'] } }),
      res
    );
    expect(encryptionService.encryptForGroup).toHaveBeenCalledWith('hello all', 'user-1', ['user-2', 'user-3']);
    expect(res.body.encrypted).toEqual({ ciphertext: 'group-abc' });
  });
});
