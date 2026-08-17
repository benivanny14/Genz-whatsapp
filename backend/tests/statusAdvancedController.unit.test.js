jest.mock('../models/Status', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../models/User', () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
  find: jest.fn()
}));

jest.mock('../utils/messageSendHelpers', () => ({
  isEitherUserBlocked: jest.fn().mockResolvedValue(false)
}));

const Status = require('../models/Status');
const User = require('../models/User');
const statusAdv = require('../controllers/statusAdvancedController');

const VALID_ID = '507f1f77bcf86cd799439011';

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

const makeStatus = (overrides = {}) => ({
  _id: VALID_ID,
  user: 'user-1',
  userId: 'user-1',
  type: 'text',
  content: 'Hello',
  privacy: 'everyone',
  views: [],
  reactions: [],
  collaborators: [],
  expiresAt: new Date(Date.now() + 3600000),
  save: jest.fn().mockResolvedValue(undefined),
  deleteOne: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const findChain = (result, populates = 1) => {
  let chain = { sort: jest.fn().mockResolvedValue(result) };
  for (let i = 0; i < populates; i++) {
    chain = { populate: jest.fn().mockReturnValue(chain) };
  }
  return chain;
};

describe('statusAdvancedController — voice/text effects', () => {
  beforeEach(() => jest.clearAllMocks());

  it('applyVoiceChanger returns 404 for a missing status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusAdv.applyVoiceChanger(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('applyVoiceChanger forbids non-owners (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-9' }));
    const res = makeRes();
    await statusAdv.applyVoiceChanger(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('applyVoiceChanger rejects non-voice statuses (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ type: 'text' }));
    const res = makeRes();
    await statusAdv.applyVoiceChanger(makeReq({ params: { id: VALID_ID }, body: { effect: 'robot' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Voice changer only works on voice statuses');
  });

  it('applyVoiceChanger stores voice effects (happy path)', async () => {
    const status = makeStatus({ type: 'voice' });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.applyVoiceChanger(makeReq({ params: { id: VALID_ID }, body: { effect: 'robot', pitch: 1.5 } }), res);
    expect(status.voiceEffects).toEqual({ effect: 'robot', pitch: 1.5, speed: undefined, echo: undefined });
    expect(status.save).toHaveBeenCalled();
  });

});

describe('statusAdvancedController — collaboration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('addCollaborator returns 404 when the collaborator is not found', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusAdv.addCollaborator(makeReq({ params: { id: VALID_ID }, body: { collabUserId: 'user-2' } }), res);
    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Collaborator not found');
  });

  it('addCollaborator forbids adding yourself (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    User.findById.mockResolvedValue({ _id: 'user-1', username: 'alice' });
    const res = makeRes();
    await statusAdv.addCollaborator(makeReq({ params: { id: VALID_ID }, body: { collabUserId: 'user-1' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('You cannot add yourself as a collaborator');
  });

  it('addCollaborator rejects duplicate collaborators (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ collaborators: [{ userId: 'user-2' }] }));
    User.findById.mockResolvedValue({ _id: 'user-2', username: 'bob' });
    const res = makeRes();
    await statusAdv.addCollaborator(makeReq({ params: { id: VALID_ID }, body: { collabUserId: 'user-2' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Collaborator already added');
  });

  it('addCollaborator adds by id (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    User.findById.mockResolvedValue({ _id: 'user-2', username: 'bob' });
    const res = makeRes();
    await statusAdv.addCollaborator(makeReq({ params: { id: VALID_ID }, body: { collabUserId: 'user-2' } }), res);
    expect(status.collaborators).toHaveLength(1);
    expect(status.collaborators[0].username).toBe('bob');
    expect(status.isCollaborative).toBe(true);
    expect(status.save).toHaveBeenCalled();
    expect(res.body.status.collaborators).toHaveLength(1);
  });

  it('addCollaborator resolves by username (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    User.findOne.mockResolvedValue({ _id: 'user-2', username: 'Bob' });
    const res = makeRes();
    await statusAdv.addCollaborator(makeReq({ params: { id: VALID_ID }, body: { collabUsername: 'bob' } }), res);
    expect(User.findOne).toHaveBeenCalled();
    expect(status.collaborators[0].userId).toBe('user-2');
  });

  it('getCollaboration allows collaborators (happy path)', async () => {
    const status = makeStatus({ collaborators: [{ userId: 'user-2', role: 'viewer' }], collabMode: 'edit' });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.getCollaboration(makeReq({ params: { id: VALID_ID }, user: { _id: 'user-2' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.collaboration.collabMode).toBe('edit');
    expect(res.body.collaboration.maxCollaborators).toBe(10);
  });

  it('getCollaboration forbids strangers (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    const res = makeRes();
    await statusAdv.getCollaboration(makeReq({ params: { id: VALID_ID }, user: { _id: 'user-9' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('updateCollaboration saves settings and normalizes collaborators (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.updateCollaboration(makeReq({
      params: { id: VALID_ID },
      body: {
        collaborators: [{ userId: 'user-2', username: 'bob', role: 'editor' }],
        collabMode: 'edit',
        allowComments: false,
        maxCollaborators: 5
      }
    }), res);
    expect(status.collaborators[0].role).toBe('editor');
    expect(status.collabMode).toBe('edit');
    expect(status.allowComments).toBe(false);
    expect(status.maxCollaborators).toBe(5);
    expect(status.isCollaborative).toBe(true);
    expect(status.collabUserId).toBe('user-2');
    expect(status.save).toHaveBeenCalled();
  });

  it('contributeToCollaboration rejects expired stories (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ expiresAt: new Date(Date.now() - 1000) }));
    const res = makeRes();
    await statusAdv.contributeToCollaboration(makeReq({ params: { id: VALID_ID }, body: { type: 'text' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Story imekwisha muda wake');
  });

  it('contributeToCollaboration rejects non-collaborators (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ isCollaborative: true }));
    const res = makeRes();
    await statusAdv.contributeToCollaboration(makeReq({ params: { id: VALID_ID }, user: { _id: 'user-9' }, body: { type: 'text' } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('You are not a collaborator on this story');
  });

  it('contributeToCollaboration requires mediaUrl for image contributions (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ isCollaborative: true }));
    const res = makeRes();
    await statusAdv.contributeToCollaboration(makeReq({ params: { id: VALID_ID }, body: { type: 'image' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('contributeToCollaboration creates a contribution (happy path)', async () => {
    const parent = makeStatus({ isCollaborative: true, privacy: 'contacts', backgroundColor: '#00a884' });
    const contribution = makeStatus({ _id: 's2' });
    Status.findById.mockResolvedValue(parent);
    Status.create.mockResolvedValue(contribution);
    const res = makeRes();
    await statusAdv.contributeToCollaboration(makeReq({ params: { id: VALID_ID }, body: { type: 'image', mediaUrl: 'https://x/y.png', caption: 'Mine' } }), res);
    expect(res.statusCode).toBe(201);
    const args = Status.create.mock.calls[0][0];
    expect(args.storyId).toBe(VALID_ID);
    expect(args.isContribution).toBe(true);
    expect(args.privacy).toBe('contacts');
    expect(args.mediaUrl).toBe('https://x/y.png');
  });
});

describe('statusAdvancedController — drafts/archive/reminders/reactions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deleteDraft returns 404 for a missing draft', async () => {
    Status.findOne.mockResolvedValue(null);
    const res = makeRes();
    await statusAdv.deleteDraft(makeReq({ params: { draftId: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deleteDraft deletes the draft (happy path)', async () => {
    const draft = makeStatus({ isDraft: true });
    Status.findOne.mockResolvedValue(draft);
    const res = makeRes();
    await statusAdv.deleteDraft(makeReq({ params: { draftId: VALID_ID } }), res);
    expect(draft.deleteOne).toHaveBeenCalled();
    expect(res.body.message).toBe('Draft deleted');
  });

  it('getTrendingHashtags aggregates and maps tags (happy path)', async () => {
    Status.aggregate.mockResolvedValue([{ _id: '#tech', count: 5 }, { _id: '#genz', count: 2 }]);
    const res = makeRes();
    await statusAdv.getTrendingHashtags(makeReq(), res);
    expect(res.body.hashtags).toEqual([
      { id: '#tech', tag: '#tech', count: 5 },
      { id: '#genz', tag: '#genz', count: 2 }
    ]);
  });

  it('archiveStatus forbids non-owners (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-9' }));
    const res = makeRes();
    await statusAdv.archiveStatus(makeReq({ params: { id: VALID_ID }, body: {} }), res);
    expect(res.statusCode).toBe(403);
  });

  it('archiveStatus archives the status (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.archiveStatus(makeReq({ params: { id: VALID_ID }, body: { isArchived: true } }), res);
    expect(status.isArchived).toBe(true);
    expect(status.archivedAt).toBeInstanceOf(Date);
    expect(status.save).toHaveBeenCalled();
  });

  it('getArchivedStatuses lists archived statuses (happy path)', async () => {
    Status.find.mockReturnValue(findChain([makeStatus({ isArchived: true })], 1));
    const res = makeRes();
    await statusAdv.getArchivedStatuses(makeReq(), res);
    expect(res.body.statuses).toHaveLength(1);
  });

  it('getReminder returns 404 for a missing status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusAdv.getReminder(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('getReminder returns the stored reminder (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ reminder: { enabled: true, time: new Date() } }));
    const res = makeRes();
    await statusAdv.getReminder(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.body.reminder.enabled).toBe(true);
  });

  it('setReminder stores the reminder (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.setReminder(makeReq({ params: { id: VALID_ID }, body: { reminderTime: '2025-01-01T10:00:00Z', reminderNote: 'Do it' } }), res);
    expect(status.reminder.enabled).toBe(true);
    expect(status.reminder.note).toBe('Do it');
    expect(status.reminder.time).toBeInstanceOf(Date);
    expect(status.save).toHaveBeenCalled();
  });

  it('getReactions counts reactions by emoji (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus({
      reactions: [{ emoji: '🔥' }, { emoji: '🔥' }, { emoji: '❤️' }]
    }));
    const res = makeRes();
    await statusAdv.getReactions(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.body.reactions).toEqual({ '🔥': 2, '❤️': 1 });
  });

});

describe('statusAdvancedController — polls/location/schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('addReaction replaces the user reaction (happy path)', async () => {
    const status = makeStatus({ reactions: [{ user: 'user-1', emoji: '😀' }] });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.addReaction(makeReq({ params: { id: VALID_ID }, body: { emoji: '🔥' } }), res);
    expect(status.reactions).toHaveLength(1);
    expect(status.reactions[0].emoji).toBe('🔥');
    expect(status.save).toHaveBeenCalled();
  });

  it('createPoll requires the owner (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-9' }));
    const res = makeRes();
    await statusAdv.createPoll(makeReq({ params: { id: VALID_ID }, body: { question: 'Q', options: ['a', 'b'] } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('createPoll stores options with vote counts (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.createPoll(makeReq({ params: { id: VALID_ID }, body: { question: 'Best?', options: ['A', 'B'], allowMultiple: true } }), res);
    expect(status.poll.question).toBe('Best?');
    expect(status.poll.options).toEqual([
      { id: 0, text: 'A', votes: 0 },
      { id: 1, text: 'B', votes: 0 }
    ]);
    expect(status.poll.allowMultiple).toBe(true);
    expect(status.save).toHaveBeenCalled();
  });

  it('votePoll rejects when there is no poll (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    const res = makeRes();
    await statusAdv.votePoll(makeReq({ params: { id: VALID_ID }, body: { optionIds: [0] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('No poll found');
  });

  it('votePoll rejects repeat voters (400)', async () => {
    const status = makeStatus({ poll: { options: [{ id: 0, text: 'A', votes: 0 }], voters: [{ user: 'user-1' }] } });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.votePoll(makeReq({ params: { id: VALID_ID }, body: { optionIds: [0] } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Umesha kura');
  });

  it('votePoll records the vote (happy path)', async () => {
    const status = makeStatus({ poll: { options: [{ id: 0, text: 'A', votes: 0 }, { id: 1, text: 'B', votes: 0 }], totalVotes: 0, voters: [] } });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.votePoll(makeReq({ params: { id: VALID_ID }, body: { optionIds: [0, 1] } }), res);
    expect(status.poll.voters).toHaveLength(1);
    expect(status.poll.options[0].votes).toBe(1);
    expect(status.poll.options[1].votes).toBe(1);
    expect(status.poll.totalVotes).toBe(1);
    expect(status.save).toHaveBeenCalled();
  });

  it('scheduleStatus marks the status as scheduled (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.scheduleStatus(makeReq({ params: { id: VALID_ID }, body: { scheduledTime: '2025-01-01T10:00:00Z' } }), res);
    expect(status.isScheduled).toBe(true);
    expect(status.scheduledFor).toBeInstanceOf(Date);
    expect(status.save).toHaveBeenCalled();
  });

  it('addLocation accepts lat/lng shape (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.addLocation(makeReq({ params: { id: VALID_ID }, body: { lat: -6.79, lng: 39.2, address: 'Dar' } }), res);
    expect(status.locationData).toEqual({ lat: -6.79, lng: 39.2, address: 'Dar', placeName: undefined });
    expect(status.save).toHaveBeenCalled();
  });

  it('addLocation accepts latitude/longitude shape (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.addLocation(makeReq({ params: { id: VALID_ID }, body: { latitude: '1.5', longitude: '2.5' } }), res);
    expect(status.locationData.lat).toBe(1.5);
    expect(status.locationData.lng).toBe(2.5);
  });

  it('getLocation returns 404 for a missing status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusAdv.getLocation(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('getLocation returns the stored location (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ locationData: { lat: 1, lng: 2 } }));
    const res = makeRes();
    await statusAdv.getLocation(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.body.locationData.lat).toBe(1);
  });
});

describe('statusAdvancedController — backup/restore/qr/mentions/hashtags', () => {
  beforeEach(() => jest.clearAllMocks());

  it('backupStatuses exports the user statuses (happy path)', async () => {
    Status.find.mockResolvedValue([makeStatus({ content: 'x', mediaUrl: 'u' })]);
    const res = makeRes();
    await statusAdv.backupStatuses(makeReq(), res);
    expect(res.body.backupData.statuses).toHaveLength(1);
    expect(res.body.backupData.statuses[0].content).toBe('x');
  });

  it('restoreStatuses rejects invalid backup data (400)', async () => {
    const res = makeRes();
    await statusAdv.restoreStatuses(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Backup data invalid');
  });

  it('restoreStatuses recreates statuses (happy path)', async () => {
    Status.create.mockResolvedValue(makeStatus({ _id: 's9' }));
    const res = makeRes();
    await statusAdv.restoreStatuses(makeReq({ body: { backupData: { statuses: [{ type: 'text', content: 'a' }, { type: 'text', content: 'b' }] } } }), res);
    expect(Status.create).toHaveBeenCalledTimes(2);
    expect(res.body.restored).toHaveLength(2);
  });

  it('generateQRCode builds a QR url for a status (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    const req = makeReq({ params: { id: VALID_ID }, body: { size: 512, color: '#ff0000', style: 'rounded' }, get: () => 'localhost:5000', protocol: 'http' });
    const res = makeRes();
    await statusAdv.generateQRCode(req, res);
    expect(res.body.qrCodeUrl).toContain('size=512x512');
    expect(res.body.qrCodeUrl).toContain('color=ff0000');
    expect(res.body.qrCodeUrl).toContain('qzone=2');
    expect(res.body.url).toContain(`/status/${VALID_ID}`);
  });

  it('generateQRCode falls back to the profile link (happy path)', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusAdv.generateQRCode(makeReq({
      body: { url: 'https://genz.app/u/alice' },
      get: () => 'localhost:5000',
      protocol: 'http'
    }), res);
    expect(res.body.url).toBe('https://genz.app/u/alice');
    expect(res.body.qrCodeUrl).toContain('data=');
  });

  it('addMention forbids non-owners (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-9' }));
    const res = makeRes();
    await statusAdv.addMention(makeReq({ params: { id: VALID_ID }, body: { mentionedUserId: 'user-2' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('addMention adds new mentions and skips duplicates (happy path)', async () => {
    const status = makeStatus({ mentions: [{ user: 'user-2', username: 'bob' }] });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.addMention(makeReq({
      params: { id: VALID_ID },
      body: { mentions: [{ id: 'user-2', username: 'bob' }, { id: 'user-3', username: 'carol' }] }
    }), res);
    expect(status.mentions).toHaveLength(2);
    expect(status.save).toHaveBeenCalled();
  });

  it('getMentions returns 404 for a missing status', async () => {
    Status.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = makeRes();
    await statusAdv.getMentions(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('getMentions returns mentions (happy path)', async () => {
    Status.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(makeStatus({ mentions: [{ user: 'u2' }] })) });
    const res = makeRes();
    await statusAdv.getMentions(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.body.mentions).toHaveLength(1);
  });

  it('addHashtags normalizes tags with # (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.addHashtags(makeReq({ params: { id: VALID_ID }, body: { hashtags: ['tech', '#genz'] } }), res);
    expect(status.hashtags).toEqual(['#tech', '#genz']);
    expect(status.save).toHaveBeenCalled();
  });
});

describe('statusAdvancedController — edit/duplicate/pin/template', () => {
  beforeEach(() => jest.clearAllMocks());

  it('editStatus updates fields and maps fontColor to textColor (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.editStatus(makeReq({
      params: { id: VALID_ID },
      body: { content: 'New', fontColor: '#ffffff', privacy: 'contacts', timerSeconds: 10 }
    }), res);
    expect(status.content).toBe('New');
    expect(status.textColor).toBe('#ffffff');
    expect(status.privacy).toBe('contacts');
    expect(status.timerSeconds).toBe(10);
    expect(status.editedAt).toBeInstanceOf(Date);
    expect(status.save).toHaveBeenCalled();
  });

  it('duplicateStatus creates a copy (happy path)', async () => {
    const original = makeStatus({ type: 'image', content: 'x', mediaUrl: 'u' });
    const duplicate = makeStatus({ _id: 's2' });
    Status.findById.mockResolvedValue(original);
    Status.create.mockResolvedValue(duplicate);
    const res = makeRes();
    await statusAdv.duplicateStatus(makeReq({ params: { id: VALID_ID } }), res);
    const args = Status.create.mock.calls[0][0];
    expect(args.isDuplicate).toBe(true);
    expect(args.originalStatusId).toBe(VALID_ID);
    expect(args.type).toBe('image');
    expect(res.body.status._id).toBe('s2');
  });

  it('pinStatus toggles the pin (happy path)', async () => {
    const status = makeStatus({ isPinned: false });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.pinStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(status.isPinned).toBe(true);
    expect(status.pinnedAt).toBeInstanceOf(Date);
  });

  it('getPinnedStatuses lists pinned statuses (happy path)', async () => {
    Status.find.mockReturnValue(findChain([makeStatus({ isPinned: true })], 1));
    const res = makeRes();
    await statusAdv.getPinnedStatuses(makeReq(), res);
    expect(res.body.statuses).toHaveLength(1);
  });

  it('reportStatus records a report (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.reportStatus(makeReq({ params: { id: VALID_ID }, body: { reason: 'spam' } }), res);
    expect(status.reports).toHaveLength(1);
    expect(status.reports[0].reporter).toBe('user-1');
    expect(status.save).toHaveBeenCalled();
    expect(res.body.message).toBe('Status reported');
  });

  it('createTemplate requires a type (400)', async () => {
    const res = makeRes();
    await statusAdv.createTemplate(makeReq({ body: { name: 'T' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('createTemplate creates a template (happy path)', async () => {
    Status.create.mockResolvedValue(makeStatus({ isTemplate: true }));
    const res = makeRes();
    await statusAdv.createTemplate(makeReq({ body: { name: 'Quote', type: 'text', content: 'Hi' } }), res);
    const args = Status.create.mock.calls[0][0];
    expect(args.isTemplate).toBe(true);
    expect(args.templateName).toBe('Quote');
    expect(res.body.template.isTemplate).toBe(true);
  });

  it('getTemplates lists templates (happy path)', async () => {
    Status.find.mockReturnValue(findChain([makeStatus({ isTemplate: true })], 0));
    const res = makeRes();
    await statusAdv.getTemplates(makeReq(), res);
    expect(res.body.templates).toHaveLength(1);
  });
});

describe('statusAdvancedController — analytics/drafts/favorites/history', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getAnalytics computes engagement from real data (happy path)', async () => {
    const status = makeStatus({
      views: [{ user: 'u1', viewedAt: new Date('2025-01-01T10:30:00Z') }, { user: 'u2', viewedAt: new Date('2025-01-01T14:00:00Z') }],
      reactions: [{ user: 'u1', emoji: '🔥' }],
      shares: [{ sharedBy: 'u2' }],
      saves: [{ status: VALID_ID }]
    });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.getAnalytics(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.body.analytics.totalViews).toBe(2);
    expect(res.body.analytics.uniqueViewers).toBe(2);
    expect(res.body.analytics.totalReactions).toBe(1);
    expect(res.body.analytics.shareCount).toBe(1);
    expect(res.body.analytics.viewsByTime).toHaveLength(2);
  });

  it('getAnalytics forbids non-owners (403)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-9' }));
    const res = makeRes();
    await statusAdv.getAnalytics(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('saveDraft creates a draft (happy path)', async () => {
    Status.create.mockResolvedValue(makeStatus({ isDraft: true }));
    const res = makeRes();
    await statusAdv.saveDraft(makeReq({ body: { type: 'text', content: 'draft' } }), res);
    const args = Status.create.mock.calls[0][0];
    expect(args.isDraft).toBe(true);
    expect(args.content).toBe('draft');
    expect(res.body.draft.isDraft).toBe(true);
  });

  it('getDrafts lists drafts (happy path)', async () => {
    Status.find.mockReturnValue(findChain([makeStatus({ isDraft: true })], 0));
    const res = makeRes();
    await statusAdv.getDrafts(makeReq(), res);
    expect(res.body.drafts).toHaveLength(1);
  });

  it('favoriteStatus toggles favorite on/off (happy path)', async () => {
    const status = makeStatus({ favoritedBy: [] });
    Status.findById.mockResolvedValue(status);
    let res = makeRes();
    await statusAdv.favoriteStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(status.favoritedBy).toHaveLength(1);
    expect(status.save).toHaveBeenCalled();

    const status2 = makeStatus({ favoritedBy: [{ user: 'user-1' }] });
    Status.findById.mockResolvedValue(status2);
    res = makeRes();
    await statusAdv.favoriteStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(status2.favoritedBy).toHaveLength(0);
  });

  it('getFavorites lists favorited statuses (happy path)', async () => {
    Status.find.mockReturnValue(findChain([makeStatus()], 1));
    const res = makeRes();
    await statusAdv.getFavorites(makeReq(), res);
    expect(res.body.statuses).toHaveLength(1);
  });

  it('getHistory filters by date range and type (happy path)', async () => {
    Status.find.mockReturnValue(findChain([makeStatus()], 1));
    const res = makeRes();
    await statusAdv.getHistory(makeReq({ query: { startDate: '2025-01-01', endDate: '2025-02-01', type: 'text' } }), res);
    const query = Status.find.mock.calls[0][0];
    expect(query.createdAt.$gte).toBeInstanceOf(Date);
    expect(query.createdAt.$lte).toBeInstanceOf(Date);
    expect(query.type).toBe('text');
    expect(res.body.history).toHaveLength(1);
  });

  it('getInsights computes insights for the owner (happy path)', async () => {
    const status = makeStatus({ views: [{ user: 'u1', viewedAt: new Date() }], reactions: [{ user: 'u1', emoji: '🔥' }], shareCount: 3 });
    Status.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(status) })
    });
    const res = makeRes();
    await statusAdv.getInsights(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.body.insights.viewCount).toBe(1);
    expect(res.body.insights.reactionCount).toBe(1);
    expect(res.body.insights.shareCount).toBe(3);
    expect(res.body.insights.topReactions).toEqual({ '🔥': 1 });
  });
});

describe('statusAdvancedController — share/download/mute/block/save/forward', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shareStatus records a share (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.shareStatus(makeReq({ params: { id: VALID_ID }, body: { platform: 'whatsapp' } }), res);
    expect(status.shares).toHaveLength(1);
    expect(status.shareCount).toBe(1);
    expect(status.save).toHaveBeenCalled();
  });

  it('downloadStatus records a download and returns the media url (happy path)', async () => {
    const status = makeStatus({ mediaUrl: 'https://x/y.mp4' });
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.downloadStatus(makeReq({ params: { id: VALID_ID }, body: { quality: 'hd' } }), res);
    expect(status.downloads).toHaveLength(1);
    expect(res.body.downloadUrl).toBe('https://x/y.mp4');
  });

  it('muteUserStatus rejects already-muted users (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    User.findById.mockResolvedValue({ mutedStatusUsers: [{ user: 'user-1' }] });
    const res = makeRes();
    await statusAdv.muteUserStatus(makeReq({ params: { id: VALID_ID }, body: { duration: 24 } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('User tayari ameshazimwa');
  });

  it('muteUserStatus mutes the poster (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = { mutedStatusUsers: [], markModified: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusAdv.muteUserStatus(makeReq({ params: { id: VALID_ID }, body: { duration: 24, reason: 'spam' } }), res);
    expect(user.mutedStatusUsers).toHaveLength(1);
    expect(user.mutedStatusUsers[0].user).toBe('user-2');
    expect(user.mutedStatusUsers[0].expiresAt).toBeInstanceOf(Date);
    expect(user.markModified).toHaveBeenCalledWith('mutedStatusUsers');
    expect(res.body.message).toBe('User amezimwa');
  });

  it('muteUserStatus parses string durations like "24h" into a future expiry', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = { mutedStatusUsers: [], markModified: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);
    const before = Date.now();
    const res = makeRes();
    await statusAdv.muteUserStatus(makeReq({ params: { id: VALID_ID }, body: { duration: '24h' } }), res);
    const expiresAt = user.mutedStatusUsers[0].expiresAt.getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 24 * 60 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(before + 24 * 60 * 60 * 1000 + 5000);
  });

  it('muteUserStatus treats "forever" as a permanent mute (no expiry)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = { mutedStatusUsers: [], markModified: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);

    const res = makeRes();
    await statusAdv.muteUserStatus(makeReq({ params: { id: VALID_ID }, body: { duration: 'forever' } }), res);
    expect(user.mutedStatusUsers[0].expiresAt).toBeNull();
  });

  it('muteUserStatus treats "1m" as a one-month mute', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = { mutedStatusUsers: [], markModified: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);

    const res = makeRes();
    await statusAdv.muteUserStatus(makeReq({ params: { id: VALID_ID }, body: { duration: '1m' } }), res);
    const monthExpiry = user.mutedStatusUsers[0].expiresAt.getTime();
    expect(monthExpiry).toBeGreaterThan(Date.now() + 29 * 24 * 60 * 60 * 1000);
  });

  it('unmuteUserStatus removes the muted entry (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = {
      mutedStatusUsers: [{ user: 'user-2', mutedAt: new Date() }, { user: 'user-3', mutedAt: new Date() }],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined)
    };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusAdv.unmuteUserStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(user.mutedStatusUsers).toHaveLength(1);
    expect(user.mutedStatusUsers[0].user).toBe('user-3');
    expect(res.body.removed).toBe(1);
    expect(res.body.success).toBe(true);
  });

  it('unmuteUserStatus returns 404 when the status and userId are unknown', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusAdv.unmuteUserStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('createStatusShareToken mints a token for the owner (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-1', userId: 'user-1' }));
    const res = makeRes();
    await statusAdv.createStatusShareToken(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token).toContain('.');
    expect(res.body.url).toContain(`/status/${VALID_ID}?share=`);
  });

  it('createStatusShareToken rejects non-owners with 403', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2', userId: 'user-2' }));
    const res = makeRes();
    await statusAdv.createStatusShareToken(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('createStatusShareToken returns 404 for an unknown status', async () => {
    Status.findById.mockResolvedValue(null);
    const res = makeRes();
    await statusAdv.createStatusShareToken(makeReq({ params: { id: VALID_ID } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('unblockUserStatus removes the status block (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = {
      blockedStatusUsers: [{ user: 'user-2', blockChatsToo: true }, { user: 'user-3' }],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined)
    };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusAdv.unblockUserStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(user.blockedStatusUsers).toHaveLength(1);
    expect(user.blockedStatusUsers[0].user).toBe('user-3');
    expect(res.body.removed).toBe(1);
  });

  it('unblockUserStatus supports a userId in the body', async () => {
    Status.findById.mockResolvedValue(null);
    const user = {
      blockedStatusUsers: [{ user: 'user-9' }],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined)
    };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusAdv.unblockUserStatus(makeReq({ params: { id: 'user-9' }, body: { userId: 'user-9' } }), res);
    expect(user.blockedStatusUsers).toHaveLength(0);
  });

  it('unblockUserStatus also lifts the chat block when blockChatsToo was set', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = {
      blockedStatusUsers: [{ user: 'user-2', blockChatsToo: true }, { user: 'user-3', blockChatsToo: false }],
      blockedUsers: ['user-2', 'user-5'],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined)
    };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusAdv.unblockUserStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(user.blockedStatusUsers).toHaveLength(1);
    expect(user.blockedStatusUsers[0].user).toBe('user-3');
    // chat block for user-2 removed, unrelated user-5 untouched
    expect(user.blockedUsers).toEqual(['user-5']);
    expect(user.markModified).toHaveBeenCalledWith('blockedUsers');
  });

  it('unblockUserStatus keeps the chat block for status-only blocks', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = {
      blockedStatusUsers: [{ user: 'user-2', blockChatsToo: false }],
      blockedUsers: ['user-2'],
      markModified: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined)
    };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusAdv.unblockUserStatus(makeReq({ params: { id: VALID_ID } }), res);
    expect(user.blockedStatusUsers).toHaveLength(0);
    expect(user.blockedUsers).toEqual(['user-2']);
  });

  it('getStatusBlockedUsers resolves user info via an explicit User.find (Mixed schema cannot populate)', async () => {
    User.findById.mockResolvedValue({
      blockedStatusUsers: [
        { user: 'user-2', reason: 'spam', blockChatsToo: true, blockedAt: new Date() },
        { user: 'user-3', reason: '', blockChatsToo: false, blockedAt: null }
      ]
    });
    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([
        { _id: 'user-2', username: 'bob', profilePicture: '' },
        { _id: 'user-3', username: 'carol', profilePicture: 'p.png' }
      ])
    });
    const res = makeRes();
    await statusAdv.getStatusBlockedUsers(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.blockedUsers).toHaveLength(2);
    expect(res.body.blockedUsers[0].username).toBe('bob');
    expect(res.body.blockedUsers[0].blockChatsToo).toBe(true);
    expect(res.body.blockedUsers[1].username).toBe('carol');
    expect(User.find).toHaveBeenCalledWith({ _id: { $in: ['user-2', 'user-3'] } });
  });

  it('blockUserStatus rejects already-blocked users (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    User.findById.mockResolvedValue({ blockedStatusUsers: [{ user: 'user-1' }] });
    const res = makeRes();
    await statusAdv.blockUserStatus(makeReq({ params: { id: VALID_ID }, body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('blockUserStatus blocks the poster, optionally chats too (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus({ user: 'user-2' }));
    const user = { blockedStatusUsers: [], blockedUsers: [], markModified: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusAdv.blockUserStatus(makeReq({ params: { id: VALID_ID }, body: { blockChatsToo: true } }), res);
    expect(user.blockedStatusUsers).toHaveLength(1);
    expect(user.blockedUsers).toEqual(['user-2']);
    expect(res.body.message).toBe('User ameblokiwa');
  });

  it('saveToCollection rejects duplicates (400)', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    User.findById.mockResolvedValue({ savedStatuses: [{ status: VALID_ID }] });
    const res = makeRes();
    await statusAdv.saveToCollection(makeReq({ params: { id: VALID_ID }, body: { folder: 'Favs' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Status tayari imesave');
  });

  it('saveToCollection saves to a folder (happy path)', async () => {
    Status.findById.mockResolvedValue(makeStatus());
    const user = { savedStatuses: [], markModified: jest.fn(), save: jest.fn().mockResolvedValue(undefined) };
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await statusAdv.saveToCollection(makeReq({ params: { id: VALID_ID }, body: { folder: 'Favs' } }), res);
    expect(user.savedStatuses).toHaveLength(1);
    expect(user.savedStatuses[0].folder).toBe('Favs');
    expect(user.markModified).toHaveBeenCalledWith('savedStatuses');
    expect(res.body.message).toBe('Status imesave');
  });

  it('forwardStatus records a forward (happy path)', async () => {
    const status = makeStatus();
    Status.findById.mockResolvedValue(status);
    const res = makeRes();
    await statusAdv.forwardStatus(makeReq({ params: { id: VALID_ID }, body: { contacts: ['u2'], groups: ['g1'] } }), res);
    expect(status.forwards).toHaveLength(1);
    expect(status.forwardCount).toBe(1);
    expect(status.forwards[0].contacts).toEqual(['u2']);
    expect(status.save).toHaveBeenCalled();
  });
});
