jest.mock('../models/User', () => ({
  find: jest.fn(),
  findById: jest.fn()
}));

const User = require('../models/User');
const contactsCtrl = require('../controllers/phoneContactsController');

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
  contacts: [],
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('phoneContactsController — uploadPhoneContacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects a missing contacts array (validation)', async () => {
    const res = makeRes();
    await contactsCtrl.uploadPhoneContacts(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Contacts array is required');
  });

  it('rejects an empty contacts array (validation)', async () => {
    const res = makeRes();
    await contactsCtrl.uploadPhoneContacts(makeReq({ body: { contacts: [] } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('normalizes phone numbers and matches server users (happy path)', async () => {
    const serverUser = {
      _id: 'user-2',
      username: 'bob',
      phoneNumber: '255700000002',
      profilePicture: 'p.png',
      isOnline: true,
      lastSeen: new Date()
    };
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([serverUser]) });
    const user = makeUser();
    User.findById.mockResolvedValue(user);

    const res = makeRes();
    await contactsCtrl.uploadPhoneContacts(makeReq({
      body: {
        contacts: [
          { name: 'Bob', phone: '+255 700-000-002' },
          { name: 'Stranger', phone: '255999999999' }
        ]
      }
    }), res);

    expect(res.body.success).toBe(true);
    expect(res.body.totalContacts).toBe(2);
    expect(res.body.matchedCount).toBe(1);
    expect(res.body.newContactsCount).toBe(1);
    expect(res.body.matchedContacts[0]).toMatchObject({ name: 'Bob', matched: true, userId: 'user-2' });
    expect(res.body.matchedContacts[1]).toMatchObject({ name: 'Stranger', matched: false });
    // normalized phone query excludes the current user
    // contact phones keep the '+' after whitespace/dash stripping; the dual-key
    // userMap resolves them against server numbers stored with or without '+'
    expect(User.find).toHaveBeenCalledWith({
      phoneNumber: { $in: ['+255700000002', '255999999999'] },
      _id: { $ne: 'user-1' }
    });
    // saved as contacts with savedName
    expect(user.contacts).toEqual([{ user: 'user-2', savedName: 'Bob' }]);
    expect(user.save).toHaveBeenCalled();
  });

  it('does not add duplicate contacts already in the list', async () => {
    const serverUser = { _id: 'user-2', username: 'bob', phoneNumber: '255700000002' };
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([serverUser]) });
    const user = makeUser({ contacts: [{ user: 'user-2', savedName: 'Bob' }] });
    User.findById.mockResolvedValue(user);

    const res = makeRes();
    await contactsCtrl.uploadPhoneContacts(makeReq({
      body: { contacts: [{ name: 'Bob', phone: '255700000002' }] }
    }), res);

    expect(res.body.matchedCount).toBe(1);
    expect(res.body.newContactsCount).toBe(0);
    expect(user.contacts).toHaveLength(1);
  });

  it('skips contacts without a phone number', async () => {
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await contactsCtrl.uploadPhoneContacts(makeReq({
      body: { contacts: [{ name: 'NoPhone', phone: '' }] }
    }), res);
    expect(res.body.matchedCount).toBe(0);
    expect(res.body.matchedContacts[0].matched).toBe(false);
  });
});

describe('phoneContactsController — getMatchedContacts / syncContacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getMatchedContacts returns 404 for a missing user', async () => {
    User.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await contactsCtrl.getMatchedContacts(makeReq(), res);
    expect(res.statusCode).toBe(404);
  });

  it('getMatchedContacts returns populated contacts (happy path)', async () => {
    const user = makeUser({ contacts: [{ user: 'user-2', savedName: 'Bob' }] });
    User.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(user) });
    const res = makeRes();
    await contactsCtrl.getMatchedContacts(makeReq(), res);
    expect(res.body.contacts).toHaveLength(1);
    expect(res.body.contacts[0].savedName).toBe('Bob');
  });

  it('syncContacts rejects a non-array (validation)', async () => {
    const res = makeRes();
    await contactsCtrl.syncContacts(makeReq({ body: { contacts: 'nope' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('syncContacts matches, merges, and stamps lastSyncAt (happy path)', async () => {
    const serverUser = { _id: 'user-2', username: 'bob', phoneNumber: '255700000002' };
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([serverUser]) });
    const user = makeUser();
    User.findById.mockResolvedValue(user);

    const res = makeRes();
    await contactsCtrl.syncContacts(makeReq({
      body: { contacts: [{ name: 'Bob', phone: '255700000002' }] }
    }), res);

    expect(res.body.success).toBe(true);
    expect(res.body.synced).toBe(true);
    expect(res.body.newContactsCount).toBe(1);
    expect(res.body.totalContacts).toBe(1);
    expect(user.contacts).toHaveLength(1);
    expect(user.lastSyncAt).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalled();
  });
});

describe('phoneContactsController — removeContact / updateContactName', () => {
  beforeEach(() => jest.clearAllMocks());

  it('removeContact returns 404 for a missing user', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await contactsCtrl.removeContact(makeReq({ params: { contactId: 'user-2' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('removeContact removes the contact (happy path)', async () => {
    const user = makeUser({ contacts: [{ user: 'user-2', savedName: 'Bob' }, { user: 'user-3', savedName: 'Carol' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await contactsCtrl.removeContact(makeReq({ params: { contactId: 'user-2' } }), res);
    expect(user.contacts).toHaveLength(1);
    expect(user.contacts[0].user).toBe('user-3');
    expect(user.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Contact removed successfully');
  });

  it('updateContactName returns 404 for a missing user', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await contactsCtrl.updateContactName(makeReq({ params: { contactId: 'user-2' }, body: { name: 'Bobby' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('updateContactName renames the contact (happy path)', async () => {
    const user = makeUser({ contacts: [{ user: 'user-2', savedName: 'Bob' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await contactsCtrl.updateContactName(makeReq({ params: { contactId: 'user-2' }, body: { name: 'Bobby' } }), res);
    expect(user.contacts[0].savedName).toBe('Bobby');
    expect(user.save).toHaveBeenCalled();
    expect(res.body.contact.savedName).toBe('Bobby');
  });

  it('updateContactName leaves unrelated contacts untouched', async () => {
    const user = makeUser({ contacts: [{ user: 'user-2', savedName: 'Bob' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await contactsCtrl.updateContactName(makeReq({ params: { contactId: 'user-9' }, body: { name: 'X' } }), res);
    expect(user.save).not.toHaveBeenCalled();
    expect(res.body.contact).toBeUndefined();
  });
});

describe('phoneContactsController — getContactSuggestions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 404 for a missing user', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await contactsCtrl.getContactSuggestions(makeReq(), res);
    expect(res.statusCode).toBe(404);
  });

  it('suggests users not already in contacts (happy path)', async () => {
    const user = makeUser({ contacts: [{ user: 'user-2' }] });
    User.findById.mockResolvedValue(user);
    const suggestions = [{ _id: 'user-3', username: 'carol' }];
    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(suggestions) })
    });
    const res = makeRes();
    await contactsCtrl.getContactSuggestions(makeReq(), res);
    expect(User.find).toHaveBeenCalledWith({ _id: { $ne: 'user-1', $nin: ['user-2'] }, isBlocked: false });
    expect(res.body.suggestions).toEqual(suggestions);
  });
});
