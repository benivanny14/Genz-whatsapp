jest.mock('../models/PrivacyExcludedContact', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/PrivacyAllowedContact', () => ({
  findOne: jest.fn()
}));

const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');
const PrivacyAllowedContact = require('../models/PrivacyAllowedContact');
const { applyPrivacyFilter } = require('../utils/privacyHelper');
const {
  privacyMiddleware,
  filterUserData,
  checkPrivacyPermission
} = require('../middleware/privacy');

const OWNER_ID = 'owner-1';
const CONTACT_ID = 'contact-1';
const STRANGER_ID = 'stranger-1';

const makeUser = (overrides = {}) => ({
  _id: OWNER_ID,
  username: 'alice',
  phoneNumber: '+255700000000',
  profilePicture: 'pic-url',
  about: 'hello there',
  bio: 'bio',
  lastSeen: new Date('2026-08-01T10:00:00Z'),
  isOnline: true,
  contacts: [CONTACT_ID],
  settings: {
    privacy: {
      lastSeen: 'everyone',
      online: 'everyone',
      profilePhoto: 'everyone',
      about: 'everyone',
      status: 'contacts',
      groups: 'everyone'
    }
  },
  encryptionKeys: { secret: 'x' },
  publicKey: 'pubkey',
  ...overrides
});

