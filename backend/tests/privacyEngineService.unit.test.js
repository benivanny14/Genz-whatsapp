/**
 * Unit tests for the shared privacy engine service
 * (services/privacyEngineService.js) — the single source of truth for
 * contact detection and isAllowed decisions used by the permission engine,
 * the privacy middleware, and the socket paths.
 */

jest.mock('../models/PrivacyExcludedContact', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/PrivacyAllowedContact', () => ({
  findOne: jest.fn()
}));

const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');
const PrivacyAllowedContact = require('../models/PrivacyAllowedContact');
const {
  getContactId,
  isContact,
  isExcluded,
  isAllowedContact,
  isAllowed,
  getSettingValue,
  resolveOnlineSetting,
  canSeePresence,
  canViewStatus,
} = require('../services/privacyEngineService');

const OWNER_ID = 'owner-1';

const makeUser = (overrides = {}) => ({
  _id: OWNER_ID,
  username: 'alice',
  contacts: ['contact-1'],
  settings: {
    privacy: {
      lastSeen: 'everyone',
      online: 'same_as_last_seen',
      profilePhoto: 'everyone',
      about: 'everyone'
    }
  },
  ...overrides
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getContactId', () => {
  it('extracts the nested id from { user, savedName } subdocs', () => {
    expect(String(getContactId({ user: 'u-1', savedName: 'Bob' }))).toBe('u-1');
  });

  it('falls back to the raw id for plain entries', () => {
    expect(String(getContactId('u-2'))).toBe('u-2');
    expect(String(getContactId({ userId: 'u-3' }))).toBe('u-3');
  });

  it('returns null for empty entries', () => {
    expect(getContactId(null)).toBeNull();
    expect(getContactId(undefined)).toBeNull();
  });
});

describe('isContact', () => {
  it('matches plain ObjectIds/strings in the contacts array', () => {
    expect(isContact(makeUser(), 'contact-1')).toBe(true);
    expect(isContact(makeUser(), 'stranger-1')).toBe(false);
  });

  it('matches { user, savedName } subdocuments (the real storage shape)', () => {
    const user = makeUser({ contacts: [{ user: 'contact-1', savedName: 'Bob' }] });
    expect(isContact(user, 'contact-1')).toBe(true);
    expect(isContact(user, 'contact-2')).toBe(false);
  });

  it('is false when the user or requester is missing', () => {
    expect(isContact(null, 'contact-1')).toBe(false);
    expect(isContact(makeUser(), null)).toBe(false);
    expect(isContact(makeUser({ contacts: undefined }), 'contact-1')).toBe(false);
  });
});

describe('isExcluded / isAllowedContact', () => {
  it('queries the excluded records collection', async () => {
    PrivacyExcludedContact.findOne.mockResolvedValue({ _id: 'x' });
    await expect(isExcluded(OWNER_ID, 'last_seen', 'contact-1')).resolves.toBe(true);
    expect(PrivacyExcludedContact.findOne).toHaveBeenCalledWith({
      ownerUserId: OWNER_ID,
      privacyType: 'last_seen',
      excludedContactId: 'contact-1'
    });

    PrivacyExcludedContact.findOne.mockResolvedValue(null);
    await expect(isExcluded(OWNER_ID, 'last_seen', 'contact-1')).resolves.toBe(false);
  });

  it('queries the allowed records collection', async () => {
    PrivacyAllowedContact.findOne.mockResolvedValue({ _id: 'a' });
    await expect(isAllowedContact(OWNER_ID, 'status', 'contact-1')).resolves.toBe(true);
    expect(PrivacyAllowedContact.findOne).toHaveBeenCalledWith({
      ownerUserId: OWNER_ID,
      privacyType: 'status',
      allowedContactId: 'contact-1'
    });
  });

  it('treats DB errors as not-excluded / not-allowed', async () => {
    PrivacyExcludedContact.findOne.mockRejectedValue(new Error('db down'));
    PrivacyAllowedContact.findOne.mockRejectedValue(new Error('db down'));
    await expect(isExcluded(OWNER_ID, 'last_seen', 'x')).resolves.toBe(false);
    await expect(isAllowedContact(OWNER_ID, 'status', 'x')).resolves.toBe(false);
  });
});

