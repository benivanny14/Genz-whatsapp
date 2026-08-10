
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
  fakeChatEnabled: false,
  fakeCallsEnabled: false,
  saveFakeChats: true,
  saveFakeCalls: true,
  markAsFake: true,
  autoDeleteFake: false,
  fakeRetentionDays: 7,
  allowFakeExport: true,
  notifyOnFake: false
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get fake chat/calls settings
// @route   GET /api/fake-chat/settings
// @access  Private
exports.getFakeChatSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.fakeChatSettings?.toObject?.() || user.fakeChatSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get fake chat settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update fake chat/calls settings
// @route   POST /api/fake-chat/settings
// @access  Private
exports.updateFakeChatSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.fakeChatSettings?.toObject?.() || user.fakeChatSettings || {};
    
    user.fakeChatSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('fakeChatSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.fakeChatSettings });
  } catch (error) {
    console.error('Update fake chat settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create fake chat
// @route   POST /api/fake-chat/create
// @access  Private
exports.createFakeChat = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { contactName, contactPhone, messages, timestamp } = req.body;

    if (!contactName || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ success: false, message: 'Contact name and messages array are required' });
    }

    const settings = mergeSettings(user.fakeChatSettings?.toObject?.() || user.fakeChatSettings);
    
    if (!settings.fakeChatEnabled) {
      return res.status(403).json({ success: false, message: 'Fake chat is disabled' });
    }

    // Create fake conversation
    const fakeConversation = await Conversation.create({
      participants: [user._id],
      isGroup: false,
      isFake: true,
      fakeContactName: contactName,
      fakeContactPhone: contactPhone,
      createdAt: timestamp ? new Date(timestamp) : new Date()
    });

    // Create fake messages
    const fakeMessages = await Promise.all(
      messages.map(msg => Message.create({
        conversationId: fakeConversation._id,
        sender: user._id,
        content: msg.content,
        messageType: msg.messageType || 'text',
        mediaUrl: msg.mediaUrl || null,
        isFake: true,
        fakeSenderName: msg.isFromMe ? user.username : contactName,
        createdAt: msg.timestamp ? new Date(msg.timestamp) : new Date()
      }))
    );

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

// @desc    Create fake call
// @route   POST /api/fake-chat/call
// @access  Private
exports.createFakeCall = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { contactName, contactPhone, callType, duration, timestamp, isIncoming } = req.body;

    if (!contactName || !callType) {
      return res.status(400).json({ success: false, message: 'Contact name and call type are required' });
    }

    const settings = mergeSettings(user.fakeChatSettings?.toObject?.() || user.fakeChatSettings);
    
    if (!settings.fakeCallsEnabled) {
      return res.status(403).json({ success: false, message: 'Fake calls are disabled' });
    }

    const Call = require('../models/CallLog');
    
    const fakeCall = await Call.create({
      callerId: isIncoming ? user._id : user._id,
      calleeId: isIncoming ? null : null,
      participants: [user._id],
      direction: isIncoming ? 'incoming' : 'outgoing',
      callType,
      duration: duration || 0,
      status: duration > 0 ? 'completed' : 'missed',
      isFake: true,
      fakeContactName: contactName,
      fakeContactPhone: contactPhone,
      createdAt: timestamp ? new Date(timestamp) : new Date()
    });

    res.status(200).json({
      success: true,
      callId: fakeCall._id,
      message: 'Fake call created successfully'
    });
  } catch (error) {
    console.error('Create fake call error:', error);
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

    // Enforce "auto delete fake" — purge fake data older than retention window.
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

// @desc    Get fake calls
// @route   GET /api/fake-chat/calls
// @access  Private
exports.getFakeCalls = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const Call = require('../models/CallLog');

    const settings = mergeSettings(user.fakeChatSettings?.toObject?.() || user.fakeChatSettings);

    // Enforce "auto delete fake" — purge fake calls older than retention window.
    if (settings.autoDeleteFake) {
      const cutoff = Date.now() - (Number(settings.fakeRetentionDays) || 7) * 24 * 60 * 60 * 1000;
      await Call.deleteMany({
        $or: [
          { callerId: user._id },
          { calleeId: user._id }
        ],
        isFake: true,
        createdAt: { $lt: cutoff }
      });
    }
    
    const calls = await Call.find({
      $or: [
        { callerId: user._id },
        { calleeId: user._id }
      ],
      isFake: true
    }).sort({ createdAt: -1 });

    const fakeCalls = calls.map((call) => {
      const obj = call.toObject ? call.toObject() : call;
      return {
        ...obj,
        contactName: obj.fakeContactName || 'Unknown Contact',
        type: obj.direction || 'incoming'
      };
    });

    res.status(200).json({ success: true, fakeCalls });
  } catch (error) {
    console.error('Get fake calls error:', error);
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
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this chat' });
    }

    // Delete associated messages
    await Message.deleteMany({ conversationId: id });
    await Conversation.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Fake chat deleted' });
  } catch (error) {
    console.error('Delete fake chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete fake call
// @route   DELETE /api/fake-chat/call/:id
// @access  Private
exports.deleteFakeCall = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const Call = require('../models/CallLog');
    
    const call = await Call.findById(id);
    if (!call || !call.isFake) {
      return res.status(404).json({ success: false, message: 'Fake call not found' });
    }

    if (call.callerId?.toString() !== user._id.toString() && call.calleeId?.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this call' });
    }

    await Call.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Fake call deleted' });
  } catch (error) {
    console.error('Delete fake call error:', error);
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

    const { chatEnabled, callsEnabled } = req.body;
    const existing = user.fakeChatSettings?.toObject?.() || user.fakeChatSettings || {};
    
    user.fakeChatSettings = mergeSettings({
      ...existing,
      fakeChatEnabled: chatEnabled !== undefined ? chatEnabled : existing.fakeChatEnabled,
      fakeCallsEnabled: callsEnabled !== undefined ? callsEnabled : existing.fakeCallsEnabled
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

    // Delete fake conversations and their messages
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

    // Delete fake calls
    const Call = require('../models/CallLog');
    await Call.deleteMany({
      $or: [
        { callerId: user._id },
        { calleeId: user._id }
      ],
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
exports.resetFakeChatSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.fakeChatSettings = mergeSettings({});
    user.markModified('fakeChatSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.fakeChatSettings });
  } catch (error) {
    console.error('Reset fake chat settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