const makeMongooseDoc = (user) => ({
  ...user,
  toObject: () => JSON.parse(JSON.stringify(user))
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('applyPrivacyFilter — owner (self)', () => {
  it('returns the user untouched when the requester is the owner', async () => {
    const user = makeUser();
    const result = await applyPrivacyFilter(user, OWNER_ID);
    expect(result.lastSeen).toBeDefined();
    expect(result.contacts).toBeDefined();
    expect(result.settings).toBeDefined();
    expect(result.encryptionKeys).toBeDefined();
  });

  it('handles a plain object user (no toObject)', async () => {
    const result = await applyPrivacyFilter(makeUser(), OWNER_ID);
    expect(result.username).toBe('alice');
  });
});

describe('applyPrivacyFilter — permission matrix', () => {
  describe('everyone', () => {
    it('always allows — stranger sees all fields', async () => {
      const result = await applyPrivacyFilter(makeUser(), STRANGER_ID);
      expect(result.lastSeen).toBeDefined();
      expect(result.isOnline).toBeDefined();
      expect(result.profilePicture).toBeDefined();
      expect(result.about).toBeDefined();
    });
  });

  describe('contacts', () => {
    it('allows a contact to see the field', async () => {
      const user = makeUser({ settings: { privacy: { lastSeen: 'contacts' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.lastSeen).toBeDefined();
    });

    it('hides the field from a stranger', async () => {
      const user = makeUser({ settings: { privacy: { lastSeen: 'contacts' } } });
      const result = await applyPrivacyFilter(user, STRANGER_ID);
      expect(result.lastSeen).toBeUndefined();
    });

    it('hides the field when the owner has no contact list', async () => {
      const user = makeUser({ contacts: [], settings: { privacy: { lastSeen: 'contacts' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.lastSeen).toBeUndefined();
    });

    it('recognizes contacts stored as { user, savedName } subdocuments (production shape)', async () => {
      const user = makeUser({
        contacts: [{ user: CONTACT_ID, savedName: 'Bob' }],
        settings: { privacy: { lastSeen: 'contacts' } }
      });
      const contactResult = await applyPrivacyFilter(user, CONTACT_ID);
      expect(contactResult.lastSeen).toBeDefined();

      const strangerResult = await applyPrivacyFilter(user, STRANGER_ID);
      expect(strangerResult.lastSeen).toBeUndefined();
    });
  });

  describe('contacts_except', () => {
    it('allows a contact who is not excluded', async () => {
      PrivacyExcludedContact.findOne.mockResolvedValue(null);
      const user = makeUser({ settings: { privacy: { lastSeen: 'contacts_except' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.lastSeen).toBeDefined();
      expect(PrivacyExcludedContact.findOne).toHaveBeenCalledWith({
        ownerUserId: OWNER_ID,
        privacyType: 'last_seen',
        excludedContactId: CONTACT_ID
      });
    });

    it('recognizes subdocument contacts in the excluded-list check (production shape)', async () => {
      PrivacyExcludedContact.findOne.mockResolvedValue(null);
      const user = makeUser({
        contacts: [{ user: CONTACT_ID, savedName: 'Bob' }],
        settings: { privacy: { lastSeen: 'contacts_except' } }
      });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.lastSeen).toBeDefined();
      expect(PrivacyExcludedContact.findOne).toHaveBeenCalledWith({
        ownerUserId: OWNER_ID,
        privacyType: 'last_seen',
        excludedContactId: CONTACT_ID
      });
    });

    it('hides the field from an excluded contact', async () => {
      PrivacyExcludedContact.findOne.mockResolvedValue({ _id: 'ex-1' });
      const user = makeUser({ settings: { privacy: { lastSeen: 'contacts_except' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.lastSeen).toBeUndefined();
    });

    it('hides the field from a stranger even without an excluded record', async () => {
      PrivacyExcludedContact.findOne.mockResolvedValue(null);
      const user = makeUser({ settings: { privacy: { lastSeen: 'contacts_except' } } });
      const result = await applyPrivacyFilter(user, STRANGER_ID);
      expect(result.lastSeen).toBeUndefined();
    });

    it('degrades gracefully (allows) when the excluded-list query fails', async () => {
      PrivacyExcludedContact.findOne.mockRejectedValue(new Error('db down'));
      const user = makeUser({ settings: { privacy: { lastSeen: 'contacts_except' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.lastSeen).toBeDefined();
    });
  });

  describe('nobody', () => {
    it('hides the field from everyone', async () => {
      const user = makeUser({ settings: { privacy: { lastSeen: 'nobody' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.lastSeen).toBeUndefined();
    });
  });

  describe('only_share_with', () => {
    it('queries the allowed list with the right privacyType', async () => {
      PrivacyAllowedContact.findOne.mockResolvedValue({ _id: 'al-1' });
      const user = makeUser({ settings: { privacy: { profilePhoto: 'only_share_with' } } });
      await applyPrivacyFilter(user, CONTACT_ID);
      expect(PrivacyAllowedContact.findOne).toHaveBeenCalledWith({
        ownerUserId: OWNER_ID,
        privacyType: 'profile_photo',
        allowedContactId: CONTACT_ID
      });
    });

    it('allows an allowed contact to see the profile photo', async () => {
      PrivacyAllowedContact.findOne.mockResolvedValue({ _id: 'al-1' });
      const user = makeUser({ settings: { privacy: { profilePhoto: 'only_share_with' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.profilePicture).toBeDefined();
    });

    it('hides the field from a contact not on the allowed list', async () => {
      PrivacyAllowedContact.findOne.mockResolvedValue(null);
      const user = makeUser({ settings: { privacy: { profilePhoto: 'only_share_with' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.profilePicture).toBeUndefined();
    });

    it('degrades gracefully (denies) when the allowed-list query fails', async () => {
      PrivacyAllowedContact.findOne.mockRejectedValue(new Error('db down'));
      const user = makeUser({ settings: { privacy: { profilePhoto: 'only_share_with' } } });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.profilePicture).toBeUndefined();
    });
  });

  describe('online: same_as_last_seen', () => {
    it('inherits the lastSeen setting — hidden when lastSeen is nobody', async () => {
      const user = makeUser({
        settings: { privacy: { lastSeen: 'nobody', online: 'same_as_last_seen' } }
      });
      const result = await applyPrivacyFilter(user, CONTACT_ID);
      expect(result.isOnline).toBeUndefined();
      expect(result.lastSeen).toBeUndefined();
    });

    it('inherits the lastSeen setting — visible when lastSeen is everyone', async () => {
      const user = makeUser({
        settings: { privacy: { lastSeen: 'everyone', online: 'same_as_last_seen' } }
      });
      const result = await applyPrivacyFilter(user, STRANGER_ID);
      expect(result.isOnline).toBeDefined();
    });
  });

  describe('unknown / unset setting values', () => {
    it('defaults to allowed for an unrecognized value', async () => {
      const user = makeUser({ settings: { privacy: { lastSeen: 'spies-only' } } });
      const result = await applyPrivacyFilter(user, STRANGER_ID);
      expect(result.lastSeen).toBeDefined();
    });

    it('defaults to allowed when no privacy settings exist', async () => {
      const user = makeUser({ settings: {} });
      const result = await applyPrivacyFilter(user, STRANGER_ID);
      expect(result.lastSeen).toBeDefined();
    });
  });
});

describe('applyPrivacyFilter — PII stripping', () => {
  it('strips contacts, settings, and encryption material for non-owners', async () => {
    const result = await applyPrivacyFilter(makeUser(), STRANGER_ID);
    expect(result.contacts).toBeUndefined();
    expect(result.settings).toBeUndefined();
    expect(result.encryptionKeys).toBeUndefined();
    expect(result.publicKey).toBeUndefined();
  });

  it('strips about and bio together when about is restricted', async () => {
    const user = makeUser({ settings: { privacy: { about: 'nobody' } } });
    const result = await applyPrivacyFilter(user, STRANGER_ID);
    expect(result.about).toBeUndefined();
    expect(result.bio).toBeUndefined();
  });

  it('handles a mongoose document via toObject()', async () => {
    const doc = makeMongooseDoc(makeUser({ settings: { privacy: { lastSeen: 'nobody' } } }));
    const result = await applyPrivacyFilter(doc, STRANGER_ID);
    expect(result.lastSeen).toBeUndefined();
    expect(result.contacts).toBeUndefined();
  });

  it('returns null/undefined users untouched', async () => {
    expect(await applyPrivacyFilter(null, STRANGER_ID)).toBeNull();
    expect(await applyPrivacyFilter(undefined, STRANGER_ID)).toBeUndefined();
  });
});

describe('privacyMiddleware', () => {
  const makeRes = () => {
    const res = {};
    res.json = jest.fn();
    return res;
  };

  it('filters a single user in the response', async () => {
    const res = makeRes();
    const originalJson = res.json;
    const next = jest.fn();
    await privacyMiddleware({ user: { _id: STRANGER_ID } }, res, next);
    const user = makeUser({ settings: { privacy: { lastSeen: 'nobody' } } });
    await res.json({ user });
    expect(originalJson).toHaveBeenCalledTimes(1);
    expect(originalJson.mock.calls[0][0].user.lastSeen).toBeUndefined();
    expect(originalJson.mock.calls[0][0].user.contacts).toBeUndefined();
  });

  it('filters arrays of users, participants, and members', async () => {
    const res = makeRes();
    const originalJson = res.json;
    const next = jest.fn();
    await privacyMiddleware({ user: { _id: STRANGER_ID } }, res, next);
    const hidden = makeUser({ settings: { privacy: { lastSeen: 'nobody' } } });
    const data = {
      users: [hidden],
      participants: [hidden],
      members: [hidden]
    };
    await res.json(data);
    const filtered = originalJson.mock.calls[0][0];
    expect(filtered.users[0].lastSeen).toBeUndefined();
    expect(filtered.participants[0].lastSeen).toBeUndefined();
    expect(filtered.members[0].lastSeen).toBeUndefined();
  });

  it('leaves responses without user data untouched', async () => {
    const res = makeRes();
    const originalJson = res.json;
    const next = jest.fn();
    await privacyMiddleware({ user: { _id: STRANGER_ID } }, res, next);
    await res.json({ message: 'ok' });
    expect(originalJson).toHaveBeenCalledTimes(1);
    expect(originalJson.mock.calls[0][0]).toEqual({ message: 'ok' });
  });

  it('leaves responses untouched when there is no authenticated requester', async () => {
    const res = makeRes();
    const originalJson = res.json;
    const next = jest.fn();
    await privacyMiddleware({}, res, next);
    await res.json({ user: makeUser() });
    expect(originalJson).toHaveBeenCalledTimes(1);
    expect(originalJson.mock.calls[0][0].user.lastSeen).toBeDefined();
  });

  it('calls next()', async () => {
    const next = jest.fn();
    await privacyMiddleware({}, makeRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe('checkPrivacyPermission / filterUserData', () => {
  it('allows the owner for any field', async () => {
    expect(await checkPrivacyPermission(makeUser(), OWNER_ID, 'lastSeen')).toBe(true);
  });

  it('returns false without a user or requester', async () => {
    expect(await checkPrivacyPermission(null, STRANGER_ID, 'lastSeen')).toBe(false);
    expect(await checkPrivacyPermission(makeUser(), null, 'lastSeen')).toBe(false);
  });

  it('everyone → true for a stranger', async () => {
    expect(await checkPrivacyPermission(makeUser(), STRANGER_ID, 'lastSeen')).toBe(true);
  });

  it('contacts → true only for contacts', async () => {
    const user = makeUser({ settings: { privacy: { lastSeen: 'contacts' } } });
    expect(await checkPrivacyPermission(user, CONTACT_ID, 'lastSeen')).toBe(true);
    expect(await checkPrivacyPermission(user, STRANGER_ID, 'lastSeen')).toBe(false);
  });

  it('contacts → recognizes subdocument contacts ({ user, savedName })', async () => {
    const user = makeUser({
      contacts: [{ user: CONTACT_ID, savedName: 'Bob' }],
      settings: { privacy: { lastSeen: 'contacts' } }
    });
    expect(await checkPrivacyPermission(user, CONTACT_ID, 'lastSeen')).toBe(true);
    expect(await checkPrivacyPermission(user, STRANGER_ID, 'lastSeen')).toBe(false);
  });

  it('nobody → false for everyone else', async () => {
    const user = makeUser({ settings: { privacy: { lastSeen: 'nobody' } } });
    expect(await checkPrivacyPermission(user, CONTACT_ID, 'lastSeen')).toBe(false);
  });

  it('filterUserData delegates to applyPrivacyFilter', async () => {
    const user = makeUser({ settings: { privacy: { lastSeen: 'nobody' } } });
    const result = await filterUserData(user, STRANGER_ID);
    expect(result.lastSeen).toBeUndefined();
  });
});