describe('isAllowed', () => {
  it('everyone → true for anyone', async () => {
    await expect(isAllowed(makeUser(), 'stranger', 'everyone', 'last_seen')).resolves.toBe(true);
  });

  it('contacts → only contact list members', async () => {
    const user = makeUser({ contacts: [{ user: 'contact-1', savedName: 'B' }] });
    await expect(isAllowed(user, 'contact-1', 'contacts', 'last_seen')).resolves.toBe(true);
    await expect(isAllowed(user, 'stranger', 'contacts', 'last_seen')).resolves.toBe(false);
  });

  it('contacts_except → contacts minus the exclusion list', async () => {
    const user = makeUser({ contacts: [{ user: 'contact-1', savedName: 'B' }] });
    PrivacyExcludedContact.findOne.mockResolvedValue(null);
    await expect(isAllowed(user, 'contact-1', 'contacts_except', 'last_seen')).resolves.toBe(true);

    PrivacyExcludedContact.findOne.mockResolvedValue({ _id: 'x' });
    await expect(isAllowed(user, 'contact-1', 'contacts_except', 'last_seen')).resolves.toBe(false);
    expect(PrivacyExcludedContact.findOne).toHaveBeenCalledWith({
      ownerUserId: OWNER_ID,
      privacyType: 'last_seen',
      excludedContactId: 'contact-1'
    });
  });

  it('contacts_except → false for non-contacts without a DB query', async () => {
    const user = makeUser({ contacts: [] });
    await expect(isAllowed(user, 'stranger', 'contacts_except', 'last_seen')).resolves.toBe(false);
    expect(PrivacyExcludedContact.findOne).not.toHaveBeenCalled();
  });

  it('nobody → false for everyone', async () => {
    await expect(isAllowed(makeUser(), 'contact-1', 'nobody', 'last_seen')).resolves.toBe(false);
  });

  it('only_share_with → only allowed-list members', async () => {
    PrivacyAllowedContact.findOne.mockResolvedValue({ _id: 'a' });
    await expect(isAllowed(makeUser(), 'contact-1', 'only_share_with', 'status')).resolves.toBe(true);

    PrivacyAllowedContact.findOne.mockResolvedValue(null);
    await expect(isAllowed(makeUser(), 'contact-1', 'only_share_with', 'status')).resolves.toBe(false);
  });

  it('unknown/undefined value defaults to allowed (legacy behavior)', async () => {
    await expect(isAllowed(makeUser(), 'stranger', undefined, 'last_seen')).resolves.toBe(true);
  });
});

describe('getSettingValue', () => {
  it('reads camelCase settings keys from a snake_case record type', () => {
    const settings = { privacy: { lastSeen: 'contacts', profilePhoto: 'nobody' } };
    expect(getSettingValue(settings.privacy, 'last_seen')).toBe('contacts');
    expect(getSettingValue(settings.privacy, 'profile_photo')).toBe('nobody');
  });

  it('falls back to the raw key for camelCase callers', () => {
    const settings = { privacy: { lastSeen: 'nobody' } };
    expect(getSettingValue(settings.privacy, 'lastSeen')).toBe('nobody');
  });
});

describe('resolveOnlineSetting', () => {
  it("follows lastSeen when online is 'same_as_last_seen'", () => {
    expect(resolveOnlineSetting({ online: 'same_as_last_seen', lastSeen: 'contacts' })).toBe('contacts');
    expect(resolveOnlineSetting({ online: 'everyone', lastSeen: 'contacts' })).toBe('everyone');
    expect(resolveOnlineSetting({})).toBeUndefined();
  });
});

