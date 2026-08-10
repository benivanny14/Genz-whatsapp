jest.mock('../models/Conversation', () => ({
  find: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

const Conversation = require('../models/Conversation');
const User = require('../models/User');
const chatOrg = require('../controllers/chatOrganizationController');

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
  chatFilterSettings: undefined,
  chatSortSettings: undefined,
  savedFilterPreferences: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const conv = (overrides = {}) => ({
  _id: overrides._id || 'c1',
  name: 'Chat',
  isGroup: false,
  unreadCount: 0,
  isMuted: false,
  isArchived: false,
  isPinned: false,
  updatedAt: new Date('2025-01-01T00:00:00Z'),
  ...overrides
});

// getUserConversations uses Conversation.find(...).populate('participants', ...)
const conversationsChain = (result) => ({ populate: jest.fn().mockResolvedValue(result) });

describe('chatOrganizationController — chat filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getChatFilterSettings returns 401 when user cannot be resolved', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatOrg.getChatFilterSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('getChatFilterSettings returns defaults merged with stored (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatFilterSettings: { showFilterBadges: false } }));
    const res = makeRes();
    await chatOrg.getChatFilterSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.showFilterBadges).toBe(false);
    expect(res.body.settings.chatFiltersEnabled).toBe(true); // default
    expect(res.body.settings.maxSavedFilters).toBe(10); // default
  });

  it('updateChatFilterSettings merges incoming settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.updateChatFilterSettings(makeReq({ body: { settings: { autoApplyFilters: true } } }), res);
    expect(user.chatFilterSettings.autoApplyFilters).toBe(true);
    expect(user.markModified).toHaveBeenCalledWith('chatFilterSettings');
    expect(user.save).toHaveBeenCalled();
  });

  it('filterConversations rejects when filters are disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatFilterSettings: { chatFiltersEnabled: false } }));
    const res = makeRes();
    await chatOrg.filterConversations(makeReq({ body: { type: ['group'] } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Chat filters are disabled');
  });

  it('filterConversations filters by type/status/time (happy path)', async () => {
    const conversations = [
      conv({ _id: 'c1', name: 'Group A', isGroup: true, updatedAt: new Date() }),
      conv({ _id: 'c2', name: 'Contact B', isGroup: false, isMuted: true, unreadCount: 3, updatedAt: new Date() }),
      conv({ _id: 'c3', name: 'Old', isGroup: false, updatedAt: new Date('2020-01-01T00:00:00Z') })
    ];
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockReturnValue(conversationsChain(conversations));
    const res = makeRes();
    await chatOrg.filterConversations(makeReq({ body: { type: ['contact'], status: ['muted'], time: 'week' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.conversations.map((c) => c._id)).toEqual(['c2']);
    expect(res.body.filterCount).toBe(2);
  });

  it('filterConversations returns everything for no filters (happy path)', async () => {
    const conversations = [conv(), conv({ _id: 'c2', isGroup: true })];
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockReturnValue(conversationsChain(conversations));
    const res = makeRes();
    await chatOrg.filterConversations(makeReq({ body: {} }), res);
    expect(res.body.conversations).toHaveLength(2);
    expect(res.body.filterCount).toBe(0);
  });

  it('saveFilterPreference validates name and filters', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatOrg.saveFilterPreference(makeReq({ body: { name: 'x' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('saveFilterPreference rejects when saving is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatFilterSettings: { saveFilterPreferences: false } }));
    const res = makeRes();
    await chatOrg.saveFilterPreference(makeReq({ body: { name: 'x', filters: { type: ['group'] } } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('saveFilterPreference enforces the max saved filters limit', async () => {
    const prefs = Array.from({ length: 10 }, (_, i) => ({ _id: `p${i}`, name: `n${i}` }));
    User.findById.mockResolvedValue(makeUser({ savedFilterPreferences: prefs }));
    const res = makeRes();
    await chatOrg.saveFilterPreference(makeReq({ body: { name: 'x', filters: {} } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Maximum 10 saved filters allowed');
  });

  it('saveFilterPreference saves a new preference (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.saveFilterPreference(makeReq({ body: { name: 'Work', filters: { type: ['group'] } } }), res);
    expect(res.statusCode).toBe(200);
    expect(user.savedFilterPreferences).toHaveLength(1);
    expect(user.savedFilterPreferences[0].name).toBe('Work');
    expect(user.savedFilterPreferences[0].filters).toEqual({ type: ['group'] });
    expect(res.body.savedPreference.name).toBe('Work');
  });

  it('getSavedFilterPreferences returns stored preferences (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ savedFilterPreferences: [{ _id: 'p1', name: 'Work' }] }));
    const res = makeRes();
    await chatOrg.getSavedFilterPreferences(makeReq(), res);
    expect(res.body.preferences).toHaveLength(1);
  });

  it('deleteSavedFilterPreference returns 404 for unknown ids', async () => {
    User.findById.mockResolvedValue(makeUser({ savedFilterPreferences: [{ _id: 'p1' }] }));
    const res = makeRes();
    await chatOrg.deleteSavedFilterPreference(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deleteSavedFilterPreference removes a preference (happy path)', async () => {
    const user = makeUser({ savedFilterPreferences: [{ _id: 'p1' }, { _id: 'p2' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.deleteSavedFilterPreference(makeReq({ params: { id: 'p1' } }), res);
    expect(user.savedFilterPreferences).toHaveLength(1);
    expect(user.savedFilterPreferences[0]._id).toBe('p2');
    expect(user.save).toHaveBeenCalled();
  });

  it('applySavedFilterPreference returns 404 for unknown ids', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatOrg.applySavedFilterPreference(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('applySavedFilterPreference applies the stored filters (happy path)', async () => {
    const conversations = [
      conv({ _id: 'c1', isGroup: true }),
      conv({ _id: 'c2', isGroup: false })
    ];
    User.findById.mockResolvedValue(makeUser({ savedFilterPreferences: [{ _id: 'p1', name: 'Groups', filters: { type: ['group'] } }] }));
    Conversation.find.mockReturnValue(conversationsChain(conversations));
    const res = makeRes();
    await chatOrg.applySavedFilterPreference(makeReq({ params: { id: 'p1' } }), res);
    expect(res.body.conversations.map((c) => c._id)).toEqual(['c1']);
    expect(res.body.filters).toEqual({ type: ['group'] });
  });

  it('toggleChatFilter accepts an explicit flag', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.toggleChatFilter(makeReq({ body: { enabled: false } }), res);
    expect(user.chatFilterSettings.chatFiltersEnabled).toBe(false);
  });

  it('toggleChatFilter flips the current value when absent', async () => {
    const user = makeUser({ chatFilterSettings: { chatFiltersEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.toggleChatFilter(makeReq({ body: {} }), res);
    expect(user.chatFilterSettings.chatFiltersEnabled).toBe(true);
  });

  it('resetChatFilterSettings restores defaults (happy path)', async () => {
    const user = makeUser({ chatFilterSettings: { chatFiltersEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.resetChatFilterSettings(makeReq(), res);
    expect(user.chatFilterSettings.chatFiltersEnabled).toBe(true);
    expect(user.markModified).toHaveBeenCalledWith('chatFilterSettings');
    expect(user.save).toHaveBeenCalled();
  });
});

describe('chatOrganizationController — chat sort', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getChatSortSettings returns 401 when user missing', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatOrg.getChatSortSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('getChatSortSettings returns defaults merged with stored (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSortSettings: { defaultSort: 'alphabetical' } }));
    const res = makeRes();
    await chatOrg.getChatSortSettings(makeReq(), res);
    expect(res.body.settings.defaultSort).toBe('alphabetical');
    expect(res.body.settings.chatSortEnabled).toBe(true); // default
    expect(res.body.settings.groupPinnedFirst).toBe(true); // default
  });

  it('updateChatSortSettings merges incoming settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.updateChatSortSettings(makeReq({ body: { settings: { ascending: true } } }), res);
    expect(user.chatSortSettings.ascending).toBe(true);
    expect(user.markModified).toHaveBeenCalledWith('chatSortSettings');
    expect(user.save).toHaveBeenCalled();
  });

  it('sortConversations rejects when sort is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSortSettings: { chatSortEnabled: false } }));
    const res = makeRes();
    await chatOrg.sortConversations(makeReq({ body: { sortBy: 'recent' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('sortConversations sorts by recency descending by default (happy path)', async () => {
    const conversations = [
      conv({ _id: 'c1', updatedAt: new Date('2025-01-01T00:00:00Z') }),
      conv({ _id: 'c2', updatedAt: new Date('2025-06-01T00:00:00Z') }),
      conv({ _id: 'c3', updatedAt: new Date('2025-03-01T00:00:00Z') })
    ];
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockReturnValue(conversationsChain(conversations));
    const res = makeRes();
    await chatOrg.sortConversations(makeReq({ body: { sortBy: 'recent' } }), res);
    expect(res.body.conversations.map((c) => c._id)).toEqual(['c2', 'c3', 'c1']);
    expect(res.body.sortBy).toBe('recent');
  });

  it('sortConversations sorts alphabetically ascending (happy path)', async () => {
    const conversations = [
      conv({ _id: 'c1', name: 'Zebra' }),
      conv({ _id: 'c2', name: 'apple' })
    ];
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockReturnValue(conversationsChain(conversations));
    const res = makeRes();
    await chatOrg.sortConversations(makeReq({ body: { sortBy: 'alphabetical', ascending: true } }), res);
    expect(res.body.conversations.map((c) => c._id)).toEqual(['c2', 'c1']);
  });

  it('sortConversations moves pinned chats first when configured', async () => {
    const conversations = [
      conv({ _id: 'c1', updatedAt: new Date('2025-01-01T00:00:00Z') }),
      conv({ _id: 'c2', isPinned: true, updatedAt: new Date('2025-06-01T00:00:00Z') })
    ];
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockReturnValue(conversationsChain(conversations));
    const res = makeRes();
    await chatOrg.sortConversations(makeReq({ body: { sortBy: 'recent' } }), res);
    expect(res.body.conversations.map((c) => c._id)).toEqual(['c2', 'c1']);
  });

  it('saveCustomSortOrder validates the input (400)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatOrg.saveCustomSortOrder(makeReq({ body: { conversationIds: 'c1' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('saveCustomSortOrder rejects when saving is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSortSettings: { saveSortPreference: false } }));
    const res = makeRes();
    await chatOrg.saveCustomSortOrder(makeReq({ body: { conversationIds: ['c1'] } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('saveCustomSortOrder rejects ids the user cannot access', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([conv({ _id: 'c1' })]);
    const res = makeRes();
    await chatOrg.saveCustomSortOrder(makeReq({ body: { conversationIds: ['c1', 'c2'] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Some conversations not found or not accessible');
  });

  it('saveCustomSortOrder persists the order (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    Conversation.find.mockResolvedValue([conv({ _id: 'c1' }), conv({ _id: 'c2' })]);
    const res = makeRes();
    await chatOrg.saveCustomSortOrder(makeReq({ body: { conversationIds: ['c1', 'c2'] } }), res);
    expect(user.chatSortSettings.customSortOrder).toEqual(['c1', 'c2']);
    expect(user.chatSortSettings.defaultSort).toBe('custom');
    expect(user.markModified).toHaveBeenCalledWith('chatSortSettings');
    expect(res.body.settings.defaultSort).toBe('custom');
  });

  it('getCustomSortOrder returns an empty list when no order is saved', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatOrg.getCustomSortOrder(makeReq(), res);
    expect(res.body.conversations).toEqual([]);
  });

  it('getCustomSortOrder returns conversations in the saved order (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSortSettings: { customSortOrder: ['c2', 'c1'] } }));
    Conversation.find.mockReturnValue(conversationsChain([conv({ _id: 'c1' }), conv({ _id: 'c2' })]));
    const res = makeRes();
    await chatOrg.getCustomSortOrder(makeReq(), res);
    expect(res.body.conversations.map((c) => c._id)).toEqual(['c2', 'c1']);
  });

  it('clearCustomSortOrder resets to recent (happy path)', async () => {
    const user = makeUser({ chatSortSettings: { customSortOrder: ['c1'], defaultSort: 'custom' } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.clearCustomSortOrder(makeReq(), res);
    expect(user.chatSortSettings.customSortOrder).toEqual([]);
    expect(user.chatSortSettings.defaultSort).toBe('recent');
  });

  it('toggleChatSort flips the enabled flag', async () => {
    const user = makeUser({ chatSortSettings: { chatSortEnabled: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.toggleChatSort(makeReq({ body: {} }), res);
    expect(user.chatSortSettings.chatSortEnabled).toBe(true);
  });

  it('resetChatSortSettings restores defaults (happy path)', async () => {
    const user = makeUser({ chatSortSettings: { defaultSort: 'alphabetical' } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatOrg.resetChatSortSettings(makeReq(), res);
    expect(user.chatSortSettings.defaultSort).toBe('recent');
    expect(user.save).toHaveBeenCalled();
  });
});
