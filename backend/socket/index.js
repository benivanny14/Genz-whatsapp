const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Status = require('../models/Status');
const Broadcast = require('../models/Broadcast');
const { persistCallFromSocket } = require('../controllers/callController');
const activeCalls = require('../utils/activeCalls');
const { resolveMessageMentions } = require('../utils/mentions');
const { sendMentionNotification } = require('../services/notificationService');

let onlineUsers = new Map();
const socketToUser = new Map();
let messageDeduplication = new Map(); // Track processed messages to prevent duplicates

const isUserStillOnline = (userId) =>
  [...socketToUser.values()].some((id) => id?.toString() === userId?.toString());

const MESSAGE_DEDUP_TTL = 60000; // 1 minute TTL for deduplication
const SOCKET_SETUP_FLAG = Symbol.for('genz.socket.setup');
const includesId = (items = [], id) => items.some(item => item?.toString() === id?.toString());

const getConversationIfParticipant = async (conversationId, socket) => {
  if (!conversationId || !socket.userId) return null;
  const conversation = await Conversation.findById(conversationId);
  if (!conversation || !includesId(conversation.participants, socket.userId)) {
    socket.emit('error', { message: 'Not authorized for this conversation' });
    return null;
  }
  return conversation;
};

const getMessageIfParticipant = async (messageId, socket) => {
  if (!messageId || !socket.userId) return null;
  const message = await Message.findById(messageId);
  if (!message) return null;
  const conversation = await Conversation.findById(message.conversationId);
  if (!conversation || !includesId(conversation.participants, socket.userId)) {
    socket.emit('error', { message: 'Not authorized for this message' });
    return null;
  }
  return { message, conversation };
};
const getMapValue = (mapLike, key) => {
  if (!mapLike || !key) return undefined;
  if (typeof mapLike.get === 'function') return mapLike.get(String(key));
  return mapLike[String(key)];
};
const setMapValue = (doc, field, key, value) => {
  if (!doc[field]) doc[field] = new Map();
  if (typeof doc[field].set === 'function') {
    doc[field].set(String(key), value);
  } else {
    doc[field][String(key)] = value;
  }
  doc.markModified(field);
};
const deleteMapValue = (doc, field, key) => {
  if (!doc[field]) return;
  if (typeof doc[field].delete === 'function') {
    doc[field].delete(String(key));
  } else {
    delete doc[field][String(key)];
  }
  doc.markModified(field);
};

const notifyMentionedUsers = async ({ io, onlineUsers, mentionedUserIds = [], message, senderName, text, mentionerId }) => {
  if (!mentionedUserIds.length || !message?._id) return;

  mentionedUserIds.forEach((userId) => {
    const recipientSocketId = onlineUsers.get(userId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('notification:mention', {
        conversationId: message.conversationId?.toString(),
        message
      });
    }
  });

  await Promise.allSettled(
    mentionedUserIds.map((userId) =>
      sendMentionNotification(userId, {
        mentionerName: senderName || 'Someone',
        text,
        conversationId: message.conversationId?.toString(),
        messageId: message._id.toString(),
        mentionerId: mentionerId?.toString()
      })
    )
  );
};

