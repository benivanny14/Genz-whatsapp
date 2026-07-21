const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

const FAKE_MESSAGES = [
  { content: 'Habari yako! 👋', type: 'text', delay: 0 },
  { content: 'Mzuri sana, wewe je?', type: 'text', delay: 500 },
  { content: 'Poa kabisa! Umeamkaje leo? ☀️', type: 'text', delay: 1000 },
  { content: 'Nimeamka freshi tu. Leo nina mipango mingi.', type: 'text', delay: 1500 },
  { content: 'Sawa kabisa. Usisahau ile kitu tuliyoongea jana.', type: 'text', delay: 2500 },
  { content: '😅 Haina shida, nimekumbuka.', type: 'text', delay: 3000 },
  { content: 'Poa! Tukutane saa ngapi?', type: 'text', delay: 4000 },
  { content: 'Saa 4 usiku iko sawa? 🕙', type: 'text', delay: 4500 },
  { content: 'Sawa kabisa, nitakuja na ile document 📄', type: 'text', delay: 5500 },
  { content: 'Nakushukuru sana! Tuonane 🙏', type: 'text', delay: 6000 },
];

// POST /api/fake-chat/generate - Generate fake conversation
exports.generateFakeChat = async (req, res) => {
  try {
    const senderId = getCurrentUserId(req);
    const { 
      friendName = 'Fake Friend', 
      messageCount = 10,
      friendProfilePicture = null 
    } = req.body;

    // Create or find fake user
    let fakeUser = await User.findOne({ 
      $or: [
        { username: friendName },
        { phoneNumber: `fake-${friendName.replace(/\s+/g, '-').toLowerCase()}` }
      ]
    });

    if (!fakeUser) {
      fakeUser = await User.create({
        username: friendName,
        phoneNumber: `fake-${friendName.replace(/\s+/g, '-').toLowerCase()}`,
        email: `fake-${friendName.replace(/\s+/g, '-').toLowerCase()}@fake.genz.local`,
        profilePicture: friendProfilePicture || null,
        status: 'offline',
        lastSeen: new Date(),
        about: 'Hey there! I am using GENZ WhatsApp',
      });
    }

    // Create conversation between user and fake user
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, fakeUser._id] },
      isGroup: false,
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, fakeUser._id],
        isGroup: false,
      });
    }

    // Generate fake messages
    const messages = [];
    const now = Date.now();
    const selectedMsgs = FAKE_MESSAGES.slice(0, Math.min(messageCount, FAKE_MESSAGES.length));

    for (let i = 0; i < selectedMsgs.length; i++) {
      const msg = selectedMsgs[i];
      const sender = i % 2 === 0 ? fakeUser._id : senderId;
      
      // Alternate between users for realism, with realistic timestamps
      const msgTime = new Date(now - (selectedMsgs.length - i) * 60000);
      
      const message = await Message.create({
        conversationId: conversation._id,
        sender,
        content: msg.content,
        messageType: msg.type || 'text',
        status: 'read',
        createdAt: msgTime,
      });

      messages.push(message);
    }

    // Update conversation with last message
    await Conversation.findByIdAndUpdate(conversation._id, {
      lastMessage: messages[messages.length - 1]._id,
      updatedAt: new Date(),
      deletedFor: [],
    });

    const populatedConv = await Conversation.findById(conversation._id)
      .populate('participants', 'username phoneNumber profilePicture isOnline lastSeen')
      .populate('lastMessage');

    // Emit real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(String(senderId)).emit('conversation:created', populatedConv);
      for (const msg of messages) {
        const populated = await Message.findById(msg._id)
          .populate('sender', 'username profilePicture');
        io.to(String(senderId)).emit('message:received', populated);
      }
    }

    res.json({
      success: true,
      message: `Generated ${messages.length} fake messages with "${friendName}"`,
      conversation: populatedConv,
      messageCount: messages.length,
    });
  } catch (error) {
    console.error('Fake chat error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/fake-chat/clear-all - Delete all chats & conversations
exports.clearAllChats = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    
    // Find all user's conversations
    const conversations = await Conversation.find({ participants: userId });
    const conversationIds = conversations.map(c => c._id);
    
    // Delete all messages in those conversations
    await Message.deleteMany({ conversationId: { $in: conversationIds } });
    
    // Delete all conversations
    await Conversation.deleteMany({ participants: userId });

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(String(userId)).emit('conversations:cleared', { userId });
    }

    res.json({
      success: true,
      message: `Deleted ${conversations.length} conversations and their messages`,
      deletedCount: conversations.length,
    });
  } catch (error) {
    console.error('Clear all chats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
