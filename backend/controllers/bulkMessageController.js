const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { serializeOutgoingMessage } = require('../utils/messageSerializer');
const { sendNewMessageNotification } = require('../services/notificationService');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

// POST /api/bulk/send - Tuma ujumbe kwa watu wengi (mass message / broadcast)
exports.sendBulkMessage = async (req, res) => {
  try {
    const senderId = getCurrentUserId(req);
    const { userIds, conversationIds, content, messageType, mediaUrl, fileName, fileSize } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Content or media is required' });
    }

    let targetIds = [];

    // Target specific user IDs (create/get 1-on-1 conversations)
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      targetIds = userIds.filter(id => id !== senderId);
    }

    // Target specific conversation IDs (existing conversations)
    const existingConversationIds = (conversationIds && Array.isArray(conversationIds))
      ? conversationIds : [];

    if (targetIds.length === 0 && existingConversationIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients specified' });
    }

    // Limit to prevent abuse
    if (targetIds.length > 600) {
      return res.status(400).json({ success: false, message: 'Maximum 600 recipients allowed per send' });
    }

    const results = { sent: 0, failed: 0, conversationIds: [] };
    const sender = await User.findById(senderId).select('username');

    const io = req.app.get('io');

    // Send to existing conversations first
    for (const convId of existingConversationIds) {
      try {
        const conversation = await Conversation.findById(convId);
        if (!conversation || !conversation.participants.some(p => String(p) === senderId)) {
          results.failed++;
          continue;
        }

        const message = await Message.create({
          conversationId: convId,
          sender: senderId,
          content: content || '',
          messageType: messageType || 'text',
          mediaUrl: mediaUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
        });

        await Conversation.findByIdAndUpdate(convId, {
          lastMessage: message._id,
          updatedAt: new Date()
        });

        if (io) {
          io.to(String(convId)).emit('message:received', serializeOutgoingMessage(message));
        }
        results.sent++;
        results.conversationIds.push(convId);
      } catch (e) {
        results.failed++;
        console.error('Bulk send error for conversation:', convId, e.message);
      }
    }

    // Create/get conversations for individual user IDs and send
    for (const targetUserId of targetIds) {
      try {
        // Find or create conversation
        let conversation = await Conversation.findOne({
          participants: { $all: [senderId, targetUserId] },
          isGroup: false,
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [senderId, targetUserId],
            isGroup: false,
          });
        }

        const message = await Message.create({
          conversationId: conversation._id,
          sender: senderId,
          content: content || '',
          messageType: messageType || 'text',
          mediaUrl: mediaUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: message._id,
          updatedAt: new Date(),
          deletedFor: [],
        });

        if (io) {
          io.to(String(conversation._id)).emit('message:received', serializeOutgoingMessage(message));
          io.to(String(targetUserId)).emit('message:received', serializeOutgoingMessage(message));
        }

        // Send push notification
        try {
          await sendNewMessageNotification(targetUserId, {
            senderName: sender?.username || 'GENZ',
            text: content?.substring(0, 120) || 'New message',
            conversationId: String(conversation._id),
            senderId: senderId,
            type: messageType || 'text'
          });
        } catch (notifyErr) { /* silent */ }

        results.sent++;
        results.conversationIds.push(String(conversation._id));
      } catch (e) {
        results.failed++;
        console.error('Bulk send error for user:', targetUserId, e.message);
      }
    }

    res.json({
      success: true,
      message: `Sent to ${results.sent} recipients (${results.failed} failed)`,
      ...results
    });
  } catch (error) {
    console.error('Bulk send error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/bulk/send-to-all-contacts - Tuma kwa mawasiliano yote
exports.sendToAllContacts = async (req, res) => {
  try {
    const senderId = getCurrentUserId(req);
    const { content, messageType, mediaUrl, fileName, fileSize } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Content or media is required' });
    }

    // Get user's contacts
    const user = await User.findById(senderId).select('contacts');
    if (!user || !user.contacts || user.contacts.length === 0) {
      return res.status(400).json({ success: false, message: 'No contacts found' });
    }

    const contactIds = user.contacts.map(c => String(c.user || c));
    const uniqueIds = [...new Set(contactIds)].filter(id => id !== senderId).slice(0, 600);

    const results = { sent: 0, failed: 0, conversationIds: [] };
    const sender = await User.findById(senderId).select('username');
    const io = req.app.get('io');

    for (const targetUserId of uniqueIds) {
      try {
        let conversation = await Conversation.findOne({
          participants: { $all: [senderId, targetUserId] },
          isGroup: false,
        });

        if (!conversation) {
          conversation = await Conversation.create({
            participants: [senderId, targetUserId],
            isGroup: false,
          });
        }

        const message = await Message.create({
          conversationId: conversation._id,
          sender: senderId,
          content: content || '',
          messageType: messageType || 'text',
          mediaUrl: mediaUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
        });

        await Conversation.findByIdAndUpdate(conversation._id, {
          lastMessage: message._id,
          updatedAt: new Date(),
          deletedFor: [],
        });

        if (io) {
          io.to(String(conversation._id)).emit('message:received', serializeOutgoingMessage(message));
          io.to(String(targetUserId)).emit('message:received', serializeOutgoingMessage(message));
        }

        results.sent++;
        results.conversationIds.push(String(conversation._id));
      } catch (e) {
        results.failed++;
      }
    }

    res.json({
      success: true,
      message: `Sent to ${results.sent} contacts (${results.failed} failed)`,
      ...results
    });
  } catch (error) {
    console.error('Send to all contacts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
