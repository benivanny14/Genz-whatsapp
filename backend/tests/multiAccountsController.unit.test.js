jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const whatsappSession = require('../controllers/whatsappSessionController');
const multiAccounts = whatsappSession;

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

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  phoneNumber: '255700000001',
  multiAccountsSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('multiAccountsController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await multiAccounts.getMultiAccountsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ multiAccountsSettings: { maxAccounts: 3 } }));
    const res = makeRes();
    await multiAccounts.getMultiAccountsSettings(makeReq(), res);
    expect(res.body.settings.maxAccounts).toBe(3);
    expect(res.body.settings.multiAccountsEnabled).toBe(false); // default
    expect(res.body.settings.currentAccounts).toEqual([]); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.updateMultiAccountsSettings(makeReq({ body: { settings: { syncChats: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.syncChats).toBe(true);
  });

  it('enables multi accounts with a primary account (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.enableMultiAccounts(makeReq(), res);
    expect(res.body.settings.multiAccountsEnabled).toBe(true);
    expect(res.body.settings.currentAccounts).toHaveLength(1);
    expect(res.body.settings.currentAccounts[0].isActive).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('disables multi accounts and clears the list (happy path)', async () => {
    const user = makeUser({
      multiAccountsSettings: { multiAccountsEnabled: true, currentAccounts: [{ _id: 'a1' }], activeAccountId: 'a1' }
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.disableMultiAccounts(makeReq(), res);
    expect(res.body.settings.multiAccountsEnabled).toBe(false);
    expect(res.body.settings.currentAccounts).toEqual([]);
    expect(res.body.settings.activeAccountId).toBeNull();
  });

  it('toggles unified inbox (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.toggleUnifiedInbox(makeReq({ body: { enabled: true } }), res);
    expect(res.body.settings.unifiedInbox).toBe(true);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ multiAccountsSettings: { maxAccounts: 1, unifiedInbox: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.resetMultiAccountsSettings(makeReq(), res);
    expect(res.body.settings.maxAccounts).toBe(5); // default
    expect(res.body.settings.unifiedInbox).toBe(false); // default
  });
});

describe('multiAccountsController — accounts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects addAccount without name/phone (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await multiAccounts.addAccount(makeReq({ body: { name: 'Bob' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Name and phone number are required');
  });

  it('rejects adding an account when multi accounts is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await multiAccounts.addAccount(makeReq({ body: { name: 'Bob', phoneNumber: '255700000002' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Multi accounts is not enabled');
  });

  it('rejects exceeding the max account limit (validation)', async () => {
    const user = makeUser({
      multiAccountsSettings: { multiAccountsEnabled: true, maxAccounts: 2, currentAccounts: [{ _id: 'a1' }, { _id: 'a2' }] }
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.addAccount(makeReq({ body: { name: 'Bob', phoneNumber: '255700000002' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Maximum 2 accounts allowed');
  });

  it('adds an account (happy path)', async () => {
    const user = makeUser({
      multiAccountsSettings: { multiAccountsEnabled: true, maxAccounts: 5, currentAccounts: [{ _id: 'a1' }] }
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.addAccount(makeReq({ body: { name: 'Bob', phoneNumber: '255700000002' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.accounts).toHaveLength(2);
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 404 when removing a missing account', async () => {
    User.findById.mockResolvedValue(makeUser({ multiAccountsSettings: { currentAccounts: [{ _id: 'a1' }] } }));
    const res = makeRes();
    await multiAccounts.removeAccount(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects removing the last account (validation)', async () => {
    User.findById.mockResolvedValue(makeUser({ multiAccountsSettings: { currentAccounts: [{ _id: 'a1' }] } }));
    const res = makeRes();
    await multiAccounts.removeAccount(makeReq({ params: { id: 'a1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Cannot remove the last account');
  });

  it('removes an account and resets the active one (happy path)', async () => {
    const user = makeUser({
      multiAccountsSettings: {
        currentAccounts: [{ _id: 'a1' }, { _id: 'a2' }],
        activeAccountId: 'a1'
      }
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.removeAccount(makeReq({ params: { id: 'a1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.accounts).toHaveLength(1);
    expect(user.multiAccountsSettings.activeAccountId).toBe('a2');
  });

  it('switches the active account (happy path)', async () => {
    const user = makeUser({
      multiAccountsSettings: { currentAccounts: [{ _id: 'a1', isActive: true }, { _id: 'a2', isActive: false }] }
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.switchAccount(makeReq({ body: { accountId: 'a2' } }), res);
    expect(res.body.activeAccountId).toBe('a2');
    expect(res.body.accounts[0].isActive).toBe(false);
    expect(res.body.accounts[1].isActive).toBe(true);
  });

  it('updates an account (happy path)', async () => {
    const user = makeUser({ multiAccountsSettings: { currentAccounts: [{ _id: 'a1', name: 'Old', phoneNumber: '1' }] } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.updateAccount(makeReq({ params: { id: 'a1' }, body: { name: 'New' } }), res);
    expect(res.body.accounts[0].name).toBe('New');
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects cloning when multi accounts is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await multiAccounts.cloneAccount(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(403);
  });

  it('clones an account (happy path)', async () => {
    const user = makeUser({
      multiAccountsSettings: {
        multiAccountsEnabled: true,
        maxAccounts: 5,
        currentAccounts: [{ _id: 'a1', name: 'Primary', phoneNumber: '255700000001' }]
      }
    });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await multiAccounts.cloneAccount(makeReq({ body: { accountId: 'a1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.account.name).toBe('Primary (Clone)');
    expect(res.body.accounts).toHaveLength(2);
  });

  it('returns all accounts (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({
      multiAccountsSettings: { currentAccounts: [{ _id: 'a1' }], activeAccountId: 'a1' }
    }));
    const res = makeRes();
    await multiAccounts.getAccounts(makeReq(), res);
    expect(res.body.accounts).toHaveLength(1);
    expect(res.body.activeAccountId).toBe('a1');
  });
});
