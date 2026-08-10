jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../models/Message', () => ({
  create: jest.fn(),
  deleteMany: jest.fn()
}));

jest.mock('../models/CallLog', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  deleteMany: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Call = require('../models/CallLog');
const fakeChat = require('../controllers/fakeChatController');

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
  fakeChatSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeSortQuery = (value) => ({ populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(value) });

describe('fakeChatController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await fakeChat.getFakeChatSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ fakeChatSettings: { markAsFake: false } }));
    const res = makeRes();
    await fakeChat.getFakeChatSettings(makeReq(), res);
    expect(res.body.settings.markAsFake).toBe(false);
    expect(res.body.settings.fakeRetentionDays).toBe(7); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await fakeChat.updateFakeChatSettings(makeReq({ body: { settings: { notifyOnFake: true } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.notifyOnFake).toBe(true);
  });

  it('toggles fake chat and calls (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await fakeChat.toggleFakeChat(makeReq({ body: { chatEnabled: true, callsEnabled: true } }), res);
    expect(res.body.settings.fakeChatEnabled).toBe(true);
    expect(res.body.settings.fakeCallsEnabled).toBe(true);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ fakeChatSettings: { fakeChatEnabled: true } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await fakeChat.resetFakeChatSettings(makeReq(), res);
    expect(res.body.settings.fakeChatEnabled).toBe(false); // default
  });
});

describe('fakeChatController — create/delete', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects createFakeChat without messages (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await fakeChat.createFakeChat(makeReq({ body: { contactName: 'Bob' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects creating when fake chat is disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await fakeChat.createFakeChat(makeReq({ body: { contactName: 'Bob', messages: [{ content: 'hi' }] } }), res);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toBe('Fake chat is disabled');
  });

  it('creates a fake chat with messages (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ fakeChatSettings: { fakeChatEnabled: true } }));
    Conversation.create.mockResolvedValue({ _id: 'fc1' });
    Message.create.mockResolvedValue({ _id: 'm1' });
    const res = makeRes();
    await fakeChat.createFakeChat(makeReq({ body: { contactName: 'Bob', messages: [{ content: 'hi', isFromMe: true }] } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.conversationId).toBe('fc1');
    expect(Message.create).toHaveBeenCalledTimes(1);
    expect(Conversation.create).toHaveBeenCalledWith(expect.objectContaining({ isFake: true }));
  });

  it('rejects createFakeCall without callType (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await fakeChat.createFakeCall(makeReq({ body: { contactName: 'Bob' } }), res);
    expect(res.statusCode).toBe(400);
  });

  it('rejects creating a fake call when calls are disabled (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await fakeChat.createFakeCall(makeReq({ body: { contactName: 'Bob', callType: 'voice' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('creates a fake call (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ fakeChatSettings: { fakeCallsEnabled: true } }));
    Call.create.mockResolvedValue({ _id: 'call1' });
    const res = makeRes();
    await fakeChat.createFakeCall(makeReq({ body: { contactName: 'Bob', callType: 'voice', duration: 60 } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.callId).toBe('call1');
    expect(Call.create).toHaveBeenCalledWith(expect.objectContaining({ isFake: true, status: 'completed' }));
  });

  it('lists fake chats (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockReturnValue(makeSortQuery([{
      toObject: () => ({ _id: 'fc1' }),
      fakeContactName: 'Bob',
      lastMessage: { content: 'hi' }
    }]));
    const res = makeRes();
    await fakeChat.getFakeChats(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(res.body.fakeChats[0].contactName).toBe('Bob');
  });

  it('lists fake calls (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Call.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ toObject: () => ({ direction: 'incoming' }), fakeContactName: 'Bob' }]) });
    const res = makeRes();
    await fakeChat.getFakeCalls(makeReq(), res);
    expect(res.body.fakeCalls[0].type).toBe('incoming');
  });

  it('returns 404 when deleting a missing fake chat', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await fakeChat.deleteFakeChat(makeReq({ params: { id: 'fc1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('deletes a fake chat and its messages (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ _id: 'fc1', isFake: true, participants: ['user-1'] });
    Message.deleteMany.mockResolvedValue({});
    Conversation.findByIdAndDelete.mockResolvedValue({});
    const res = makeRes();
    await fakeChat.deleteFakeChat(makeReq({ params: { id: 'fc1' } }), res);
    expect(res.body.success).toBe(true);
    expect(Message.deleteMany).toHaveBeenCalledWith({ conversationId: 'fc1' });
  });

  it('clears all fake data (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'fc1' }]);
    Message.deleteMany.mockResolvedValue({});
    Conversation.deleteMany.mockResolvedValue({});
    Call.deleteMany.mockResolvedValue({});
    const res = makeRes();
    await fakeChat.clearAllFakeData(makeReq(), res);
    expect(res.body.success).toBe(true);
    expect(Call.deleteMany).toHaveBeenCalled();
  });
});
