const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');
const fakeConversations = require('../data/fakeConversations');

const defaultSettings = {
  fakeChatEnabled: false,
  saveFakeChats: true,
  markAsFake: true,
  autoDeleteFake: false,
  fakeRetentionDays: 7,
  allowFakeExport: true,
  notifyOnFake: false
};

const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get fake chat settings
// @route   GET /api/fake-chat/settings
// @access  Private
const { getSettings: getFakeChatSettings, updateSettings: updateFakeChatSettings, resetSettings: resetFakeChatSettings } = createSettingsHandlers({
  field: 'fakeChatSettings',
  label: 'fake chat',
  mergeSettings,
});

exports.getFakeChatSettings = getFakeChatSettings;

// @desc    Update fake chat settings
// @route   POST /api/fake-chat/settings
// @access  Private
exports.updateFakeChatSettings = updateFakeChatSettings;

// @desc    Get all pre-made conversations
// @route   GET /api/fake-chat/premade
// @access  Private
exports.getPremadeConversations = async (req, res) => {
  try {
    const templates = fakeConversations.map(conv => ({
      id: conv.id,
      contactName: conv.contactName,
      contactPhone: conv.contactPhone,
      category: conv.category,
      messageCount: conv.messages.length
    }));
    
    res.status(200).json({ success: true, conversations: templates });
  } catch (error) {
    console.error('Get pre-made conversations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pre-made conversation detail (with messages)
// @route   GET /api/fake-chat/premade/:id
// @access  Private
exports.getPremadeConversationDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const template = fakeConversations.find(conv => conv.id === id);
    
    if (!template) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }
    
    res.status(200).json({ success: true, conversation: template });
  } catch (error) {
    console.error('Get pre-made conversation detail error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create fake chat from pre-made conversation
// @route   POST /api/fake-chat/create
// @access  Private
exports.createFakeChat = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { templateId, timestamp } = req.body;

    if (!templateId) {
      return res.status(400).json({ success: false, message: 'Template ID is required' });
    }

    const settings = mergeSettings(user.fakeChatSettings?.toObject?.() || user.fakeChatSettings);
    
    if (!settings.fakeChatEnabled) {
      return res.status(403).json({ success: false, message: 'Fake chat is disabled. Enable it in Settings first.' });
    }

    // Find the template
    const template = fakeConversations.find(conv => conv.id === templateId);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Conversation template not found' });
    }

    // Create fake conversation
    const fakeConversation = await Conversation.create({
      participants: [user._id],
      isGroup: false,
      isFake: true,
      fakeContactName: template.contactName,
      fakeContactPhone: template.contactPhone,
      createdAt: timestamp ? new Date(timestamp) : new Date()
    });

    // Create fake messages from template with realistic timestamps
    const baseTime = timestamp ? new Date(timestamp) : new Date();
    const fakeMessages = await Promise.all(
      template.messages.map((msg, index) => Message.create({
        conversationId: fakeConversation._id,
        sender: user._id,
        content: msg.content,
        messageType: 'text',
        isFake: true,
        fakeSenderName: msg.isFromMe ? user.username : template.contactName,
        createdAt: new Date(baseTime.getTime() + index * (2 + Math.floor(Math.random() * 4)) * 60000)
      }))
    );

    // Update lastMessage
    fakeConversation.lastMessage = fakeMessages[fakeMessages.length - 1]._id;
    await fakeConversation.save();

    res.status(200).json({
      success: true,
      conversationId: fakeConversation._id,
      messages: fakeMessages,
      message: 'Fake chat created successfully'
    });
  } catch (error) {
    console.error('Create fake chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get fake chats
// @route   GET /api/fake-chat/chats
// @access  Private
exports.getFakeChats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.fakeChatSettings?.toObject?.() || user.fakeChatSettings);

    // Enforce auto delete
    if (settings.autoDeleteFake) {
      const cutoff = Date.now() - (Number(settings.fakeRetentionDays) || 7) * 24 * 60 * 60 * 1000;
      const stale = await Conversation.find({
        participants: user._id,
        isFake: true,
        createdAt: { $lt: cutoff }
      });
      for (const conv of stale) {
        await Message.deleteMany({ conversationId: conv._id });
      }
      await Conversation.deleteMany({
        participants: user._id,
        isFake: true,
        createdAt: { $lt: cutoff }
      });
    }

    const conversations = await Conversation.find({
      participants: user._id,
      isFake: true
    })
      .populate('lastMessage', 'content messageType mediaUrl isFromMe')
      .sort({ createdAt: -1 });

    const fakeChats = conversations.map((conv) => ({
      ...conv.toObject(),
      contactName: conv.fakeContactName || 'Unknown Contact',
      lastMessageText: conv.lastMessage?.content || ''
    }));

    res.status(200).json({ success: true, fakeChats });
  } catch (error) {
    console.error('Get fake chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete fake chat
// @route   DELETE /api/fake-chat/chat/:id
// @access  Private
exports.deleteFakeChat = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const conversation = await Conversation.findById(id);
    if (!conversation || !conversation.isFake) {
      return res.status(404).json({ success: false, message: 'Fake chat not found' });
    }

    if (!conversation.participants.some((p) => String(p) === String(user._id))) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await Message.deleteMany({ conversationId: id });
    await Conversation.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Fake chat deleted' });
  } catch (error) {
    console.error('Delete fake chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle fake chat
// @route   POST /api/fake-chat/toggle
// @access  Private
exports.toggleFakeChat = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { chatEnabled } = req.body;
    const existing = user.fakeChatSettings?.toObject?.() || user.fakeChatSettings || {};
    
    user.fakeChatSettings = mergeSettings({
      ...existing,
      fakeChatEnabled: chatEnabled !== undefined ? chatEnabled : existing.fakeChatEnabled
    });
    user.markModified('fakeChatSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.fakeChatSettings });
  } catch (error) {
    console.error('Toggle fake chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all fake data
// @route   DELETE /api/fake-chat/clear-all
// @access  Private
exports.clearAllFakeData = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const fakeConversations = await Conversation.find({
      participants: user._id,
      isFake: true
    });

    for (const conv of fakeConversations) {
      await Message.deleteMany({ conversationId: conv._id });
    }

    await Conversation.deleteMany({
      participants: user._id,
      isFake: true
    });

    res.status(200).json({ success: true, message: 'All fake data cleared' });
  } catch (error) {
    console.error('Clear all fake data error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset fake chat settings to default
// @route   POST /api/fake-chat/reset
// @access  Private
exports.resetFakeChatSettings = resetFakeChatSettings;