describe('canSeePresence', () => {
  it('allows contacts when online follows lastSeen=contacts', async () => {
    const user = makeUser({
      contacts: [{ user: 'contact-1', savedName: 'B' }],
      settings: { privacy: { online: 'same_as_last_seen', lastSeen: 'contacts' } }
    });
    await expect(canSeePresence(user, 'contact-1')).resolves.toBe(true);
    await expect(canSeePresence(user, 'stranger')).resolves.toBe(false);
  });

  it('denies excluded contacts for lastSeen=contacts_except (presence follows last-seen exclusions)', async () => {
    const user = makeUser({
      contacts: [{ user: 'contact-1', savedName: 'B' }],
      settings: { privacy: { online: 'same_as_last_seen', lastSeen: 'contacts_except' } }
    });
    PrivacyExcludedContact.findOne.mockResolvedValue({ _id: 'x' });
    await expect(canSeePresence(user, 'contact-1')).resolves.toBe(false);
    expect(PrivacyExcludedContact.findOne).toHaveBeenCalledWith({
      ownerUserId: OWNER_ID,
      privacyType: 'last_seen',
      excludedContactId: 'contact-1'
    });

    PrivacyExcludedContact.findOne.mockResolvedValue(null);
    await expect(canSeePresence(user, 'contact-1')).resolves.toBe(true);
  });

  it('denies everyone for nobody', async () => {
    const user = makeUser({ settings: { privacy: { online: 'same_as_last_seen', lastSeen: 'nobody' } } });
    await expect(canSeePresence(user, 'contact-1')).resolves.toBe(false);
  });
});

describe('canViewStatus', () => {
  const status = (overrides = {}) => ({
    userId: OWNER_ID,
    privacy: 'everyone',
    excludedViewers: [],
    includedViewers: [],
    ...overrides
  });

  it('lets the owner always see their own status', () => {
    expect(canViewStatus(status({ privacy: 'nobody' }), OWNER_ID)).toBe(true);
    expect(canViewStatus(status({ privacy: 'only_me' }), OWNER_ID)).toBe(true);
    expect(canViewStatus(status({ privacy: 'contacts' }), OWNER_ID, { contacts: [] })).toBe(true);
  });

  it('everyone → anyone can view', () => {
    expect(canViewStatus(status(), 'stranger')).toBe(true);
  });

  it('nobody/only_me → only the owner', () => {
    expect(canViewStatus(status({ privacy: 'nobody' }), 'stranger')).toBe(false);
    expect(canViewStatus(status({ privacy: 'only_me' }), 'stranger')).toBe(false);
  });

  it('contacts_except → excludes listed viewers, allows other contacts', () => {
    const s = status({
      privacy: 'contacts_except',
      excludedViewers: ['contact-2']
    });
    const owner = { contacts: [{ user: 'contact-1' }, { user: 'contact-2' }] };
    expect(canViewStatus(s, 'contact-1', owner)).toBe(true);
    expect(canViewStatus(s, 'contact-2', owner)).toBe(false);
    expect(canViewStatus(s, 'stranger', owner)).toBe(false);
  });

  it('only_share_with → only included viewers', () => {
    const s = status({ privacy: 'only_share_with', includedViewers: ['contact-1'] });
    expect(canViewStatus(s, 'contact-1')).toBe(true);
    expect(canViewStatus(s, 'contact-2')).toBe(false);
  });

  it('contacts → requires contact membership', () => {
    const s = status({ privacy: 'contacts' });
    const owner = { contacts: [{ user: 'contact-1' }] };
    expect(canViewStatus(s, 'contact-1', owner)).toBe(true);
    expect(canViewStatus(s, 'stranger', owner)).toBe(false);
  });

  it('returns false for a missing status', () => {
    expect(canViewStatus(null, 'x')).toBe(false);
  });
});