const setupSocket = (io) => {
  if (io[SOCKET_SETUP_FLAG]) {
    return;
  }
  io[SOCKET_SETUP_FLAG] = true;

  // Clean up expired deduplication entries every minute
  const deduplicationCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of messageDeduplication.entries()) {
      if (now - timestamp > MESSAGE_DEDUP_TTL) {
        messageDeduplication.delete(key);
      }
    }
  }, 60000);
  deduplicationCleanupInterval.unref?.();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Handle reconnection
    socket.on('reconnect_attempt', () => {
      console.log('Reconnection attempt for socket:', socket.id);
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

    socket.on('user:join', async (userId) => {
      if (!userId) {
        console.error('No userId provided for user:join');
        return;
      }

      if (socket.userId && userId.toString() !== socket.userId.toString()) {
        console.error('[Socket] Blocked user:join impersonation attempt', {
          requested: userId,
          authenticated: socket.userId
        });
        return socket.emit('error', { message: 'Cannot join as another user' });
      }

      socketToUser.set(socket.id, userId);
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.join(userId.toString());

      try {
        const user = await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }, { new: true }).select('settings contacts');
        
        const privacySettings = user?.settings?.privacy || {};
        const onlineSetting = privacySettings.online === 'same_as_last_seen' 
          ? privacySettings.lastSeen 
          : privacySettings.online;

        if (onlineSetting === 'nobody') {
          // Do not broadcast
        } else if (onlineSetting === 'contacts' || onlineSetting === 'contacts_except') {
          const contacts = user?.contacts || [];
          contacts.forEach(contactId => {
            const recipientSocketId = onlineUsers.get(contactId.toString());
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('user:online', { userId });
            }
          });
        } else {
          socket.broadcast.emit('user:online', { userId });
        }
      } catch (error) {
        console.error('Error updating user online status:', error);
      }
    });

    socket.on('join:conversation', async (conversationId) => {
      if (!conversationId || !socket.userId) return;

      try {
        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !includesId(conversation.participants, socket.userId)) {
          return socket.emit('error', { message: 'Not authorized for this conversation' });
        }

        socket.join(conversationId);
        console.log(`User ${socket.userId} joined conversation ${conversationId}`);
      } catch (error) {
        console.error('Error joining conversation room:', error);
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(conversationId);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    socket.on('message:send', async (data) => {
      try {
        const { conversationId, content, messageType, mediaUrl, fileName, fileSize, duration, replyTo, messageId, mentions } = data;
        const safeContent = content || fileName || (mediaUrl ? `${messageType || 'media'} message` : '');
        if (!safeContent) {
          return socket.emit('message:error', { error: 'Message content or media is required' });
        }

        // Generate deduplication key
        const dedupKey = `${socket.userId}_${conversationId}_${messageId || Date.now()}_${safeContent}`;
        
        // Check if message was already processed
        if (messageDeduplication.has(dedupKey)) {
          console.log('Duplicate message detected, ignoring:', dedupKey);
          return;
        }

        // Mark message as processed
        messageDeduplication.set(dedupKey, Date.now());

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          console.warn('[Socket] Invalid conversationId provided:', conversationId);
          return socket.emit('message:error', { error: 'Invalid conversation ID format' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !includesId(conversation.participants, socket.userId)) {
          return socket.emit('message:error', { error: 'Not authorized for this conversation' });
        }

        const mentionData = await resolveMessageMentions({
          conversation,
          senderId: socket.userId,
          content: safeContent,
          mentions
        });

        const isClientE2EE =
          typeof safeContent === 'string' &&
          safeContent.trim().startsWith('{') &&
          safeContent.includes('ciphertext') &&
          safeContent.includes('senderPublicKey');

        const message = await Message.create({
          conversationId,
          sender: socket.userId,
          content: safeContent,
          isClientE2EE,
          messageType: messageType || 'text',
          mediaUrl: mediaUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          duration: duration || 0,
          replyTo: replyTo || null,
          mentions: mentionData.mentions
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture')
          .populate('replyTo')
          .populate('mentions.user', 'username profilePicture');

        conversation.lastMessage = message._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        const outgoingMessage = populatedMessage.toObject ? populatedMessage.toObject() : populatedMessage;
        if (messageId) {
          outgoingMessage.clientMessageId = messageId;
        }

        // Emit to everyone in the room except the sender
        socket.to(conversationId).emit('message:received', outgoingMessage);
        
        // Emit directly to participants to ensure delivery even if they haven't opened the chat
        if (conversation.participants && Array.isArray(conversation.participants)) {
          conversation.participants.forEach(participantId => {
            if (participantId.toString() !== socket.userId.toString()) {
              io.to(participantId.toString()).emit('message:received', outgoingMessage);
            }
          });
        }

        socket.emit('message:delivered', {
          messageId: messageId || populatedMessage._id.toString(),
          serverMessageId: populatedMessage._id.toString()
        });

        await notifyMentionedUsers({
          io,
          onlineUsers,
          mentionedUserIds: mentionData.mentionedUserIds,
          message: outgoingMessage,
          senderName: populatedMessage.sender?.username,
          text: safeContent,
          mentionerId: socket.userId
        });

        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== socket.userId) {
            const recipientSocketId = onlineUsers.get(participantId.toString());
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('notification:new_message', {
                conversationId,
                message: populatedMessage
              });
            }
          }
        });
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message:error', { error: error.message });
      }
    });

    socket.on('message:typing', async (data) => {
      const { conversationId, isTyping } = data;
      const conversation = await getConversationIfParticipant(conversationId, socket);
      if (!conversation) return;

      socket.to(conversationId).emit('user:typing', {
        userId: socket.userId,
        conversationId,
        isTyping
      });
    });

    socket.on('message:mark_delivered', async (data) => {
      try {
        const { messageId } = data;
        const result = await getMessageIfParticipant(messageId, socket);
        if (!result) return;
        const { message } = result;

        if (message.sender.toString() !== socket.userId && message.status === 'sent') {
          message.status = 'delivered';
          await message.save();
          
          const senderSocketId = onlineUsers.get(message.sender.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message:delivered', { messageId });
          }
        }
      } catch (error) {
        console.error('Error marking message as delivered:', error);
      }
    });

    socket.on('message:read', async (data) => {
      try {
        const { messageId } = data;
        const result = await getMessageIfParticipant(messageId, socket);
        if (!result) return;
        const { message } = result;

        if (message.sender.toString() !== socket.userId) {
          const alreadyRead = message.readBy.some(r => r.user.toString() === socket.userId);
          if (!alreadyRead) {
            message.readBy.push({ user: socket.userId, readAt: new Date() });
            message.status = 'read';
            await message.save();

            const reader = await User.findById(socket.userId).select('settings');
            const readReceiptsEnabled = reader?.settings?.privacy?.readReceipts !== false;

            if (readReceiptsEnabled) {
              const senderSocketId = onlineUsers.get(message.sender.toString());
              if (senderSocketId) {
                io.to(senderSocketId).emit('message:read_receipt', {
                  messageId,
                  readerId: socket.userId
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content } = data;
        const result = await getMessageIfParticipant(messageId, socket);
        if (!result) return;
        const { message } = result;

        if (message.sender.toString() === socket.userId) {
          message.content = content;
          message.isEdited = true;
          message.editedAt = new Date();
          await message.save();

          const updatedMessage = await Message.findById(message._id)
            .populate('sender', 'username profilePicture')
            .populate('replyTo');

          io.to(message.conversationId.toString()).emit('message:edited', updatedMessage);
        }
      } catch (error) {
        console.error('Error editing message:', error);
      }
    });

    socket.on('message:delete', async (data) => {
      try {
        const { messageId, forEveryone } = data;
        const result = await getMessageIfParticipant(messageId, socket);
        if (!result) return;
        const { message } = result;

        if (message.sender.toString() === socket.userId) {
          if (forEveryone) {
            message.deletedForEveryone = true;
          } else {
            if (!message.deletedFor.includes(socket.userId)) {
              message.deletedFor.push(socket.userId);
            }
          }
          await message.save();

          io.to(message.conversationId.toString()).emit('message:deleted', {
            messageId,
            forEveryone
          });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });

    socket.on('reaction:add', async (data) => {
      try {
        const { messageId, emoji } = data;
        const result = await getMessageIfParticipant(messageId, socket);
        if (!result) return;
        const { message } = result;

        const existingReaction = message.reactions.find(
          (r) => r.user.toString() === socket.userId
        );

        if (existingReaction) {
          existingReaction.emoji = emoji;
        } else {
          message.reactions.push({ user: socket.userId, emoji });
        }
        await message.save();

        const updatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture')
          .populate('replyTo')
          .populate('reactions.user', 'username profilePicture');

        io.to(message.conversationId.toString()).emit('reaction:added', updatedMessage);
      } catch (error) {
        console.error('Error adding reaction:', error);
      }
    });

    socket.on('reaction:remove', async (data) => {
      try {
        const { messageId } = data;
        const result = await getMessageIfParticipant(messageId, socket);
        if (!result) return;
        const { message } = result;

        message.reactions = message.reactions.filter(
          (r) => r.user.toString() !== socket.userId
        );
        await message.save();

        const updatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture')
          .populate('replyTo')
          .populate('reactions.user', 'username profilePicture');

        io.to(message.conversationId.toString()).emit('reaction:removed', updatedMessage);
      } catch (error) {
        console.error('Error removing reaction:', error);
      }
    });

    socket.on('message_reaction', async (data = {}) => {
      try {
        const { messageId, emoji } = data;
        if (!socket.userId) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        const conversation = await Conversation.findById(message.conversationId);
        if (!conversation || !includesId(conversation.participants, socket.userId)) {
          return;
        }

        const actorId = socket.userId;
        const existingReaction = message.reactions.find(
          r => r.user?.toString() === actorId.toString()
        );

        if (existingReaction) {
          existingReaction.emoji = emoji;
        } else {
          message.reactions.push({ user: actorId, emoji });
        }
        await message.save();

        const updatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture')
          .populate('replyTo')
          .populate('reactions.user', 'username profilePicture');

        io.to(message.conversationId.toString()).emit('reaction:added', updatedMessage);
        io.to(message.conversationId.toString()).emit('message_reaction_signal', {
          messageId,
          reactions: updatedMessage.reactions
        });
      } catch (error) {
        console.error('Error handling legacy message reaction:', error);
      }
    });

    socket.on('call:start', (data) => {
      const { conversationId, callType, calleeId, targetUserId } = data;
      if (socket.userId) {
        activeCalls.startCall(socket.userId, {
          conversationId,
          callType,
          calleeId: calleeId || targetUserId
        });
      }
      socket.to(conversationId).emit('call:incoming', {
        callerId: socket.userId,
        conversationId,
        callType
      });
    });

    socket.on('call_user', (data = {}) => {
      const conversationId = data.conversationId || data.chatId;
      if (conversationId) {
        socket.to(conversationId).emit('call:incoming', {
          ...data,
          callerId: socket.userId,
          conversationId
        });
      }
      socket.broadcast.emit('incoming_call_signal', {
        ...data,
        callerId: socket.userId
      });
    });

    socket.on('call:accept', (data) => {
      const { conversationId, callerId } = data;
      const callerSocketId = onlineUsers.get(callerId);
      if (callerSocketId) {
        io.to(callerSocketId).emit('call:accepted', { conversationId });
      }
    });

    socket.on('call:reject', async (data = {}) => {
      const { conversationId, callerId, callerSocketId, callType = 'voice' } = data;
      const targetSocketId = callerSocketId || onlineUsers.get(String(callerId));
      if (targetSocketId) {
        io.to(targetSocketId).emit('call:rejected', {
          conversationId,
          responderId: socket.userId
        });
      }

      try {
        if (socket.userId && callerId) {
          const result = await persistCallFromSocket({
            callerId,
            calleeId: socket.userId,
            conversationId,
            callType,
            status: 'missed',
            duration: 0
          });
          if (result?.formatForUser) {
            const calleeLog = result.formatForUser(socket.userId);
            const callerLog = result.formatForUser(callerId);
            socket.emit('call:log:created', calleeLog);
            const callerSocket = onlineUsers.get(String(callerId));
            if (callerSocket) io.to(callerSocket).emit('call:log:created', callerLog);
          }
        }
      } catch (err) {
        console.error('call:reject log error:', err);
      }
      activeCalls.endCall(socket.userId, conversationId);
    });

    socket.on('call:end', async (data = {}) => {
      const { conversationId, targetUserId, callType = 'voice' } = data;
      const targetSocketId = targetUserId ? onlineUsers.get(String(targetUserId)) : null;

      if (targetSocketId) {
        io.to(targetSocketId).emit('call:ended', {
          callerId: socket.userId,
          conversationId
        });
      }

      if (conversationId) {
        io.to(conversationId).emit('call:ended', { conversationId });
        io.to(conversationId).emit('call:ended_all', { conversationId });
      }

      try {
        const session = activeCalls.endCall(socket.userId, conversationId);
        if (socket.userId && session) {
          const result = await persistCallFromSocket({
            callerId: socket.userId,
            calleeId: session.calleeId || targetUserId,
            conversationId,
            callType: session.callType || callType,
            status: 'completed',
            duration: session.duration || 0,
            startedAt: new Date(session.startedAt)
          });
          if (result?.formatForUser) {
            const callerLog = result.formatForUser(socket.userId);
            socket.emit('call:log:created', callerLog);
            if (session.calleeId) {
              const calleeSocket = onlineUsers.get(String(session.calleeId));
              const calleeLog = result.formatForUser(session.calleeId);
              if (calleeSocket) io.to(calleeSocket).emit('call:log:created', calleeLog);
            } else if (conversationId) {
              socket.to(conversationId).emit('call:log:created', callerLog);
            }
          }
        }
      } catch (err) {
        console.error('call:end log error:', err);
      }
    });

    socket.on('end_call', (data = {}) => {
      const conversationId = data.conversationId || data.chatId;
      if (conversationId) {
        io.to(conversationId).emit('call:ended', { conversationId });
      }
      socket.broadcast.emit('call_ended_signal', data);
    });

    // Star message handler
    socket.on('star_message', async (data) => {
      try {
        const messageId = typeof data === 'object' ? data?.messageId : data;
        const hasExplicitStar = typeof data?.isStarred === 'boolean';
        const message = await Message.findById(messageId);
        if (message) {
          const conversation = await Conversation.findById(message.conversationId);
          if (!includesId(conversation?.participants, socket.userId)) return;

          message.isStarred = hasExplicitStar ? data.isStarred : !message.isStarred;
          await message.save();
          const updatedMessage = await Message.findById(message._id)
            .populate('sender', 'username profilePicture')
            .populate('replyTo');
          io.to(message.conversationId.toString()).emit('message:starred', updatedMessage);
        }
      } catch (error) {
        console.error('Error starring message:', error);
      }
    });

    // Pin message handler
    socket.on('pin_message', async (data) => {
      try {
        const { chatId, messageId } = data;
        const conversation = await getConversationIfParticipant(chatId, socket);
        if (!conversation) return;

        if (!conversation.pinnedMessages) {
          conversation.pinnedMessages = [];
        }
        if (!conversation.pinnedMessages.includes(messageId)) {
          conversation.pinnedMessages.push(messageId);
          await conversation.save();
          io.to(chatId).emit('conversation:pinned', { chatId, messageId });
        }
      } catch (error) {
        console.error('Error pinning message:', error);
      }
    });

    socket.on('unpin_message', async (data) => {
      try {
        const { chatId } = data;
        const conversation = await getConversationIfParticipant(chatId, socket);
        if (!conversation || !conversation.pinnedMessages) return;

        conversation.pinnedMessages = [];
        await conversation.save();
        io.to(chatId).emit('conversation:unpinned', { chatId });
      } catch (error) {
        console.error('Error unpinning message:', error);
      }
    });

    // Status create handler
    socket.on('status:create', async (data) => {
      try {
        const { type, content, mediaUrl, caption, backgroundColor, textColor, font, privacy, collabUserId, collabUsername, clientStatusId } = data;
        const status = await Status.create({
          userId: socket.userId,
          username: (await User.findById(socket.userId))?.username,
          type,
          content: content || caption || `${type || 'text'} status`,
          mediaUrl,
          caption,
          backgroundColor,
          textColor,
          font,
          privacy,
          collabUserId: collabUserId || '',
          collabUsername: collabUsername || '',
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
        });
        const statusObj = status.toObject ? status.toObject() : status;
        if (clientStatusId) {
          statusObj.clientStatusId = clientStatusId;
        }
        io.emit('status:created', statusObj);
        // If collab, also emit to collab user so it appears on their profile too
        if (collabUserId) {
          io.to(collabUserId).emit('status:collab_invite', { statusId: status._id, fromUsername: status.username });
        }
      } catch (error) {
        console.error('Error creating status:', error);
      }
    });

    // Status view handler
    socket.on('status:view', async (data) => {
      try {
        const { statusId } = data;
        const status = await Status.findById(statusId);
        if (status) {
          const alreadyViewed = status.views.some(view => view.user?.toString() === socket.userId);
          if (!alreadyViewed) {
            status.views.push({ user: socket.userId, viewedAt: new Date() });
            status.viewsCount = status.views.length;
          }
          await status.save();
          io.emit('status:viewed', status);
        }
      } catch (error) {
        console.error('Error viewing status:', error);
      }
    });

    socket.on('view_status', async (data = {}) => {
      try {
        const { statusId } = data;
        if (statusId) {
          const status = await Status.findById(statusId);
          if (status && !status.views.some(view => view.user?.toString() === socket.userId)) {
            status.views.push({ user: socket.userId, viewedAt: new Date() });
            status.viewsCount = status.views.length;
            await status.save();
          }
        }
        io.emit('status_view_signal', {
          ...data,
          userId: data.userId || socket.userId,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error relaying status view:', error);
      }
    });

    socket.on('status_like', async (data = {}) => {
      try {
        const { statusId } = data;
        let liked = Boolean(data.liked);
        let likesCount = data.likesCount || 0;
        if (statusId) {
          const status = await Status.findById(statusId);
          if (status) {
            const existingIndex = status.likes.findIndex(userId => userId.toString() === socket.userId);
            liked = existingIndex === -1;
            if (liked) {
              status.likes.push(socket.userId);
            } else {
              status.likes.splice(existingIndex, 1);
            }
            status.likesCount = status.likes.length;
            likesCount = status.likesCount;
            await status.save();
          }
        }
        io.emit('status_liked_signal', {
          statusId,
          liked,
          likesCount,
          userId: socket.userId
        });
      } catch (error) {
        console.error('Error liking status in socket:', error);
      }
    });

    socket.on('status_comment', async (data = {}) => {
      try {
        const { statusId, content, type = 'text', mediaUrl = '' } = data;
        const reply = {
          userId: socket.userId,
          username: socket.user?.username || 'GENZ User',
          content,
          type,
          mediaUrl,
          createdAt: new Date()
        };
        if (statusId && content) {
          const status = await Status.findById(statusId);
          if (status) {
            status.replies.push(reply);
            await status.save();
          }
        }
        io.emit('status_comment_signal', {
          statusId,
          ...reply,
          timestamp: reply.createdAt.toISOString()
        });
      } catch (error) {
        console.error('Error commenting on status in socket:', error);
      }
    });

    socket.on('live_reaction', (data = {}) => {
      const payload = {
        chatId: data.chatId || data.conversationId,
        emoji: data.emoji,
        userId: socket.userId,
        timestamp: new Date().toISOString()
      };
      if (payload.chatId) {
        socket.to(payload.chatId).emit('live_reaction_signal', payload);
      } else {
        socket.broadcast.emit('live_reaction_signal', payload);
      }
    });

    // Broadcast create handler
    socket.on('broadcast:create', async (data) => {
      try {
        const { name, recipients, message, sender } = data;
        const broadcast = await Broadcast.create({
          name: name || `Broadcast ${new Date().toLocaleDateString()}`,
          sender: sender || socket.userId,
          createdBy: socket.userId,
          recipients: recipients || [],
          message: message || 'Broadcast message',
          timestamp: new Date()
        });
        io.emit('broadcast:created', broadcast);
      } catch (error) {
        console.error('Error creating broadcast:', error);
      }
    });

    // Send mass message handler
    socket.on('send_mass_message', async (data) => {
      try {
        const { recipients = [], message } = data;
        if (!socket.userId || !message) return;

        for (const recipientId of recipients) {
          let conversation = await Conversation.findOne({
            participants: { $all: [socket.userId, recipientId] },
            isGroup: false
          });

          let isNewConv = false;
          if (!conversation) {
            conversation = await Conversation.create({
              participants: [socket.userId, recipientId],
              isGroup: false
            });
            isNewConv = true;
          }

          const newMessage = await Message.create({
            conversationId: conversation._id,
            sender: socket.userId,
            content: message,
            messageType: 'text',
            timestamp: new Date()
          });

          const populatedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'username profilePicture');

          conversation.lastMessage = newMessage._id;
          conversation.updatedAt = new Date();
          await conversation.save();

          if (isNewConv) {
            const populatedConv = await Conversation.findById(conversation._id)
              .populate('participants', 'username phoneNumber email profilePicture isOnline lastSeen about')
              .populate('admins', 'username profilePicture')
              .populate('lastMessage');

            const senderSocketId = onlineUsers.get(socket.userId.toString());
            const recipientSocketId = onlineUsers.get(recipientId.toString());

            if (senderSocketId) {
              io.to(senderSocketId).emit('conversation:created', populatedConv);
            }
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('conversation:created', populatedConv);
            }
          }

          io.to(conversation._id.toString()).emit('message:received', populatedMessage);

          const recipientSocketId = onlineUsers.get(recipientId.toString());
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message:received', populatedMessage);
          }
        }
      } catch (error) {
        console.error('Error sending mass message:', error);
      }
    });

    // Poll create handler
    socket.on('poll:create', async (data) => {
      try {
        const { conversationId, question, options } = data;
        const message = await Message.create({
          conversationId,
          sender: socket.userId,
          content: question,
          messageType: 'poll',
          poll: {
            question,
            options: options.map(opt => ({ text: opt, votes: [] }))
          }
        });
        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture');
        io.to(conversationId).emit('poll:created', populatedMessage);
      } catch (error) {
        console.error('Error creating poll:', error);
      }
    });

    // Poll vote handler
    socket.on('poll:vote', async (data) => {
      try {
        const { messageId, optionIndex } = data;
        const message = await Message.findById(messageId);
        if (message && message.poll) {
          const userId = socket.userId;
          // Remove previous vote if any
          message.poll.options.forEach(opt => {
            opt.votes = opt.votes.filter(v => v !== userId);
          });
          // Add new vote
          message.poll.options[optionIndex].votes.push(userId);
          await message.save();
          const updatedMessage = await Message.findById(message._id)
            .populate('sender', 'username profilePicture');
          io.to(message.conversationId.toString()).emit('poll:voted', updatedMessage);
        }
      } catch (error) {
        console.error('Error voting on poll:', error);
      }
    });

    // Disappearing messages handler
    socket.on('disappearing_messages:set', async (data) => {
      try {
        const { chatId, duration } = data;
        const conversation = await getConversationIfParticipant(chatId, socket);
        if (!conversation) return;

        conversation.disappearingMessages = {
          enabled: Boolean(duration && duration !== 'Off' && duration !== 'off'),
          duration: duration || '24h',
          timer: duration === '7d' ? 168 : duration === '90d' ? 2160 : 24
        };
        await conversation.save();
        io.to(chatId).emit('disappearing_messages:set', { chatId, duration: conversation.disappearingMessages.duration });
        io.to(chatId).emit('group_update_signal', {
          chatId,
          action: 'update_disappearing',
          duration: conversation.disappearingMessages.duration
        });
      } catch (error) {
        console.error('Error setting disappearing messages:', error);
      }
    });

    socket.on('update_disappearing_messages', async (data = {}) => {
      try {
        const { chatId, duration } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation && includesId(conversation.participants, socket.userId)) {
          conversation.disappearingMessages = {
            enabled: Boolean(duration && duration !== 'Off' && duration !== 'off'),
            duration: duration || '24h',
            timer: duration === '7d' ? 168 : duration === '90d' ? 2160 : 24
          };
          await conversation.save();
        }
        io.to(chatId).emit('group_update_signal', {
          chatId,
          action: 'update_disappearing',
          duration
        });
      } catch (error) {
        console.error('Error updating disappearing messages:', error);
      }
    });

    // Schedule message handler
    socket.on('schedule_message', async (data) => {
      try {
        const {
          chatId,
          conversationId = chatId,
          message,
          content = message,
          scheduleTime,
          scheduledFor = scheduleTime,
          messageType = 'text',
          mediaUrl = ''
        } = data;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !includesId(conversation.participants, socket.userId)) {
          return socket.emit('message:error', { error: 'Not authorized for this conversation' });
        }

        const scheduledDate = new Date(scheduledFor);
        if (!content || Number.isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
          return socket.emit('message:error', { error: 'Valid content and future schedule time are required' });
        }

        const scheduledMessage = await Message.create({
          conversationId,
          sender: socket.userId,
          content,
          messageType,
          mediaUrl,
          isScheduled: true,
          scheduledFor: scheduledDate
        });

        socket.emit('message:scheduled', {
          success: true,
          message: scheduledMessage
        });
      } catch (error) {
        console.error('Error scheduling message:', error);
        socket.emit('message:error', { error: error.message });
      }
    });

    // Update status handler
    socket.on('update_status', async (data) => {
      try {
        const { statusId, updates } = data;
        const status = await Status.findById(statusId);
        if (status) {
          Object.assign(status, updates);
          await status.save();
          io.emit('status:updated', status);
        }
      } catch (error) {
        console.error('Error updating status:', error);
      }
    });

    // Create broadcast list handler
    socket.on('create_broadcast_list', async (data) => {
      try {
        const { name, recipients } = data;
        const broadcastList = await Broadcast.create({
          name: name || `Broadcast ${new Date().toLocaleDateString()}`,
          createdBy: socket.userId,
          recipients: recipients || [],
          sender: socket.userId,
          message: 'Broadcast list created',
          timestamp: new Date()
        });
        io.emit('broadcast_list:created', broadcastList);
      } catch (error) {
        console.error('Error creating broadcast list:', error);
      }
    });

    // Update auto reply handler
    socket.on('update_auto_reply', async (data) => {
      try {
        if (!socket.userId) return;
        const { autoReplyEnabled, message } = data;
        await User.findByIdAndUpdate(socket.userId, {
          autoReplyEnabled,
          autoReplyMessage: message
        });
      } catch (error) {
        console.error('Error updating auto reply:', error);
      }
    });

    // Block user handler
    socket.on('block_user', async (data) => {
      try {
        if (!socket.userId) return;
        const { userId } = data;
        const blocker = await User.findById(socket.userId);
        if (blocker) {
          if (!blocker.blockedUsers) blocker.blockedUsers = [];
          if (!blocker.blockedUsers.includes(userId)) {
            blocker.blockedUsers.push(userId);
            await blocker.save();
            io.emit('user:blocked', { blockerId: socket.userId, userId });
          }
        }
      } catch (error) {
        console.error('Error blocking user:', error);
      }
    });

    // Unblock user handler
    socket.on('unblock_user', async (data) => {
      try {
        if (!socket.userId) return;
        const { userId } = data;
        const blocker = await User.findById(socket.userId);
        if (blocker && blocker.blockedUsers) {
          blocker.blockedUsers = blocker.blockedUsers.filter(
            (id) => id.toString() !== userId?.toString()
          );
          await blocker.save();
          io.emit('user:unblocked', { blockerId: socket.userId, userId });
        }
      } catch (error) {
        console.error('Error unblocking user:', error);
      }
    });

    // Archive chat handler
    socket.on('archive_chat', async (data) => {
      try {
        const { chatId } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation && includesId(conversation.participants, socket.userId)) {
          const nextValue = !Boolean(getMapValue(conversation.isArchived, socket.userId));
          setMapValue(conversation, 'isArchived', socket.userId, nextValue);
          await conversation.save();
          socket.emit('chat:archived', { chatId, isArchived: nextValue });
          socket.emit('chat_archived_signal', { chatId, isArchived: nextValue });
        }
      } catch (error) {
        console.error('Error archiving chat:', error);
      }
    });

    // Mute chat handler
    socket.on('mute_chat', async (data) => {
      try {
        const { chatId, mutedUntil } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation && includesId(conversation.participants, socket.userId)) {
          const currentMutedUntil = getMapValue(conversation.mutedUntil, socket.userId);
          const shouldMute = !currentMutedUntil || new Date(currentMutedUntil) <= new Date();
          if (shouldMute) {
            setMapValue(
              conversation,
              'mutedUntil',
              socket.userId,
              mutedUntil ? new Date(mutedUntil) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
            );
          } else {
            deleteMapValue(conversation, 'mutedUntil', socket.userId);
          }
          await conversation.save();
          socket.emit('chat:muted', { chatId, isMuted: shouldMute });
          socket.emit('chat_muted_signal', { chatId, isMuted: shouldMute });
        }
      } catch (error) {
        console.error('Error muting chat:', error);
      }
    });

    // Toggle chat lock handler
    socket.on('toggle_chat_lock', async (data) => {
      try {
        const { chatId, isLocked, pin } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation && includesId(conversation.participants, socket.userId)) {
          setMapValue(conversation, 'lockedBy', socket.userId, Boolean(isLocked));
          if (pin) {
            setMapValue(conversation, 'lockPins', socket.userId, pin);
          }
          await conversation.save();
          socket.emit('chat:lock_toggled', { chatId, isLocked: Boolean(isLocked) });
          socket.emit('chat_lock_signal', { chatId, isLocked: Boolean(isLocked) });
        }
      } catch (error) {
        console.error('Error toggling chat lock:', error);
      }
    });

    // Pin chat handler
    socket.on('pin_chat', async (data) => {
      try {
        const { chatId } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation && includesId(conversation.participants, socket.userId)) {
          const nextValue = !Boolean(getMapValue(conversation.isPinned, socket.userId));
          setMapValue(conversation, 'isPinned', socket.userId, nextValue);
          await conversation.save();
          socket.emit('chat:pinned', { chatId, isPinned: nextValue });
          socket.emit('chat_pinned_signal', { chatId, isPinned: nextValue });
        }
      } catch (error) {
        console.error('Error pinning chat:', error);
      }
    });

    // Edit message handler (mismatch fix)
    socket.on('edit_message', async (data) => {
      try {
        const { messageId, newContent } = data;
        const message = await Message.findById(messageId);
        if (message && message.sender.toString() === socket.userId) {
          message.content = newContent;
          message.isEdited = true;
          message.editedAt = new Date();
          await message.save();
          const updatedMessage = await Message.findById(message._id)
            .populate('sender', 'username profilePicture');
          io.to(message.conversationId.toString()).emit('message:edited', updatedMessage);
        }
      } catch (error) {
        console.error('Error editing message:', error);
      }
    });

    // Delete message handler (mismatch fix)
    socket.on('delete_message', async (data) => {
      try {
        const { messageId } = data;
        const message = await Message.findById(messageId);
        if (message && message.sender.toString() === socket.userId) {
          message.deletedForEveryone = true;
          await message.save();
          io.to(message.conversationId.toString()).emit('message:deleted', { messageId, forEveryone: true });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
      }
    });

    // Mark as read handler (mismatch fix)
    socket.on('mark_as_read', async (data) => {
      try {
        const { chatId } = data;

        if (!chatId || !/^[0-9a-fA-F]{24}$/.test(chatId)) {
          console.warn('Invalid chatId format in mark_as_read:', chatId);
          return;
        }

        const conversation = await getConversationIfParticipant(chatId, socket);
        if (!conversation) return;

        const userId = socket.userId;
        const messages = await Message.find({ conversationId: chatId, sender: { $ne: userId } });
        for (const msg of messages) {
          const alreadyRead = msg.readBy.some((r) => r.user.toString() === userId);
          if (!alreadyRead) {
            msg.readBy.push({ user: userId, readAt: new Date() });
            msg.status = 'read';
            await msg.save();
          }
        }
        io.to(chatId).emit('messages:read', { chatId, userId });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('user_online', async () => {
      try {
        if (!socket.userId) return;
        const user = await User.findById(socket.userId).select('username');
        await User.findByIdAndUpdate(socket.userId, { isOnline: true, lastSeen: new Date() });
        io.emit('user:online', { userId: socket.userId, username: user?.username });
      } catch (error) {
        console.error('Error setting user online:', error);
      }
    });

    // Visit profile handler
    socket.on('visit_profile', async (data) => {
      try {
        const { visitedUserId, visitorId, visitorName } = data;
        io.emit('profile:visited', { visitedUserId, visitorId, visitorName, timestamp: new Date() });
      } catch (error) {
        console.error('Error visiting profile:', error);
      }
    });

    // Forward message handler
    socket.on('forward_message', async (data) => {
      try {
        const { messageId, toConversationId } = data;
        const source = await getMessageIfParticipant(messageId, socket);
        if (!source) return;

        const targetConversation = await getConversationIfParticipant(toConversationId, socket);
        if (!targetConversation) return;

        const { message: originalMessage } = source;
        const forwardedMessage = await Message.create({
          conversationId: toConversationId,
          sender: socket.userId,
          content: originalMessage.content,
          messageType: originalMessage.messageType,
          mediaUrl: originalMessage.mediaUrl,
          fileName: originalMessage.fileName,
          fileSize: originalMessage.fileSize,
          duration: originalMessage.duration,
          forwarded: true,
          originalMessageId: messageId
        });
        const populatedMessage = await Message.findById(forwardedMessage._id)
          .populate('sender', 'username profilePicture');
        io.to(toConversationId).emit('message:received', populatedMessage);
      } catch (error) {
        console.error('Error forwarding message:', error);
      }
    });

    // Typing handler
    socket.on('typing', async (data) => {
      try {
        const { conversationId } = data;
        socket.to(conversationId).emit('user:typing', {
          userId: socket.userId,
          conversationId,
          isTyping: true
        });
      } catch (error) {
        console.error('Error sending typing:', error);
      }
    });

    socket.on('stop_typing', async (data = {}) => {
      try {
        const conversationId = data.conversationId || data.chatId;
        const payload = {
          userId: socket.userId,
          sender: data.sender,
          conversationId,
          isTyping: false
        };
        if (conversationId) {
          socket.to(conversationId).emit('user:typing', payload);
        }
        socket.broadcast.emit('typing_status', payload);
      } catch (error) {
        console.error('Error stopping typing:', error);
      }
    });

    // Recording handler
    socket.on('recording', async (data) => {
      try {
        const { conversationId } = data;
        socket.to(conversationId).emit('user:recording', {
          userId: socket.userId,
          conversationId,
          isRecording: true
        });
        socket.broadcast.emit('recording_status', {
          sender: data.sender || socket.userId,
          isRecording: data.isRecording ?? true
        });
      } catch (error) {
        console.error('Error sending recording:', error);
      }
    });

    // Get profile visitors handler
    socket.on('get_profile_visitors', async (data) => {
      try {
        const visitors = await User.findById(socket.userId).select('profileVisitors');
        socket.emit('profile_visitors', visitors?.profileVisitors || []);
      } catch (error) {
        console.error('Error getting profile visitors:', error);
      }
    });

    // Request presence history handler
    socket.on('request_presence_history', async (data) => {
      try {
        const { userId } = data;
        const user = await User.findById(userId).select('presenceHistory');
        socket.emit('presence_history', user?.presenceHistory || []);
      } catch (error) {
        console.error('Error requesting presence history:', error);
      }
    });

    // Create custom role handler
    socket.on('create_custom_role', async (data) => {
      try {
        const { chatId, roleName, permissions } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation) {
          if (!conversation.customRoles) conversation.customRoles = [];
          conversation.customRoles.push({ name: roleName, permissions });
          await conversation.save();

          const updatedConv = await Conversation.findById(chatId)
            .populate('participants', 'username profilePicture isOnline lastSeen presenceHistory')
            .populate('admins', 'username profilePicture isOnline lastSeen')
            .populate('lastMessage')
            .populate('pinnedMessages');

          io.to(chatId).emit('role:created', { chatId, roleName, permissions });
          io.to(chatId).emit('conversation:updated', updatedConv);
        }
      } catch (error) {
        console.error('Error creating custom role:', error);
      }
    });

    // Assign role handler
    socket.on('assign_role', async (data) => {
      try {
        const { chatId, userId, roleId } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation) {
          if (!conversation.participantRoles) {
            conversation.participantRoles = new Map();
          }
          conversation.participantRoles.set(String(userId), String(roleId));
          await conversation.save();

          const updatedConv = await Conversation.findById(chatId)
            .populate('participants', 'username profilePicture isOnline lastSeen presenceHistory')
            .populate('admins', 'username profilePicture isOnline lastSeen')
            .populate('lastMessage')
            .populate('pinnedMessages');

          io.to(chatId).emit('role:assigned', { chatId, userId, roleId });
          io.to(chatId).emit('conversation:updated', updatedConv);
        }
      } catch (error) {
        console.error('Error assigning role:', error);
      }
    });

    // Update group setting handler
    socket.on('update_group_setting', async (data) => {
      try {
        const { chatId, setting, value } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation) {
          conversation[setting] = value;
          await conversation.save();
          io.to(chatId).emit('group_setting:updated', { chatId, setting, value });
        }
      } catch (error) {
        console.error('Error updating group setting:', error);
      }
    });

    // Start backup handler
    socket.on('start_backup', async (data) => {
      try {
        socket.emit('backup:started', { timestamp: new Date() });
        // Simulate backup progress
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          socket.emit('backup:progress', { progress });
          if (progress >= 100) {
            clearInterval(interval);
            socket.emit('backup:completed', { timestamp: new Date() });
          }
        }, 500);
        interval.unref?.();
      } catch (error) {
        console.error('Error starting backup:', error);
      }
    });

    // Join group handler — requires invite code; use REST /groups/:id/join for canonical flow
    socket.on('join_group', async (data) => {
      try {
        if (!socket.userId) return;
        const { chatId, inviteCode } = data;
        const conversation = await Conversation.findById(chatId).select('+groupInviteCode');
        if (!conversation || !conversation.isGroup) return;

        if (!conversation.groupInviteCode || inviteCode !== conversation.groupInviteCode) {
          return socket.emit('error', { message: 'Valid invite code required to join this group' });
        }

        if (!includesId(conversation.participants, socket.userId)) {
          conversation.participants.push(socket.userId);
          await conversation.save();
          socket.join(chatId);
          io.to(chatId).emit('group:member_joined', {
            chatId,
            userId: socket.userId,
            username: socket.user?.username
          });
        }
      } catch (error) {
        console.error('Error joining group:', error);
      }
    });

    // Start live stream handler
    socket.on('start_live_stream', async (data) => {
      try {
        const { chatId, host } = data;
        io.to(chatId).emit('live_stream:started', { chatId, host, timestamp: new Date() });
      } catch (error) {
        console.error('Error starting live stream:', error);
      }
    });

    // Stop live stream handler
    socket.on('stop_live_stream', async (data) => {
      try {
        const { chatId } = data;
        io.emit('live_stream:stopped', { chatId, timestamp: new Date() });
      } catch (error) {
        console.error('Error stopping live stream:', error);
      }
    });

    // WebRTC Signaling: Call offer
    socket.on('call:offer', async (data) => {
      try {
        const { targetUserId, offer, callType, conversationId } = data;
        const targetSocketId = onlineUsers.get(targetUserId);
        
        if (targetSocketId) {
          io.to(targetSocketId).emit('call:incoming', {
            callerId: socket.userId,
            callerSocketId: socket.id,
            offer,
            callType,
            conversationId
          });
          io.to(targetSocketId).emit('webrtc:offer', {
            from: socket.userId,
            callerId: socket.userId,
            callerSocketId: socket.id,
            offer,
            callType,
            conversationId
          });
        } else {
          socket.emit('call:error', { message: 'User is offline' });
        }
      } catch (error) {
        console.error('Error sending call offer:', error);
        socket.emit('call:error', { message: error.message });
      }
    });

    // WebRTC Signaling: Call answer
    socket.on('call:answer', async (data) => {
      try {
        const { callerSocketId, answer } = data;
        io.to(callerSocketId).emit('call:answered', {
          answer,
          responderId: socket.userId
        });
        io.to(callerSocketId).emit('webrtc:answer', {
          answer,
          from: socket.userId,
          responderId: socket.userId
        });
      } catch (error) {
        console.error('Error answering call:', error);
      }
    });

    // WebRTC Signaling: ICE candidate
    socket.on('call:ice-candidate', async (data) => {
      try {
        const { targetSocketId, candidate } = data;
        io.to(targetSocketId).emit('call:ice-candidate', {
          candidate,
          senderId: socket.userId
        });
        io.to(targetSocketId).emit('webrtc:ice_candidate', {
          candidate,
          from: socket.userId,
          senderId: socket.userId
        });
      } catch (error) {
        console.error('Error sending ICE candidate:', error);
      }
    });

    // Frontend WebRTC service emits these event names directly.
    socket.on('webrtc:offer', async (data) => {
      try {
        const { to, targetUserId, offer, callType, conversationId } = data;
        const targetId = to || targetUserId;
        const targetSocketId = onlineUsers.get(String(targetId)) || targetId;

        if (!targetSocketId) {
          return socket.emit('call:error', { message: 'Target user is required' });
        }

        io.to(targetSocketId).emit('webrtc:offer', {
          from: socket.userId,
          callerId: socket.userId,
          callerSocketId: socket.id,
          offer,
          callType,
          conversationId
        });
        io.to(targetSocketId).emit('call:incoming', {
          callerId: socket.userId,
          callerSocketId: socket.id,
          offer,
          callType,
          conversationId
        });
      } catch (error) {
        console.error('Error relaying WebRTC offer:', error);
        socket.emit('call:error', { message: error.message });
      }
    });

    socket.on('webrtc:answer', async (data) => {
      try {
        const { to, callerSocketId, answer } = data;
        const targetSocketId = callerSocketId || onlineUsers.get(String(to)) || to;
        if (!targetSocketId) {
          return socket.emit('call:error', { message: 'Target user is required' });
        }

        io.to(targetSocketId).emit('webrtc:answer', {
          from: socket.userId,
          responderId: socket.userId,
          answer
        });
        io.to(targetSocketId).emit('call:answered', {
          responderId: socket.userId,
          answer
        });
      } catch (error) {
        console.error('Error relaying WebRTC answer:', error);
      }
    });

    socket.on('webrtc:ice_candidate', async (data) => {
      try {
        const { to, targetSocketId, candidate } = data;
        const relaySocketId = targetSocketId || onlineUsers.get(String(to)) || to;
        if (!relaySocketId) return;

        io.to(relaySocketId).emit('webrtc:ice_candidate', {
          from: socket.userId,
          senderId: socket.userId,
          candidate
        });
        io.to(relaySocketId).emit('call:ice-candidate', {
          senderId: socket.userId,
          candidate
        });
      } catch (error) {
        console.error('Error relaying ICE candidate:', error);
      }
    });

    // WebRTC: Toggle audio
    socket.on('call:toggle-audio', async (data) => {
      try {
        const { targetUserId, enabled } = data;
        const targetSocketId = onlineUsers.get(targetUserId);
        
        if (targetSocketId) {
          io.to(targetSocketId).emit('call:audio-toggled', {
            userId: socket.userId,
            enabled
          });
        }
      } catch (error) {
        console.error('Error toggling audio:', error);
      }
    });

    // WebRTC: Toggle video
    socket.on('call:toggle-video', async (data) => {
      try {
        const { targetUserId, enabled } = data;
        const targetSocketId = onlineUsers.get(targetUserId);
        
        if (targetSocketId) {
          io.to(targetSocketId).emit('call:video-toggled', {
            userId: socket.userId,
            enabled
          });
        }
      } catch (error) {
        console.error('Error toggling video:', error);
      }
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);

      const disconnectedUserId = socketToUser.get(socket.id) || socket.userId;
      socketToUser.delete(socket.id);

      if (disconnectedUserId && !isUserStillOnline(disconnectedUserId)) {
        onlineUsers.delete(disconnectedUserId);

        try {
          await User.findByIdAndUpdate(disconnectedUserId, {
            isOnline: false,
            lastSeen: new Date()
          });

          socket.broadcast.emit('user:offline', { userId: disconnectedUserId });
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
    });

    socket.on('disconnecting', (reason) => {
      console.log('User disconnecting:', socket.id, 'reason:', reason);
      // Leave all rooms before disconnect
      const rooms = socket.rooms;
      for (const room of rooms) {
        if (room !== socket.id) {
          socket.leave(room);
        }
      }
    });

    // Handle connection errors gracefully
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      socket.emit('error', { message: 'Connection error occurred' });
    });
  });
};

module.exports = setupSocket;
