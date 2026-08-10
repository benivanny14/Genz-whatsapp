jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/PrivacyExcludedContact', () => {
  const Mock = jest.fn();
  Mock.find = jest.fn();
  Mock.findOne = jest.fn();
  Mock.create = jest.fn();
  Mock.findOneAndDelete = jest.fn();
  Mock.bulkWrite = jest.fn();
  Mock.deleteMany = jest.fn();
  return Mock;
});

jest.mock('../models/PrivacyAllowedContact', () => {
  const Mock = jest.fn();
  Mock.find = jest.fn();
  Mock.findOne = jest.fn();
  Mock.create = jest.fn();
  Mock.findOneAndDelete = jest.fn();
  Mock.bulkWrite = jest.fn();
  Mock.deleteMany = jest.fn();
  return Mock;
});

const User = require('../models/User');
const PrivacyExcludedContact = require('../models/PrivacyExcludedContact');
const PrivacyAllowedContact = require('../models/PrivacyAllowedContact');
const privacyController = require('../controllers/privacyController');
const privacyContacts = require('../controllers/privacyContactsController');

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
  query: {},
  user: { _id: 'user-1', username: 'alice' },
  ...overrides
});

const makeUser = (overrides = {}) => ({
  _id: 'user-1',
  username: 'alice',
  privacyModsSettings: {},
  blockAlerts: [{ type: 'block', at: new Date() }],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('privacyController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await privacyController.getPrivacyModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged default settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ privacyModsSettings: { ghostMode: true } }));
    const res = makeRes();
    await privacyController.getPrivacyModsSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.ghostMode).toBe(true);
    expect(res.body.settings.freezeLastSeen).toBe(false); // from defaults
  });

  it('updates settings by deep-merging with defaults (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await privacyController.updatePrivacyModsSettings(
      makeReq({ body: { settings: { ghostMode: true, hideOnline: true } } }),
      res
    );
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.ghostMode).toBe(true);
    expect(res.body.settings.hideOnline).toBe(true);
  });

  it('toggles a single setting (happy path)', async () => {
    const user = makeUser({ privacyModsSettings: { ghostMode: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await privacyController.toggleGhostMode(makeReq(), res);
    expect(res.body.ghostMode).toBe(true);
  });

  it.each([
    ['toggleFreezeLastSeen', 'freezeLastSeen'],
    ['toggleHideOnline', 'hideOnline'],
    ['toggleAntiViewOnce', 'antiViewOnce'],
    ['toggleDisableForwardedTag', 'disableForwardedTag'],
    ['toggleHideStatusView', 'hideStatusView'],
    ['toggleHideReadReceipts', 'hideReadReceipts'],
    ['toggleWhoViewedProfile', 'whoViewedProfile'],
    ['toggleContactOnlineNotifier', 'contactOnlineNotifier'],
    ['toggleAutoDownloadStatus', 'autoDownloadStatus'],
    ['toggleLanguagePerChat', 'languagePerChat'],
    ['toggleCustomTickPerContact', 'customTickPerContact'],
    ['toggleCustomEmojiStyle', 'customEmojiStyle'],
    ['toggleBlockAlerts', 'blockAlerts']
  ])('toggles %s (happy path)', async (handler, field) => {
    const user = makeUser({ privacyModsSettings: { [field]: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await privacyController[handler](makeReq(), res);
    expect(res.body[field]).toBe(true);
    expect(user.markModified).toHaveBeenCalledWith('privacyModsSettings');
    expect(user.save).toHaveBeenCalled();
  });

  it('toggles a field that is already enabled back to false (happy path)', async () => {
    const user = makeUser({ privacyModsSettings: { hideOnline: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await privacyController.toggleHideOnline(makeReq(), res);
    expect(res.body.hideOnline).toBe(false);
  });

  it('returns 401 for a toggle when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await privacyController.toggleFreezeLastSeen(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 500 for a toggle when saving fails (error)', async () => {
    const user = makeUser();
    user.save.mockRejectedValue(new Error('db down'));
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await privacyController.toggleGhostMode(makeReq(), res);
    expect(res.statusCode).toBe(500);
  });

  it('returns block alerts (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await privacyController.getBlockAlerts(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.alerts).toHaveLength(1);
  });

  it('clears block alerts (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await privacyController.clearBlockAlerts(makeReq(), res);
    expect(user.blockAlerts).toEqual([]);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });
});

describe('privacyContactsController — excluded contacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists excluded contacts for a privacy type (happy path)', async () => {
    const chain = { sort: jest.fn().mockResolvedValue([{ excludedContactId: 'c1' }]) };
    PrivacyExcludedContact.find.mockReturnValue(chain);
    const res = makeRes();
    await privacyContacts.getExcludedContacts(makeReq({ params: { privacyType: 'last_seen' } }), res);
    expect(PrivacyExcludedContact.find).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      privacyType: 'last_seen'
    });
    expect(res.body.excludedContacts).toHaveLength(1);
  });

  it('rejects adding an excluded contact without privacyType/contactId (validation)', async () => {
    const res = makeRes();
    await privacyContacts.addExcludedContact(makeReq({ body: { contactName: 'bob' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('returns the existing record when a contact is already excluded', async () => {
    PrivacyExcludedContact.findOne.mockResolvedValue({ _id: 'ex-1' });
    const res = makeRes();
    await privacyContacts.addExcludedContact(
      makeReq({ body: { privacyType: 'last_seen', contactId: 'c1' } }),
      res
    );
    expect(res.body.message).toBe('Already excluded');
    expect(PrivacyExcludedContact.create).not.toHaveBeenCalled();
  });

  it('adds an excluded contact (happy path)', async () => {
    PrivacyExcludedContact.findOne.mockResolvedValue(null);
    PrivacyExcludedContact.create.mockResolvedValue({ _id: 'ex-1', excludedContactId: 'c1' });
    const res = makeRes();
    await privacyContacts.addExcludedContact(
      makeReq({ body: { privacyType: 'last_seen', contactId: 'c1', contactName: 'bob' } }),
      res
    );
    expect(PrivacyExcludedContact.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerUserId: 'user-1',
      excludedContactId: 'c1'
    }));
    expect(res.body.excludedContact._id).toBe('ex-1');
  });

  it('removes an excluded contact (happy path)', async () => {
    PrivacyExcludedContact.findOneAndDelete.mockResolvedValue({ _id: 'ex-1' });
    const res = makeRes();
    await privacyContacts.removeExcludedContact(
      makeReq({ params: { contactId: 'c1' }, query: { privacyType: 'last_seen' } }),
      res
    );
    expect(PrivacyExcludedContact.findOneAndDelete).toHaveBeenCalledWith({
      ownerUserId: 'user-1',
      privacyType: 'last_seen',
      excludedContactId: 'c1'
    });
    expect(res.body.success).toBe(true);
  });

  it('rejects a bulk add without a contacts array (validation)', async () => {
    const res = makeRes();
    await privacyContacts.bulkAddExcludedContacts(makeReq({ body: { privacyType: 'last_seen' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('bulk-adds excluded contacts (happy path)', async () => {
    PrivacyExcludedContact.bulkWrite.mockResolvedValue({});
    PrivacyExcludedContact.find.mockReturnValue({ then: jest.fn((resolve) => resolve([{ _id: 'ex-1' }])) });
    const res = makeRes();
    await privacyContacts.bulkAddExcludedContacts(
      makeReq({ body: { privacyType: 'last_seen', contacts: [{ id: 'c1', name: 'bob' }] } }),
      res
    );
    expect(PrivacyExcludedContact.bulkWrite).toHaveBeenCalledWith(expect.any(Array));
    expect(res.body.excludedContacts).toHaveLength(1);
  });

  it('clears all excluded contacts for a privacy type (happy path)', async () => {
    PrivacyExcludedContact.deleteMany.mockResolvedValue({ deletedCount: 2 });
    const res = makeRes();
    await privacyContacts.clearExcludedContacts(makeReq({ params: { privacyType: 'last_seen' } }), res);
    expect(res.body.message).toMatch(/cleared/i);
  });
});

describe('privacyContactsController — allowed contacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lists allowed contacts for a privacy type (happy path)', async () => {
    const chain = { sort: jest.fn().mockResolvedValue([{ allowedContactId: 'c1' }]) };
    PrivacyAllowedContact.find.mockReturnValue(chain);
    const res = makeRes();
    await privacyContacts.getAllowedContacts(makeReq({ params: { privacyType: 'status' } }), res);
    expect(res.body.allowedContacts).toHaveLength(1);
  });

  it('rejects adding an allowed contact without required fields (validation)', async () => {
    const res = makeRes();
    await privacyContacts.addAllowedContact(makeReq({ body: { contactName: 'bob' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('adds an allowed contact (happy path)', async () => {
    PrivacyAllowedContact.findOne.mockResolvedValue(null);
    PrivacyAllowedContact.create.mockResolvedValue({ _id: 'al-1', allowedContactId: 'c1' });
    const res = makeRes();
    await privacyContacts.addAllowedContact(
      makeReq({ body: { privacyType: 'status', contactId: 'c1', contactName: 'bob' } }),
      res
    );
    expect(PrivacyAllowedContact.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerUserId: 'user-1',
      allowedContactId: 'c1'
    }));
    expect(res.body.allowedContact._id).toBe('al-1');
  });

  it('removes an allowed contact (happy path)', async () => {
    PrivacyAllowedContact.findOneAndDelete.mockResolvedValue({ _id: 'al-1' });
    const res = makeRes();
    await privacyContacts.removeAllowedContact(
      makeReq({ params: { contactId: 'c1' }, query: { privacyType: 'status' } }),
      res
    );
    expect(res.body.success).toBe(true);
  });
});
