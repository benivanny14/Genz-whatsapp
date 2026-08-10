
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
  chatAnalysisEnabled: true,
  trackMessageCount: true,
  trackWordCount: true,
  trackEmojiUsage: true,
  trackActiveHours: true,
  trackResponseTime: true,
  trackMostUsedWords: true,
  trackConversationTopics: true,
  generateWeeklyReports: true,
  generateMonthlyReports: true,
  exportAnalysisData: true,
  shareAnalysis: false
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get chat analyzer settings
// @route   GET /api/chat-analyzer/settings
// @access  Private
exports.getChatAnalyzerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatAnalyzerSettings?.toObject?.() || user.chatAnalyzerSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat analyzer settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update chat analyzer settings
// @route   POST /api/chat-analyzer/settings
// @access  Private
exports.updateChatAnalyzerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatAnalyzerSettings?.toObject?.() || user.chatAnalyzerSettings || {};
    
    user.chatAnalyzerSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('chatAnalyzerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatAnalyzerSettings });
  } catch (error) {
    console.error('Update chat analyzer settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Analyze conversation
// @route   POST /api/chat-analyzer/analyze
// @access  Private
exports.analyzeConversation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, startDate, endDate } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => String(p) === String(user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    const messages = await Message.find({
      conversationId,
      ...(Object.keys(dateFilter).length ? { createdAt: dateFilter } : {})
    }).sort({ createdAt: 1 });

    // Calculate statistics
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.sender.toString() === user._id.toString());
    const otherMessages = messages.filter(m => m.sender.toString() !== user._id.toString());

    // Word count
    const totalWords = messages.reduce((sum, m) => sum + (m.content?.split(' ').length || 0), 0);
    const userWords = userMessages.reduce((sum, m) => sum + (m.content?.split(' ').length || 0), 0);
    const otherWords = otherMessages.reduce((sum, m) => sum + (m.content?.split(' ').length || 0), 0);

    // Emoji usage
    const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const totalEmojis = messages.reduce((sum, m) => sum + (m.content?.match(emojiRegex)?.length || 0), 0);
    const userEmojis = userMessages.reduce((sum, m) => sum + (m.content?.match(emojiRegex)?.length || 0), 0);

    // Most used words
    const wordFrequency = {};
    messages.forEach(m => {
      const words = m.content?.toLowerCase().split(/\s+/) || [];
      words.forEach(word => {
        if (word.length > 2) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
    });
    const mostUsedWords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    // Active hours
    const hourFrequency = {};
    messages.forEach(m => {
      const hour = new Date(m.createdAt).getHours();
      hourFrequency[hour] = (hourFrequency[hour] || 0) + 1;
    });
    const activeHours = Object.entries(hourFrequency)
      .sort((a, b) => b[1] - a[1])
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));

    // Average response time (simplified)
    let responseTimes = [];
    for (let i = 1; i < messages.length; i++) {
      if (messages[i].sender.toString() !== messages[i-1].sender.toString()) {
        const diff = new Date(messages[i].createdAt) - new Date(messages[i-1].createdAt);
        if (diff > 0 && diff < 86400000) { // Less than 24 hours
          responseTimes.push(diff);
        }
      }
    }
    const avgResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 1000 / 60) // in minutes
      : 0;

    // Message types
    const messageTypes = messages.reduce((acc, m) => {
      acc[m.messageType] = (acc[m.messageType] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      conversationId,
      analysis: {
        totalMessages,
        userMessages: userMessages.length,
        otherMessages: otherMessages.length,
        totalWords,
        userWords,
        otherWords,
        totalEmojis,
        userEmojis,
        mostUsedWords,
        activeHours,
        avgResponseTime: `${avgResponseTime} minutes`,
        messageTypes,
        dateRange: {
          start: messages[0]?.createdAt,
          end: messages[messages.length - 1]?.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Analyze conversation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user chat statistics
// @route   GET /api/chat-analyzer/user-stats
// @access  Private
exports.getUserChatStats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const conversations = await Conversation.find({
      participants: user._id
    });

    const conversationIds = conversations.map(c => c._id);
    const messages = await Message.find({
      conversationId: { $in: conversationIds }
    });

    const userMessages = messages.filter(m => m.sender.toString() === user._id.toString());
    const receivedMessages = messages.filter(m => m.sender.toString() !== user._id.toString());

    // Top conversations
    const conversationStats = {};
    messages.forEach(m => {
      const convId = m.conversationId.toString();
      conversationStats[convId] = (conversationStats[convId] || 0) + 1;
    });
    const topConversations = Object.entries(conversationStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([convId, count]) => ({
        conversationId: convId,
        messageCount: count,
        conversationName: conversations.find(c => c._id.toString() === convId)?.name || 'Unknown'
      }));

    res.status(200).json({
      success: true,
      stats: {
        totalConversations: conversations.length,
        totalMessages: messages.length,
        sentMessages: userMessages.length,
        receivedMessages: receivedMessages.length,
        topConversations
      }
    });
  } catch (error) {
    console.error('Get user chat stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate weekly report
// @route   GET /api/chat-analyzer/weekly-report
// @access  Private
exports.generateWeeklyReport = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const conversations = await Conversation.find({
      participants: user._id
    });

    const conversationIds = conversations.map(c => c._id);
    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      createdAt: { $gte: weekAgo }
    });

    const userMessages = messages.filter(m => m.sender.toString() === user._id.toString());

    // Daily message count
    const dailyStats = {};
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyStats[dateStr] = 0;
    }

    messages.forEach(m => {
      const dateStr = new Date(m.createdAt).toISOString().split('T')[0];
      if (dailyStats[dateStr] !== undefined) {
        dailyStats[dateStr]++;
      }
    });

    const dailyData = Object.entries(dailyStats).map(([date, count]) => ({ date, count }));

    res.status(200).json({
      success: true,
      report: {
        period: 'Last 7 days',
        totalMessages: messages.length,
        sentMessages: userMessages.length,
        receivedMessages: messages.length - userMessages.length,
        dailyStats: dailyData,
        averagePerDay: Math.round(messages.length / 7)
      }
    });
  } catch (error) {
    console.error('Generate weekly report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate monthly report
// @route   GET /api/chat-analyzer/monthly-report
// @access  Private
exports.generateMonthlyReport = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const conversations = await Conversation.find({
      participants: user._id
    });

    const conversationIds = conversations.map(c => c._id);
    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      createdAt: { $gte: monthAgo }
    });

    const userMessages = messages.filter(m => m.sender.toString() === user._id.toString());

    // Weekly breakdown
    const weeklyStats = {};
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000);
      const weekKey = `Week ${4 - i}`;
      weeklyStats[weekKey] = 0;
    }

    messages.forEach(m => {
      const msgDate = new Date(m.createdAt);
      const weeksAgo = Math.floor((Date.now() - msgDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      if (weeksAgo >= 0 && weeksAgo < 4) {
        const weekKey = `Week ${4 - weeksAgo}`;
        weeklyStats[weekKey]++;
      }
    });

    const weeklyData = Object.entries(weeklyStats).map(([week, count]) => ({ week, count }));

    res.status(200).json({
      success: true,
      report: {
        period: 'Last 30 days',
        totalMessages: messages.length,
        sentMessages: userMessages.length,
        receivedMessages: messages.length - userMessages.length,
        weeklyStats: weeklyData,
        averagePerDay: Math.round(messages.length / 30),
        averagePerWeek: Math.round(messages.length / 4)
      }
    });
  } catch (error) {
    console.error('Generate monthly report error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export analysis data
// @route   POST /api/chat-analyzer/export
// @access  Private
exports.exportAnalysisData = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, format } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const messages = await Message.find({ conversationId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });

    let exportData = '';

    if (format === 'csv') {
      exportData = 'Date,Sender,Message Type,Content\n';
      messages.forEach(msg => {
        const sender = msg.sender?.username || 'Unknown';
        const date = new Date(msg.createdAt).toISOString();
        const content = (msg.content || '').replace(/,/g, ' ');
        exportData += `${date},${sender},${msg.messageType},${content}\n`;
      });
    } else if (format === 'json') {
      exportData = JSON.stringify({
        conversationId,
        conversationName: conversation.name,
        exportedAt: new Date().toISOString(),
        messageCount: messages.length,
        messages: messages.map(msg => ({
          sender: msg.sender?.username,
          messageType: msg.messageType,
          content: msg.content,
          createdAt: msg.createdAt
        }))
      }, null, 2);
    }

    res.status(200).json({
      success: true,
      format,
      data: exportData,
      messageCount: messages.length
    });
  } catch (error) {
    console.error('Export analysis data error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset chat analyzer settings to default
// @route   POST /api/chat-analyzer/reset
// @access  Private
exports.resetChatAnalyzerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.chatAnalyzerSettings = mergeSettings({});
    user.markModified('chatAnalyzerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatAnalyzerSettings });
  } catch (error) {
    console.error('Reset chat analyzer settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

