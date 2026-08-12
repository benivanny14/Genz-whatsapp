jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  find: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const chatList = require('../controllers/chatListController');

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
  chatListModsSettings: {},
  chatSearchSettings: {},
  chatFoldersSettings: {},
  chatFolders: [],
  contacts: [],
  searchHistory: [],
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

describe('chatListController — chat list MODs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.getChatListModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged MODs settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatListModsSettings: { hideChatsEnabled: true } }));
    const res = makeRes();
    await chatList.getChatListModsSettings(makeReq(), res);
    expect(res.body.settings.hideChatsEnabled).toBe(true);
    expect(res.body.settings.lockChatsEnabled).toBe(false); // default
  });

  it('updates MODs settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.updateChatListModsSettings(makeReq({ body: { settings: { chatBackupEnabled: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.chatBackupEnabled).toBe(true);
  });

  it('toggles a single MOD (happy path)', async () => {
    const user = makeUser({ chatListModsSettings: { pinUnlimitedChats: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.togglePinUnlimited(makeReq(), res);
    expect(res.body.pinUnlimitedChats).toBe(true);
  });

  it('toggles a different MOD independently', async () => {
    const user = makeUser({ chatListModsSettings: { chatExportEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.toggleChatExport(makeReq(), res);
    expect(res.body.chatExportEnabled).toBe(false);
  });
});

describe('chatListController — chat search', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns search settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSearchSettings: { maxResults: 10 } }));
    const res = makeRes();
    await chatList.getChatSearchSettings(makeReq(), res);
    expect(res.body.settings.maxResults).toBe(10);
    expect(res.body.settings.chatSearchEnabled).toBe(true); // default
  });

  it('rejects an empty search query (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.searchConversations(makeReq({ body: { query: '   ' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Search query is required');
  });

  it('rejects search when disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSearchSettings: { chatSearchEnabled: false } }));
    const res = makeRes();
    await chatList.searchConversations(makeReq({ body: { query: 'hello' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('searches conversations and messages (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const convChain = {
      populate: jest.fn().mockResolvedValue([
        { name: 'Work group', isGroup: true },
        { name: 'Family', isGroup: false }
      ])
    };
    Conversation.find.mockReturnValue(convChain);
    const msgChain = { populate: jest.fn().mockResolvedValue([{ _id: 'm1', content: 'hello' }]) };
    Message.find.mockReturnValue(msgChain);

    const res = makeRes();
    await chatList.searchConversations(makeReq({ body: { query: 'work', searchInContacts: false } }), res);

    expect(res.body.success).toBe(true);
    expect(res.body.results.conversations).toHaveLength(1);
    expect(res.body.results.messages).toHaveLength(1);
    expect(res.body.results.totalResults).toBe(2);
  });

  it('rejects searching a conversation the user does not belong to (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findOne.mockResolvedValue(null);
    const res = makeRes();
    await chatList.searchMessagesInConversation(
      makeReq({ params: { conversationId: 'c1' }, body: { query: 'hello' } }),
      res
    );
    expect(res.statusCode).toBe(404);
  });

  it('searches messages within a conversation (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findOne.mockResolvedValue({ _id: 'c1', participants: ['user-1'] });
    const chain = { sort: jest.fn().mockResolvedValue([{ _id: 'm1', content: 'hello' }]) };
    Message.find.mockReturnValue(chain);

    const res = makeRes();
    await chatList.searchMessagesInConversation(
      makeReq({ params: { conversationId: 'c1' }, body: { query: 'hello' } }),
      res
    );
    expect(res.body.messages).toHaveLength(1);
    expect(res.body.totalResults).toBe(1);
  });

  it('returns search history (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ searchHistory: [{ query: 'hi', timestamp: new Date() }] }));
    const res = makeRes();
    await chatList.getSearchHistory(makeReq(), res);
    expect(res.body.history).toHaveLength(1);
  });

  it('clears search history (happy path)', async () => {
    const user = makeUser({ searchHistory: [{ query: 'hi' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.clearSearchHistory(makeReq(), res);
    expect(user.searchHistory).toEqual([]);
    expect(user.save).toHaveBeenCalled();
  });

  it('computes popular searches by frequency', async () => {
    User.findById.mockResolvedValue(makeUser({
      searchHistory: [
        { query: 'alpha' },
        { query: 'beta' },
        { query: 'alpha' },
        { query: 'alpha' }
      ]
    }));
    const res = makeRes();
    await chatList.getPopularSearches(makeReq(), res);
    expect(res.body.popularSearches[0]).toEqual({ query: 'alpha', count: 3 });
  });
});

describe('chatListController — search regex hardening (ReDoS / injection)', () => {
  beforeEach(() => jest.clearAllMocks());

  const stubModels = (conversations) => {
    const convChain = { populate: jest.fn().mockResolvedValue(conversations) };
    Conversation.find.mockReturnValue(convChain);
    Message.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
  };

  it('escapes regex metacharacters so search queries never throw or inject', async () => {
    User.findById.mockResolvedValue(makeUser());
    stubModels([
      { name: 'a+b*c?', isGroup: true },
      { name: 'literal [dot] {brace}', isGroup: false }
    ]);

    const res = makeRes();
    await chatList.searchConversations(
      makeReq({ body: { query: '.*+?^${}()|[\\]', searchInMessages: false, searchInContacts: false } }),
      res
    );

    expect(res.body.success).toBe(true);
    // Metacharacters are matched literally — no conversation matches this exact string.
    expect(res.body.results.conversations).toHaveLength(0);
  });

  it('matches a plain search containing metacharacters literally', async () => {
    User.findById.mockResolvedValue(makeUser());
    stubModels([{ name: 'a+b*c?', isGroup: false }]);

    const res = makeRes();
    await chatList.searchConversations(
      makeReq({ body: { query: 'a+b*c?', searchInMessages: false, searchInContacts: false } }),
      res
    );

    expect(res.body.success).toBe(true);
    expect(res.body.results.conversations).toHaveLength(1);
  });

  it('does not throw SyntaxError when exactMatch is enabled', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSearchSettings: { exactMatch: true } }));
    stubModels([{ name: 'hello', isGroup: false }]);

    const res = makeRes();
    await chatList.searchConversations(
      makeReq({ body: { query: 'hello', searchInMessages: false, searchInContacts: false } }),
      res
    );

    expect(res.body.success).toBe(true);
    expect(res.body.results.conversations).toHaveLength(1);
  });

  it('anchors exactMatch to the whole string', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSearchSettings: { exactMatch: true } }));
    stubModels([{ name: 'not-hello', isGroup: false }]);

    const res = makeRes();
    await chatList.searchConversations(
      makeReq({ body: { query: 'hello', searchInMessages: false, searchInContacts: false } }),
      res
    );

    expect(res.body.success).toBe(true);
    expect(res.body.results.conversations).toHaveLength(0);
  });

  it('returns quickly on a ReDoS-style pattern instead of hanging', async () => {
    User.findById.mockResolvedValue(makeUser());
    // (a+)+$ against a long run of a's + a trailing non-matching char is the
    // classic catastrophic-backtracking case. With the query escaped to a
    // literal, matching stays linear.
    stubModels([{ name: 'a'.repeat(30) + '!', isGroup: false }]);

    const res = makeRes();
    const start = Date.now();
    await chatList.searchConversations(
      makeReq({ body: { query: '(a+)+$', searchInMessages: false, searchInContacts: false } }),
      res
    );
    const elapsed = Date.now() - start;

    expect(res.body.success).toBe(true);
    expect(elapsed).toBeLessThan(1000);
  });
});

