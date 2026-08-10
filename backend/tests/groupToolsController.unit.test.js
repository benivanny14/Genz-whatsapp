jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  findById: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const groupTools = require('../controllers/groupToolsController');

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
  groupFeaturesSettings: {},
  groupModsSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeConversation = (overrides = {}) => ({
  _id: 'conv-1',
  isGroup: true,
  participants: ['user-1', 'user-2'],
  admins: ['user-1'],
  polls: [],
  events: [],
  announcementsOnly: false,
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makePoll = (overrides = {}) => ({
  _id: 'poll-1',
  question: 'Best feature?',
  options: [
    { text: 'Option A', votes: 0, voters: [] },
    { text: 'Option B', votes: 0, voters: [] }
  ],
  createdBy: 'user-1',
  createdAt: new Date(),
  expiresAt: null,
  active: true,
  ...overrides
});

describe('groupToolsController — group features settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await groupTools.getGroupFeaturesSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Authentication required');
  });

  it('returns merged features settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ groupFeaturesSettings: { groupAdminControl: false } }));
    const res = makeRes();
    await groupTools.getGroupFeaturesSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.groupAdminControl).toBe(false);
    expect(res.body.settings.groupPolls).toBe(true); // default
    expect(res.body.settings.maxGroupsPerUser).toBe(50); // default
  });

  it('updates features settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await groupTools.updateGroupFeaturesSettings(makeReq({ body: { settings: { restrictMessaging: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(user.markModified).toHaveBeenCalledWith('groupFeaturesSettings');
    expect(res.body.settings.restrictMessaging).toBe(true);
  });

  it('rejects an out-of-range member limit (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await groupTools.updateGroupMemberLimit(makeReq({ body: { limit: 5001 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Limit must be between 1 and 5000');
  });

  it('updates the member limit (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await groupTools.updateGroupMemberLimit(makeReq({ body: { limit: 2048 } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.groupMemberLimit).toBe(2048);
  });

  it('toggles a features field (happy path)', async () => {
    const user = makeUser({ groupFeaturesSettings: { groupPolls: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await groupTools.toggleGroupPolls(makeReq(), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.groupPolls).toBe(false);
  });

  it('resets features settings to defaults (happy path)', async () => {
    const user = makeUser({ groupFeaturesSettings: { restrictMessaging: true, groupMemberLimit: 5 } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await groupTools.resetGroupFeaturesSettings(makeReq(), res);
    expect(res.body.settings.restrictMessaging).toBe(false); // default
    expect(res.body.settings.groupMemberLimit).toBe(1024); // default
    expect(user.save).toHaveBeenCalled();
  });
});

describe('groupToolsController — group polls', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects createGroupPoll without required fields (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await groupTools.createGroupPoll(makeReq({ body: { conversationId: 'conv-1', question: 'Q' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Conversation ID, question, and at least 2 options are required');
  });

  it('rejects a poll for a missing or non-group conversation (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await groupTools.createGroupPoll(makeReq({ body: { conversationId: 'conv-1', question: 'Q', options: ['A', 'B'] } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Group conversation not found');
  });

  it('rejects a poll when the user is not a participant (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation({ participants: ['user-9'] }));
    const res = makeRes();
    await groupTools.createGroupPoll(makeReq({ body: { conversationId: 'conv-1', question: 'Q', options: ['A', 'B'] } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You are not a member of this group');
  });

  it('creates a poll (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const conv = makeConversation();
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await groupTools.createGroupPoll(makeReq({ body: { conversationId: 'conv-1', question: 'Best feature?', options: ['A', 'B'], duration: 60 } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.poll.question).toBe('Best feature?');
    expect(res.body.poll.options).toHaveLength(2);
    expect(conv.polls).toHaveLength(1);
    expect(conv.save).toHaveBeenCalled();
  });

  it('rejects voteGroupPoll without required fields (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await groupTools.voteGroupPoll(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Conversation ID, poll ID, and option index are required');
  });

  it('rejects a vote when the poll is missing (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation({ polls: null }));
    const res = makeRes();
    await groupTools.voteGroupPoll(makeReq({ body: { conversationId: 'conv-1', pollId: 'poll-1', optionIndex: 0 } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects a vote from a non-participant (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const poll = makePoll();
    Conversation.findById.mockResolvedValue(makeConversation({ participants: ['user-9'], polls: { id: jest.fn(() => poll) } }));
    const res = makeRes();
    await groupTools.voteGroupPoll(makeReq({ body: { conversationId: 'conv-1', pollId: 'poll-1', optionIndex: 0 } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You are not a member of this group');
  });

  it('rejects a vote on an expired poll (400)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const poll = makePoll({ expiresAt: new Date(Date.now() - 1000) });
    const conv = makeConversation({ polls: { id: jest.fn(() => poll) } });
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await groupTools.voteGroupPoll(makeReq({ body: { conversationId: 'conv-1', pollId: 'poll-1', optionIndex: 0 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Poll has expired');
    expect(conv.save).toHaveBeenCalled();
  });

  it('rejects a second vote from the same user (400)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const poll = makePoll({ options: [{ text: 'A', votes: 1, voters: ['user-1'] }, { text: 'B', votes: 0, voters: [] }] });
    Conversation.findById.mockResolvedValue(makeConversation({ polls: { id: jest.fn(() => poll) } }));
    const res = makeRes();
    await groupTools.voteGroupPoll(makeReq({ body: { conversationId: 'conv-1', pollId: 'poll-1', optionIndex: 1 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('You have already voted in this poll');
  });

  it('rejects an out-of-range option index (400)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const poll = makePoll();
    Conversation.findById.mockResolvedValue(makeConversation({ polls: { id: jest.fn(() => poll) } }));
    const res = makeRes();
    await groupTools.voteGroupPoll(makeReq({ body: { conversationId: 'conv-1', pollId: 'poll-1', optionIndex: 5 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Invalid option index');
  });

  it('records a vote (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const poll = makePoll();
    const conv = makeConversation({ polls: { id: jest.fn(() => poll) } });
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await groupTools.voteGroupPoll(makeReq({ body: { conversationId: 'conv-1', pollId: 'poll-1', optionIndex: 0 } }), res);
    expect(res.body.success).toBe(true);
    expect(poll.options[0].votes).toBe(1);
    expect(poll.options[0].voters).toContain('user-1');
    expect(conv.save).toHaveBeenCalled();
  });
});

describe('groupToolsController — announcements & events', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects announcements-mode for a missing group (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await groupTools.setGroupAnnouncementsMode(makeReq({ body: { conversationId: 'conv-1', enabled: true } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects announcements-mode from a non-admin (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation({ admins: ['user-9'] }));
    const res = makeRes();
    await groupTools.setGroupAnnouncementsMode(makeReq({ body: { conversationId: 'conv-1', enabled: true } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Only admins can change announcements mode');
  });

  it('sets announcements mode as an admin (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const conv = makeConversation();
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await groupTools.setGroupAnnouncementsMode(makeReq({ body: { conversationId: 'conv-1', enabled: true } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.announcementsOnly).toBe(true);
    expect(conv.save).toHaveBeenCalled();
  });

  it('rejects createGroupEvent without title/date (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await groupTools.createGroupEvent(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Conversation ID, title, and date are required');
  });

  it('creates a group event (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const conv = makeConversation();
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await groupTools.createGroupEvent(makeReq({ body: { conversationId: 'conv-1', title: 'Football', date: '2026-09-01', time: '18:00', location: 'Stadium' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.event.title).toBe('Football');
    expect(res.body.event.attendees).toContain('user-1');
    expect(conv.events).toHaveLength(1);
    expect(conv.save).toHaveBeenCalled();
  });

  it('rejects RSVP for a missing event (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(makeConversation({ events: null }));
    const res = makeRes();
    await groupTools.rsvpGroupEvent(makeReq({ body: { conversationId: 'conv-1', eventId: 'event-1', attending: true } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Event not found');
  });

  it('adds the user as attendee (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const event = { _id: 'event-1', title: 'Football', attendees: ['user-2'] };
    const conv = makeConversation({ events: { id: jest.fn(() => event) } });
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await groupTools.rsvpGroupEvent(makeReq({ body: { conversationId: 'conv-1', eventId: 'event-1', attending: true } }), res);
    expect(res.body.success).toBe(true);
    expect(event.attendees).toContain('user-1');
    expect(conv.save).toHaveBeenCalled();
  });

  it('removes the user from attendees when declining (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const event = { _id: 'event-1', title: 'Football', attendees: ['user-1', 'user-2'] };
    const conv = makeConversation({ events: { id: jest.fn(() => event) } });
    Conversation.findById.mockResolvedValue(conv);
    const res = makeRes();
    await groupTools.rsvpGroupEvent(makeReq({ body: { conversationId: 'conv-1', eventId: 'event-1', attending: false } }), res);
    expect(res.body.success).toBe(true);
    expect(event.attendees).not.toContain('user-1');
    expect(conv.save).toHaveBeenCalled();
  });
});

describe('groupToolsController — group MODs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await groupTools.getGroupModsSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged MODs settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ groupModsSettings: { groupAdminTools: true } }));
    const res = makeRes();
    await groupTools.getGroupModsSettings(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.groupAdminTools).toBe(true);
    expect(res.body.settings.groupJoinRequestsApproval).toBe(false); // default
  });

  it('updates MODs settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await groupTools.updateGroupModsSettings(makeReq({ body: { settings: { groupPolls: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.groupPolls).toBe(true);
  });

  it('toggles a MOD (happy path)', async () => {
    const user = makeUser({ groupModsSettings: { groupAdminTools: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await groupTools.toggleAdminTools(makeReq(), res);
    expect(res.body.groupAdminTools).toBe(true);
    expect(user.save).toHaveBeenCalled();
  });

  it('toggles a different MOD independently', async () => {
    const user = makeUser({ groupModsSettings: { groupLinkCustomization: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await groupTools.toggleLinkCustomization(makeReq(), res);
    expect(res.body.groupLinkCustomization).toBe(false);
  });
});
