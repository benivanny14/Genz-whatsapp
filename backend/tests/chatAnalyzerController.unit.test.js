jest.mock('../models/User', () => ({
  findById: jest.fn()
}));

jest.mock('../models/Conversation', () => ({
  find: jest.fn(),
  findById: jest.fn()
}));

jest.mock('../models/Message', () => ({
  find: jest.fn()
}));

const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const chatAnalyzer = require('../controllers/chatAnalyzerController');

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
  chatAnalyzerSettings: {},
  markModified: jest.fn(),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides
});

const makeMessage = (overrides = {}) => ({
  _id: 'm1',
  sender: 'user-1',
  conversationId: 'conv-1',
  content: 'hello world',
  messageType: 'text',
  createdAt: new Date('2026-08-01T10:00:00Z'),
  ...overrides
});

describe('chatAnalyzerController — settings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when the user cannot be resolved (auth)', async () => {
    User.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatAnalyzer.getChatAnalyzerSettings(makeReq(), res);
    expect(res.statusCode).toBe(401);
  });

  it('returns merged settings with defaults (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser({ chatAnalyzerSettings: { shareAnalysis: true } }));
    const res = makeRes();
    await chatAnalyzer.getChatAnalyzerSettings(makeReq(), res);
    expect(res.body.settings.shareAnalysis).toBe(true);
    expect(res.body.settings.chatAnalysisEnabled).toBe(true); // default
  });

  it('updates settings (happy path)', async () => {
    const user = makeUser();
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatAnalyzer.updateChatAnalyzerSettings(makeReq({ body: { settings: { trackEmojiUsage: false } } }), res);
    expect(user.save).toHaveBeenCalled();
    expect(res.body.settings.trackEmojiUsage).toBe(false);
  });

  it('resets settings to defaults (happy path)', async () => {
    const user = makeUser({ chatAnalyzerSettings: { trackEmojiUsage: false } });
    User.findById.mockResolvedValue(user);
    const res = makeRes();
    await chatAnalyzer.resetChatAnalyzerSettings(makeReq(), res);
    expect(res.body.settings.trackEmojiUsage).toBe(true); // default
  });
});

describe('chatAnalyzerController — analyze conversation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects analysis without a conversationId (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatAnalyzer.analyzeConversation(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Conversation ID is required');
  });

  it('rejects analysis of a missing conversation (404)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue(null);
    const res = makeRes();
    await chatAnalyzer.analyzeConversation(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.statusCode).toBe(404);
  });

  it('rejects analysis when the user is not a participant (403)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ participants: ['user-9'] });
    const res = makeRes();
    await chatAnalyzer.analyzeConversation(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.statusCode).toBe(403);
  });

  it('computes analysis stats (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ participants: ['user-1', 'user-2'] });
    const messages = [
      makeMessage({ sender: 'user-1', content: 'hello world' }),
      makeMessage({ sender: 'user-2', content: 'habari', createdAt: new Date('2026-08-01T10:05:00Z') }),
      makeMessage({ sender: 'user-1', content: 'good', createdAt: new Date('2026-08-01T10:10:00Z') })
    ];
    Message.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(messages) });
    const res = makeRes();
    await chatAnalyzer.analyzeConversation(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.analysis.totalMessages).toBe(3);
    expect(res.body.analysis.userMessages).toBe(2);
    expect(res.body.analysis.otherMessages).toBe(1);
    expect(res.body.analysis.totalWords).toBe(4);
    expect(res.body.analysis.messageTypes.text).toBe(3);
    expect(res.body.analysis.dateRange.start).toBeDefined();
  });

  it('handles empty conversations (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ participants: ['user-1'] });
    Message.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const res = makeRes();
    await chatAnalyzer.analyzeConversation(makeReq({ body: { conversationId: 'conv-1' } }), res);
    expect(res.body.analysis.totalMessages).toBe(0);
    expect(res.body.analysis.avgResponseTime).toBe('0 minutes');
  });
});

describe('chatAnalyzerController — stats & reports', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns user chat stats (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'conv-1', name: 'Family' }]);
    Message.find.mockResolvedValue([
      makeMessage({ conversationId: 'conv-1', sender: 'user-1' }),
      makeMessage({ conversationId: 'conv-1', sender: 'user-2' })
    ]);
    const res = makeRes();
    await chatAnalyzer.getUserChatStats(makeReq(), res);
    expect(res.body.stats.totalConversations).toBe(1);
    expect(res.body.stats.totalMessages).toBe(2);
    expect(res.body.stats.sentMessages).toBe(1);
    expect(res.body.stats.receivedMessages).toBe(1);
    expect(res.body.stats.topConversations[0].conversationName).toBe('Family');
  });

  it('generates a weekly report (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'conv-1' }]);
    Message.find.mockResolvedValue([makeMessage({ sender: 'user-1' })]);
    const res = makeRes();
    await chatAnalyzer.generateWeeklyReport(makeReq(), res);
    expect(res.body.report.period).toBe('Last 7 days');
    expect(res.body.report.totalMessages).toBe(1);
    expect(res.body.report.sentMessages).toBe(1);
    expect(res.body.report.dailyStats).toHaveLength(7);
  });

  it('generates a monthly report (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.find.mockResolvedValue([{ _id: 'conv-1' }]);
    Message.find.mockResolvedValue([makeMessage({ sender: 'user-2' })]);
    const res = makeRes();
    await chatAnalyzer.generateMonthlyReport(makeReq(), res);
    expect(res.body.report.period).toBe('Last 30 days');
    expect(res.body.report.totalMessages).toBe(1);
    expect(res.body.report.receivedMessages).toBe(1);
    expect(res.body.report.weeklyStats).toHaveLength(4);
  });

  it('rejects export without a conversationId (validation)', async () => {
    User.findById.mockResolvedValue(makeUser());
    const res = makeRes();
    await chatAnalyzer.exportAnalysisData(makeReq({ body: {} }), res);
    expect(res.statusCode).toBe(400);
  });

  it('exports analysis as CSV (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ _id: 'conv-1', name: 'Family' });
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([
        { sender: { username: 'alice' }, messageType: 'text', content: 'hi there', createdAt: new Date() }
      ]) })
    });
    const res = makeRes();
    await chatAnalyzer.exportAnalysisData(makeReq({ body: { conversationId: 'conv-1', format: 'csv' } }), res);
    expect(res.body.success).toBe(true);
    expect(res.body.format).toBe('csv');
    expect(res.body.data).toContain('Date,Sender,Message Type,Content');
    expect(res.body.messageCount).toBe(1);
  });

  it('exports analysis as JSON (happy path)', async () => {
    User.findById.mockResolvedValue(makeUser());
    Conversation.findById.mockResolvedValue({ _id: 'conv-1', name: 'Family' });
    Message.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) })
    });
    const res = makeRes();
    await chatAnalyzer.exportAnalysisData(makeReq({ body: { conversationId: 'conv-1', format: 'json' } }), res);
    expect(res.body.success).toBe(true);
    const parsed = JSON.parse(res.body.data);
    expect(parsed.conversationName).toBe('Family');
    expect(parsed.messageCount).toBe(0);
  });
});