describe('chatListController — chat folders', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns folder settings (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatFoldersSettings: { maxFolders: 5 } }));
    const res = makeRes();
    await chatList.getChatFoldersSettings(makeReq(), res);
    expect(res.body.settings.maxFolders).toBe(5);
    expect(res.body.settings.chatFoldersEnabled).toBe(true); // default
  });

  it('rejects creating a folder without a name (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.createChatFolder(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Folder name is required');
  });

  it('rejects creating a folder when folders are disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatFoldersSettings: { chatFoldersEnabled: false } }));
    const res = makeRes();
    await chatList.createChatFolder(makeReq({ body: { name: 'Work' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('creates a folder (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.createChatFolder(makeReq({ body: { name: 'Work' } }), res);
    expect(user.chatFolders).toHaveLength(1);
    expect(user.chatFolders[0].name).toBe('Work');
    expect(user.save).toHaveBeenCalled();
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for a missing folder', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.getChatFolder(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('lists folders with conversations (happy path)', async () => {
    const folder = {
      _id: 'f1',
      name: 'Work',
      chatIds: ['c1'],
      toObject: () => ({ _id: 'f1', name: 'Work', chatIds: ['c1'] })
    };
    const user = makeUser({ chatFolders: [folder] });
    User.findById.mockResolvedValue(user);
    const chain = { populate: jest.fn().mockResolvedValue([{ _id: 'c1', name: 'Conv' }]) };
    Conversation.find.mockReturnValue(chain);

    const res = makeRes();
    await chatList.getChatFolders(makeReq(), res);
    expect(res.body.folders).toHaveLength(1);
    expect(res.body.folders[0].chatCount).toBe(1);
  });

  it('deletes a folder (happy path)', async () => {
    const folder = { _id: 'f1', name: 'Work', chatIds: [] };
    const user = makeUser({ chatFolders: [folder] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.deleteChatFolder(makeReq({ params: { id: 'f1' } }), res);
    expect(user.chatFolders).toHaveLength(0);
    expect(res.body.success).toBe(true);
  });

  it('adds a chat to a folder after verifying ownership (happy path)', async () => {
    const folder = { _id: 'f1', name: 'Work', chatIds: [] };
    const user = makeUser({ chatFolders: [folder] });
    User.findById.mockResolvedValue(user);
    Conversation.findOne.mockResolvedValue({ _id: 'c1', participants: ['user-1'] });

    const res = makeRes();
    await chatList.addChatToFolder(makeReq({ params: { folderId: 'f1' }, body: { chatId: 'c1' } }), res);
    expect(folder.chatIds).toContain('c1');
    expect(res.body.success).toBe(true);
  });

  it('rejects adding a chat the user does not own (404)', async () => {
    const folder = { _id: 'f1', name: 'Work', chatIds: [] };
    const user = makeUser({ chatFolders: [folder] });
    User.findById.mockResolvedValue(user);
    Conversation.findOne.mockResolvedValue(null);

    const res = makeRes();
    await chatList.addChatToFolder(makeReq({ params: { folderId: 'f1' }, body: { chatId: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('removes a chat from a folder (happy path)', async () => {
    const folder = { _id: 'f1', name: 'Work', chatIds: ['c1'] };
    const user = makeUser({ chatFolders: [folder] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.removeChatFromFolder(makeReq({ params: { folderId: 'f1', chatId: 'c1' } }), res);
    expect(folder.chatIds).toEqual([]);
    expect(res.body.success).toBe(true);
  });

  it('rejects auto-organize when disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatFoldersSettings: { autoOrganize: false } }));
    const res = makeRes();
    await chatList.autoOrganizeChats(makeReq(), res);
    expect(res.statusCode).toBe(403);
  });

  it('toggles folders (happy path)', async () => {
    const user = makeUser({ chatFoldersSettings: { chatFoldersEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.toggleChatFolders(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.chatFoldersEnabled).toBe(false);
  });

  it('resets folder settings (happy path)', async () => {
    const user = makeUser({ chatFoldersSettings: { maxFolders: 2 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.resetChatFoldersSettings(makeReq(), res);
    expect(res.body.settings.maxFolders).toBe(20); // default
  });
});

describe('chatListController — MODs toggles auth + settings handlers', () => {
  beforeEach(() => jest.clearAllMocks());

  const MOD_TOGGLES = [
    'toggleHideChats', 'toggleLockChats', 'togglePinUnlimited', 'toggleMarkUnread',
    'toggleArchiveUnlimited', 'toggleChatBackup', 'toggleChatRestore', 'toggleChatExport'
  ];

  it.each(MOD_TOGGLES)('%s returns 401 when the user cannot be resolved (auth)', async (handlerName) => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList[handlerName](makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it.each(MOD_TOGGLES)('%s returns 500 when the DB read fails (error)', async (handlerName) => {
    User.findById.mockRejectedValue(new Error('db down'));
    const res = makeRes();
    await chatList[handlerName](makeReq(), res);
    expect(res.statusCode).toBe(500);
  });

  it('returns 401 for getChatListModsSettings (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.getChatListModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for getChatSearchSettings (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.getChatSearchSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('toggles chat search (happy path)', async () => {
    const user = makeUser({ chatSearchSettings: { chatSearchEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.toggleChatSearch(makeReq({ body: { enabled: false } }), res);
    expect(res.body.settings.chatSearchEnabled).toBe(false);
    expect(user.save).toHaveBeenCalled();
  });

  it('toggles chat search off by default when no value given', async () => {
    const user = makeUser({ chatSearchSettings: { chatSearchEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.toggleChatSearch(makeReq(), res);
    expect(res.body.settings.chatSearchEnabled).toBe(false);
  });

  it('returns 401 for toggleChatSearch (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.toggleChatSearch(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });
});

describe('chatListController — search edge branches', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects searchMessagesInConversation with an empty query (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.searchMessagesInConversation(
      makeReq({ params: { conversationId: 'c1' }, body: { query: '  ' } }),
      res
    );
    expect(res.statusCode).toBe(400);
  });

  it('rejects searchMessagesInConversation when search is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatSearchSettings: { chatSearchEnabled: false } }));
    const res = makeRes();
    await chatList.searchMessagesInConversation(
      makeReq({ params: { conversationId: 'c1' }, body: { query: 'hello' } }),
      res
    );
    expect(res.statusCode).toBe(403);
  });

  it('matches contacts when searchInContacts is enabled', async () => {
    User.findById.mockResolvedValue(makeUser({ contacts: [{ username: 'Bob', displayName: 'Bobby Tables' }] }));
    const convChain = { populate: jest.fn().mockResolvedValue([]) };
    Conversation.find.mockReturnValue(convChain);
    Message.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
    const res = makeRes();
    await chatList.searchConversations(
      makeReq({ body: { query: 'bob', searchInMessages: false, searchInContacts: true, searchInGroups: false } }),
      res
    );
    expect(res.body.success).toBe(true);
    expect(res.body.results.contacts).toHaveLength(1);
    expect(res.body.results.totalResults).toBe(1);
  });

  it('persists search history with dedup and caps the list', async () => {
    const user = makeUser({ searchHistory: [{ query: 'hello', timestamp: new Date() }] });
    User.findById.mockResolvedValue(user);
    Conversation.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
    Message.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
    const res = makeRes();
    await chatList.searchConversations(
      makeReq({ body: { query: 'hello', searchInMessages: false, searchInContacts: false } }),
      res
    );
    // duplicate 'hello' removed, new entry unshifted
    expect(user.searchHistory).toHaveLength(1);
    expect(user.searchHistory[0].query).toBe('hello');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 500 when the conversation search fails (error)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockReturnValue({ populate: jest.fn().mockRejectedValue(new Error('db down')) });
    const res = makeRes();
    await chatList.searchConversations(
      makeReq({ body: { query: 'hello', searchInMessages: false, searchInContacts: false } }),
      res
    );
    expect(res.statusCode).toBe(500);
  });

  it('respects the history limit query param', async () => {
    const history = [{ query: 'a' }, { query: 'b' }, { query: 'c' }];
    User.findById.mockResolvedValue(makeUser({ searchHistory: history }));
    const res = makeRes();
    await chatList.getSearchHistory(makeReq({ query: { limit: '2' } }), res);
    expect(res.body.history).toHaveLength(2);
  });

  it('returns 401 for getSearchHistory (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.getSearchHistory(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for clearSearchHistory (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.clearSearchHistory(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('deletes a single search history item (happy path)', async () => {
    const user = makeUser({ searchHistory: [{ query: 'alpha' }, { query: 'beta' }] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.deleteSearchHistoryItem(makeReq({ params: { query: 'alpha' } }), res);
    expect(user.searchHistory).toHaveLength(1);
    expect(user.searchHistory[0].query).toBe('beta');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 401 for deleteSearchHistoryItem (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.deleteSearchHistoryItem(makeReq({ params: { query: 'x' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns an empty popular-searches list when there is no history', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.getPopularSearches(makeReq(), res);
    expect(res.body.popularSearches).toEqual([]);
  });

  it('returns 401 for getPopularSearches (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.getPopularSearches(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });
});

describe('chatListController — folder CRUD edge cases', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects creating a folder over the max limit (validation)', async () => {
    const folder = { _id: 'f1', name: 'Work', chatIds: [] };
    const user = makeUser({ chatFolders: [folder], chatFoldersSettings: { maxFolders: 1 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.createChatFolder(makeReq({ body: { name: 'Extra' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Maximum 1 folders allowed');
  });

  it('returns 401 for createChatFolder (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.createChatFolder(makeReq({ body: { name: 'Work' } }), res);
    expect(res.statusCode).toBe(401);
  });

  it('gets a single folder with decorated chats (happy path)', async () => {
    const folder = {
      _id: 'f1',
      name: 'Work',
      chatIds: ['c1'],
      toObject: () => ({ _id: 'f1', name: 'Work', chatIds: ['c1'] })
    };
    User.findById.mockResolvedValue(makeUser({ chatFolders: [folder] }));
    const chain = { populate: jest.fn().mockResolvedValue([{ _id: 'c1', name: 'Conv' }]) };
    Conversation.find.mockReturnValue(chain);
    const res = makeRes();
    await chatList.getChatFolder(makeReq({ params: { id: 'f1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.folder.name).toBe('Work');
    expect(res.body.folder.chatCount).toBe(1);
  });

  it('updates a folder (happy path)', async () => {
    const folder = { _id: 'f1', name: 'Work', chatIds: [], color: '#fff' };
    const user = makeUser({ chatFolders: [folder] });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.updateChatFolder(makeReq({ params: { id: 'f1' }, body: { name: 'Office', color: '#000' } }), res);
    expect(res.body.folder.name).toBe('Office');
    expect(res.body.folder.color).toBe('#000');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 404 when updating a missing folder', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.updateChatFolder(makeReq({ params: { id: 'nope' }, body: { name: 'X' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when deleting a missing folder', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.deleteChatFolder(makeReq({ params: { id: 'nope' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects addChatToFolder without a chatId (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.addChatToFolder(makeReq({ params: { folderId: 'f1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Chat ID is required');
  });

  it('returns 404 when adding to a missing folder', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.addChatToFolder(makeReq({ params: { folderId: 'nope' }, body: { chatId: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects adding when the folder is full (validation)', async () => {
    const folder = { _id: 'f1', name: 'Work', chatIds: Array.from({ length: 50 }, (_, i) => `c${i}`) };
    User.findById.mockResolvedValue(makeUser({ chatFolders: [folder] }));
    const res = makeRes();
    await chatList.addChatToFolder(makeReq({ params: { folderId: 'f1' }, body: { chatId: 'c50' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Maximum 50 chats per folder');
  });

  it('returns 404 when the conversation does not belong to the user', async () => {
    const folder = { _id: 'f1', name: 'Work', chatIds: [] };
    User.findById.mockResolvedValue(makeUser({ chatFolders: [folder] }));
    Conversation.findOne.mockResolvedValue(null);
    const res = makeRes();
    await chatList.addChatToFolder(makeReq({ params: { folderId: 'f1' }, body: { chatId: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 when removing from a missing folder', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatList.removeChatFromFolder(makeReq({ params: { folderId: 'nope', chatId: 'c1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('auto-organizes chats into default folders (happy path)', async () => {
    const user = makeUser({ chatFoldersSettings: { autoOrganize: true } });
    User.findById.mockResolvedValue(user);
    Conversation.find.mockResolvedValue([
      { _id: 'c1', isGroup: true, name: 'Dev Team' },
      { _id: 'c2', isGroup: false, name: 'Mom' }
    ]);
    const res = makeRes();
    await chatList.autoOrganizeChats(makeReq(), res);
    expect(res.statusCode).toBe(200);
    // 4 default folders created
    expect(user.chatFolders).toHaveLength(4);
    const groups = user.chatFolders.find(f => f.name === 'Groups');
    expect(groups.chatIds).toContain('c1');
    expect(user.save).toHaveBeenCalled();
  });

  it('returns 401 for toggleChatFolders (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.toggleChatFolders(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for getChatFoldersSettings (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatList.getChatFoldersSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns 500 when folder creation save fails (error)', async () => {
    const user = makeUser();
    user.save.mockRejectedValue(new Error('db down'));
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatList.createChatFolder(makeReq({ body: { name: 'Work' } }), res);
    expect(res.statusCode).toBe(500);
  });
});
