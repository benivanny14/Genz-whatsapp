const mongoose = require('mongoose');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Status = require('../models/Status');
const Broadcast = require('../models/Broadcast');
const { persistCallFromSocket } = require('../controllers/callController');
const activeCalls = require('../utils/activeCalls');
const { resolveMessageMentions } = require('../utils/mentions');
const {
  sendMentionNotification,
  sendNewMessageNotification,
  sendIncomingCallNotification
} = require('../services/notificationService');
const { ensureUnreadMap, getUnreadCount, setUnreadCount } = require('../utils/unreadCount');
const { serializeOutgoingMessage } = require('../utils/messageSerializer');
const {
  normalizeReplyToId,
  getSelfDestructExpiry,
  isConversationBlocked,
  isEitherUserBlocked
} = require('../utils/messageSendHelpers');

// Use the shared onlineUsers map from server.js (global.onlineUsers)
// This ensures socket handlers and HTTP controllers share the same online users state
// Use shared map from server.js — always reference via global to catch late init
const getOnlineUsers = () => global.onlineUsers || new Map();
const onlineUsers = { get: (k) => getOnlineUsers().get(k), set: (k,v) => getOnlineUsers().set(k,v), delete: (k) => getOnlineUsers().delete(k), has: (k) => getOnlineUsers().has(k) };
// Per-user "away" flag for the alwaysOnline mod / idle-presence feature.
// In-memory only (like onlineUsers) — resets on server restart, which is
// fine since it's re-established the moment the client reconnects and
// sends its current activity state.
const userAwayStatus = new Map();
const socketToUser = new Map();
const messageDeduplication = new Map(); // Track processed messages to prevent duplicates

const isUserStillOnline = (userId) =>
  [...socketToUser.values()].some((id) => id?.toString() === userId?.toString());

const MESSAGE_DEDUP_TTL = 60000; // 1 minute TTL for deduplication
const MESSAGE_DEDUP_MAX_SIZE = 10000; // Maximum size to prevent memory leaks

// Periodic cleanup to prevent memory leaks
const _dedupCleanupInterval = setInterval(() => {
  const now = Date.now();
  let deleted = 0;
  messageDeduplication.forEach((timestamp, key) => {
    if (now - timestamp > MESSAGE_DEDUP_TTL) {
      messageDeduplication.delete(key);
      deleted++;
    }
  });
  // Also limit size if growing too large
  if (messageDeduplication.size > MESSAGE_DEDUP_MAX_SIZE) {
    const entries = Array.from(messageDeduplication.entries())
      .sort((a, b) => a[1] - b[1]);
    const toDelete = entries.slice(0, entries.length - MESSAGE_DEDUP_MAX_SIZE);
    toDelete.forEach(([key]) => messageDeduplication.delete(key));
    deleted += toDelete.length;
  }
  if (deleted > 0) {
    const { logDebug } = require('../config/winston');
    logDebug('Cleaned up old deduplication entries', { deleted, currentSize: messageDeduplication.size });
  }
}, 30000); // Run every 30 seconds
_dedupCleanupInterval.unref?.();
const SOCKET_SETUP_FLAG = Symbol.for('genz.socket.setup');
const includesId = (items = [], id) => {
  if (!Array.isArray(items)) return false;
  const target = id?._id ? id._id.toString() : id?.toString();
  return items.some(item => (item?._id ? item._id.toString() : item?.toString()) === target);
};

const safeAsyncHandler = (socket, handler) => async (data) => {
  try {
    await handler(data);
  } catch (error) {
    console.error('[Socket] Handler error:', error);
    socket.emit('error', { message: 'Internal server error' });
  }
};

const normalizeDisappearingMessages = ({ enabled, duration, timer } = {}) => {
  const raw = duration ?? timer ?? enabled;
  const text = String(raw ?? '').trim();
  if (!text || /^(false|off|none|0)$/i.test(text)) {
    return { enabled: false, duration: 'Off', timer: 0 };
  }

  if (/^\d+$/.test(text)) {
    const hours = Math.max(1, Number(text));
    return { enabled: true, duration: `${hours}h`, timer: hours };
  }

  const match = text.match(/^(\d+)\s*([hd])$/i);
  if (match) {
    const amount = Math.max(1, Number(match[1]));
    const unit = match[2].toLowerCase();
    return {
      enabled: true,
      duration: `${amount}${unit}`,
      timer: unit === 'd' ? amount * 24 : amount
    };
  }

  const hours = Number(timer) || 24;
  return { enabled: Boolean(enabled ?? true), duration: text || `${hours}h`, timer: hours };
};

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



  io.on('connection', (socket) => {
    const { logDebug } = require('../config/winston');
    logDebug('User connected', { socketId: socket.id });

    // ── Global socket error protection ────────────────────────────────────
    // Override socket.on to automatically wrap handlers with try-catch
    const _originalOn = socket.on.bind(socket);
    socket.on = function(event, handler) {
      if (typeof handler !== 'function') return _originalOn(event, handler);
      const safeHandler = async (...args) => {
        try {
          await handler(...args);
        } catch (err) {
          console.error(`[Socket] Unhandled error in "${event}" handler:`, err?.message || err);
          socket.emit('error', { message: 'Server error processing your request', event });
        }
      };
      return _originalOn(event, safeHandler);
    };

    // Handle reconnection
    socket.on('reconnect_attempt', () => {
      const { logDebug } = require('../config/winston');
      logDebug('Reconnection attempt', { socketId: socket.id });
    });

    socket.on('error', (error) => {
      const { logError } = require('../config/winston');
      logError('Socket error', { message: error.message, socketId: socket.id });
    });

    socket.on('user:join', async (userId) => {
      const { logError } = require('../config/winston');
      if (!userId) {
        logError('No userId provided for user:join');
        return;
      }

      if (socket.userId && userId.toString() !== socket.userId.toString()) {
        logError('Blocked user:join impersonation attempt', {
          requested: userId,
          authenticated: socket.userId
        });
        return socket.emit('error', { message: 'Cannot join as another user' });
      }

      const userKey = String(userId);
      socketToUser.set(socket.id, userKey);
      onlineUsers.set(userKey, socket.id);
      socket.userId = userKey;
      socket.join(userKey);

      try {
        const updateFields = { isOnline: true };
        // Only update lastSeen if freezeLastSeen is not enabled
        const userCheck = await User.findById(userId).select('genzMods').lean();
        if (!userCheck?.genzMods?.freezeLastSeen) {
          updateFields.lastSeen = new Date();
        }
        const user = await User.findByIdAndUpdate(userId, updateFields, { new: true }).select('settings contacts genzMods');
        
        const genzMods = user?.genzMods || {};
        // If hideOnline is enabled, don't broadcast online status
        if (genzMods.hideOnline === true || genzMods.ghostMode === true) {
          return; // Don't broadcast online status
        }

        const privacySettings = user?.settings?.privacy || {};
        const onlineSetting = privacySettings.online === 'same_as_last_seen' 
          ? privacySettings.lastSeen 
          : privacySettings.online;

        if (onlineSetting === 'nobody') {
          // Do not broadcast
        } else if (onlineSetting === 'contacts' || onlineSetting === 'contacts_except') {
          const contacts = user?.contacts || [];
          contacts.forEach(contactId => {
            const cId = contactId?.user ? String(contactId.user) : String(contactId);
            const recipientSocketId = onlineUsers.get(cId);
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
        const { logDebug } = require('../config/winston');
        logDebug('User joined conversation', { userId: socket.userId, conversationId });
      } catch (error) {
        const { logError } = require('../config/winston');
        logError('Error joining conversation room', { message: error.message, userId: socket.userId, conversationId });
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(conversationId);
      const { logDebug } = require('../config/winston');
      logDebug('User left conversation', { userId: socket.userId, conversationId });
    });

    // FIX (feature add): the new channel feed endpoints emit to
    // `channel:${channelId}` for live post delivery, but nothing ever put a
    // socket into that room — so no one actually received live updates
    // until they refreshed. Mirrors join:conversation/leave:conversation.
    socket.on('join:channel', async (channelId) => {
      if (!channelId || !socket.userId) return;
      try {
        const Channel = require('../models/Channel');
        const channel = await Channel.findById(channelId).select('isPublic followers owner');
        if (!channel) return socket.emit('error', { message: 'Channel not found' });
        const isFollower = channel.followers.some((f) => String(f) === String(socket.userId));
        const isOwner = String(channel.owner) === String(socket.userId);
        if (!channel.isPublic && !isFollower && !isOwner) {
          return socket.emit('error', { message: 'Not authorized for this channel' });
        }
        socket.join(`channel:${channelId}`);
      } catch (error) {
        console.error('Error joining channel room:', error.message);
      }
    });

    socket.on('leave:channel', (channelId) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
    });

    socket.on('message:send', async (data) => {
      let dedupKey = null;
      try {
        const {
          conversationId,
          content,
          caption,
          messageType,
          mediaUrl,
          fileName,
          fileSize,
          duration,
          replyTo,
          messageId,
          mentions,
          isViewOnce,
          isSelfDestruct,
          selfDestructTimer,
          structuredContent
        } = data;
        const safeContent = content || fileName || (mediaUrl ? `${messageType || 'media'} message` : '') || (structuredContent && structuredContent.length ? 'Structured Message' : '');
        if (!safeContent) {
          return socket.emit('message:error', { error: 'Message content or media is required' });
        }


        // Generate deduplication key
        dedupKey = `${socket.userId}_${conversationId}_${messageId || Date.now()}_${safeContent}`;
        
        // Check if message was already processed
        if (messageDeduplication.has(dedupKey)) {
          const { logDebug } = require('../config/winston');
          logDebug('Duplicate message detected, ignoring', { dedupKey });
          return;
        }

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          const { logWarn } = require('../config/winston');
          logWarn('Invalid conversationId provided', { conversationId });
          return socket.emit('message:error', { error: 'Invalid conversation ID format' });
        }

        if (messageId) {
          const existingMessage = await Message.findOne({ clientMessageId: String(messageId), sender: socket.userId }).lean();
          if (existingMessage) {
            console.log(`[Socket] Deduped message via Socket DB check: ${messageId}`);
            socket.emit('message:delivered', {
              messageId: messageId,
              serverMessageId: existingMessage._id.toString()
            });
            return;
          }
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !includesId(conversation.participants, socket.userId)) {
          return socket.emit('message:error', { error: 'Not authorized for this conversation' });
        }

        if (await isConversationBlocked(conversation, socket.userId)) {
          return socket.emit('message:error', { error: 'Cannot message this user', messageId: data?.messageId });
        }

        if (conversation.isGroup) {
          const isAdmin = conversation.admins?.some((a) => String(a) === String(socket.userId));
          const mediaTypes = ['image', 'video', 'audio', 'voice', 'file', 'document', 'gif', 'sticker'];
          if (conversation.adminOnlyMessaging && !isAdmin) {
            return socket.emit('message:error', {
              error: 'Only admins can send messages in this group',
              messageId: data?.messageId
            });
          }
          if (conversation.canSendMedia === false && mediaTypes.includes(messageType || 'text')) {
            return socket.emit('message:error', {
              error: 'Media is disabled in this group',
              messageId: data?.messageId
            });
          }
          if (conversation.canCreatePolls === false && messageType === 'poll') {
            return socket.emit('message:error', {
              error: 'Polls are disabled in this group',
              messageId: data?.messageId
            });
          }

          // ── Anti-spam checks ─────────────────────────────────────────────
          if (!isAdmin && conversation.antiSpam?.enabled) {
            const now = Date.now();
            const userId = String(socket.userId);

            // Slow mode check
            if (conversation.antiSpam.slowModeSeconds > 0) {
              const tracker = conversation.spamTracker instanceof Map
                ? conversation.spamTracker.get(userId) || []
                : (conversation.spamTracker?.[userId] || []);
              const lastMsg = tracker.length > 0 ? new Date(tracker[tracker.length - 1]).getTime() : 0;
              const diff = (now - lastMsg) / 1000;
              if (diff < conversation.antiSpam.slowModeSeconds) {
                const wait = Math.ceil(conversation.antiSpam.slowModeSeconds - diff);
                return socket.emit('message:error', {
                  error: `Slow mode: wait ${wait} second${wait !== 1 ? 's' : ''} before sending`,
                  messageId: data?.messageId
                });
              }
            }

            // Rate limit check (messages per minute)
            const maxPerMin = conversation.antiSpam.maxMessagesPerMinute || 20;
            const oneMinAgo = now - 60000;
            const tracker = conversation.spamTracker instanceof Map
              ? conversation.spamTracker.get(userId) || []
              : (conversation.spamTracker?.[userId] || []);
            const recentCount = tracker.filter(t => new Date(t).getTime() > oneMinAgo).length;
            if (recentCount >= maxPerMin) {
              return socket.emit('message:error', {
                error: `Spam limit reached: max ${maxPerMin} messages per minute`,
                messageId: data?.messageId
              });
            }

            // Update tracker (async, don't block message send)
            const newTracker = [...tracker.filter(t => new Date(t).getTime() > oneMinAgo), new Date()];
            Conversation.updateOne(
              { _id: conversationId },
              { $set: { [`spamTracker.${userId}`]: newTracker.slice(-50) } }
            ).catch(() => {});
          }

          // Check if banned
          const isBanned = (conversation.bannedMembers || []).some(b => b.user?.toString() === String(socket.userId));
          if (isBanned) {
            return socket.emit('message:error', { error: 'You have been banned from this group', messageId: data?.messageId });
          }
        }

        const replyToId = normalizeReplyToId(replyTo);

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

        let disappearAt = null;
        if (conversation.disappearingMessages?.enabled) {
          const timerHours = Number(conversation.disappearingMessages.timer) || 24;
          disappearAt = new Date(Date.now() + timerHours * 60 * 60 * 1000);
        }
        if (isSelfDestruct && !disappearAt) {
          disappearAt = getSelfDestructExpiry({ isSelfDestruct, selfDestructTimer });
        }

        const message = await Message.create({
          conversationId,
          sender: socket.userId,
          content: safeContent,
          caption: typeof caption === 'string' ? caption.slice(0, 1000) : '',
          isClientE2EE,
          messageType: messageType || 'text',
          mediaUrl: mediaUrl || '',
          fileName: fileName || '',
          fileSize: fileSize || 0,
          duration: duration || 0,
          replyTo: replyToId,
          isViewOnce: Boolean(isViewOnce),
          isSelfDestruct: Boolean(isSelfDestruct),
          disappearAt,
          mentions: mentionData.mentions,
          clientMessageId: messageId ? String(messageId) : '',
          structuredContent: structuredContent || []
        });

        // Mark as processed only after successful persistence
        messageDeduplication.set(dedupKey, Date.now());

        const populatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture')
          .populate({
            path: 'replyTo',
            select: '_id content messageType sender',
            populate: {
              path: 'sender',
              select: 'username profilePicture'
            }
          })
          .populate('mentions.user', 'username profilePicture')
          .lean();

        const incObject = {};
        if (conversation.participants && Array.isArray(conversation.participants)) {
          conversation.participants.forEach((participantId) => {
            if (participantId.toString() !== socket.userId.toString()) {
              incObject[`unreadCount.${participantId.toString()}`] = 1;
            }
          });
        }

        const updateQuery = {
          $set: {
            lastMessage: message._id,
            updatedAt: new Date(),
            deletedFor: []
          }
        };
        if (Object.keys(incObject).length > 0) {
          updateQuery.$inc = incObject;
        }
        await Conversation.findByIdAndUpdate(conversationId, updateQuery, { new: true, runValidators: false });

        const outgoingMessage = serializeOutgoingMessage(populatedMessage, messageId ? { clientMessageId: messageId } : {});

        // Deliver once per recipient via their user room (avoids duplicate events)
        const updatedConversation = await Conversation.findById(conversationId)
          .populate('participants', 'username profilePicture isOnline')
          .populate('lastMessage')
          .populate('admins', 'username profilePicture')
          .lean();
        
        if (conversation.participants && Array.isArray(conversation.participants)) {
          const notificationTasks = [];
          const notificationText =
            messageType === 'image' ? 'Photo' :
            messageType === 'video' ? 'Video' :
            messageType === 'audio' || messageType === 'voice' ? 'Voice note' :
            messageType === 'sticker' ? 'Sticker' :
            messageType === 'gif' ? 'GIF' :
            String(safeContent || 'New message').slice(0, 120);
          for (const participantId of conversation.participants) {
            if (participantId.toString() === socket.userId.toString()) continue;
            const isBlocked = await isEitherUserBlocked(socket.userId, participantId);
            if (isBlocked) continue;
            const userId = String(participantId);
            
            // FIX: Emit conversation:created event for new conversations so recipient sees it immediately
            // This ensures that when User A sends a message to User B for the first time,
            // User B sees the conversation appear in their chat list without needing to refresh
            io.to(userId).emit('conversation:created', updatedConversation);
            
            io.to(userId).emit('message:received', outgoingMessage);
            if (updatedConversation) {
              io.to(userId).emit('conversation:unread-update', {
                conversationId: conversation._id,
                unreadCount: getUnreadCount(updatedConversation, userId)
              });
            }
            notificationTasks.push((async () => {
              // FIX: same as chatController.sendMessage — skip push when the
              // recipient muted this chat or already has it open on screen.
              try {
                const mutedUntil = updatedConversation?.mutedUntil?.get?.(userId);
                const isMuted = mutedUntil && new Date(mutedUntil) > new Date();
                if (isMuted) return { success: false, skipped: 'muted' };

                const recipientSocketId = onlineUsers.get(userId);
                const roomMembers = io.sockets.adapter.rooms.get(String(conversationId));
                const isActivelyViewing = Boolean(
                  recipientSocketId && roomMembers && roomMembers.has(recipientSocketId)
                );
                if (isActivelyViewing) return { success: false, skipped: 'active_viewer' };
              } catch (_) { /* if the check fails, fall through and still notify */ }

              return sendNewMessageNotification(userId, {
                senderName: populatedMessage.sender?.username || 'GENZ',
                text: notificationText,
                conversationId: String(conversationId),
                senderId: String(socket.userId),
                type: messageType || 'text'
              });
            })());
          }
          if (notificationTasks.length) {
            Promise.allSettled(notificationTasks).catch((notifyErr) => {
              console.warn('[Socket] Message push notification failed:', notifyErr?.message || notifyErr);
            });
          }
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

        // Auto-reply from recipients who enabled it (WhatsApp-style away message)
        if (conversation.participants?.length) {
          for (const participantId of conversation.participants) {
            if (String(participantId) === String(socket.userId)) continue;
            try {
              const recipient = await User.findById(participantId).select('autoReplyEnabled autoReplyMessage');
              const replyText = recipient?.autoReplyMessage?.trim();
              if (!recipient?.autoReplyEnabled || !replyText) continue;

              const autoMsg = await Message.create({
                conversationId,
                sender: participantId,
                content: replyText,
                messageType: 'text'
              });
              const autoPopulated = await Message.findById(autoMsg._id)
                .populate('sender', 'username profilePicture')
                .lean();
              const autoOutgoing = serializeOutgoingMessage(autoPopulated);
              io.to(String(socket.userId)).emit('message:received', autoOutgoing);
              io.to(String(participantId)).emit('message:received', autoOutgoing);
            } catch (autoErr) {
              console.warn('[Socket] Auto-reply skipped:', autoErr?.message || autoErr);
            }
          }
        }

      } catch (error) {
        console.error('Error sending message:', error);
        if (dedupKey) messageDeduplication.delete(dedupKey);
        socket.emit('message:error', { error: error.message, messageId: data?.messageId });
      }
    });

    socket.on('message:typing', safeAsyncHandler(socket, async (data) => {
      const { conversationId, isTyping } = data;
      const conversation = await getConversationIfParticipant(conversationId, socket);
      if (!conversation) return;

      // Check if user has hideTyping mod enabled
      if (isTyping) {
        const sender = await User.findById(socket.userId).select('genzMods');
        if (sender?.genzMods?.hideTyping === true) return;
      }

      socket.to(conversationId).emit('user:typing', {
        userId: socket.userId,
        conversationId,
        isTyping
      });
    }));

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
        const { messageId, conversationId } = data;
        const result = await getMessageIfParticipant(messageId, socket);
        if (!result) return;
        const { message } = result;

        if (message.sender.toString() !== socket.userId) {
          if (!Array.isArray(message.readBy)) message.readBy = [];
          const alreadyRead = message.readBy.some(r => r.user?.toString() === socket.userId);
          if (!alreadyRead) {
            message.readBy.push({ user: socket.userId, readAt: new Date() });
            message.status = 'read';
            await message.save();
            
            // Update unread count in conversation
            const conversation = await Conversation.findById(conversationId || message.conversationId);
            if (conversation) {
              const userId = String(socket.userId);
              const currentCount = getUnreadCount(conversation, userId);
              if (currentCount > 0) {
                setUnreadCount(conversation, userId, currentCount - 1);
                await conversation.save();
                io.to(userId).emit('conversation:unread-update', {
                  conversationId: conversation._id,
                  unreadCount: getUnreadCount(conversation, userId)
                });
              }
            }

            const reader = await User.findById(socket.userId).select('settings genzMods');
            const readReceiptsEnabled = reader?.settings?.privacy?.readReceipts !== false;
            const hideReadReceipts = reader?.genzMods?.hideReadReceipts === true || reader?.genzMods?.ghostMode?.hideReadReceipts === true;

            if (readReceiptsEnabled && !hideReadReceipts) {
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
            // Save original content for anti-revoke before deleting
            if (!message.originalContent && message.content) {
              message.originalContent = message.content;
            }
            message.deletedForEveryone = true;
            message.wasDeletedBySender = true;
            message.deletedAt = new Date();
          } else {
            if (!Array.isArray(message.deletedFor)) message.deletedFor = [];
            if (!message.deletedFor.some((id) => id?.toString() === socket.userId)) {
              message.deletedFor.push(socket.userId);
            }
          }
          await message.save();

          if (forEveryone) {
            io.to(message.conversationId.toString()).emit('message:deleted', {
              messageId,
              forEveryone: true
            });
          } else {
            socket.emit('message:deleted', {
              messageId,
              forEveryone: false
            });
          }
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
      try {
        const { conversationId, callType, calleeId, targetUserId } = data || {};
        if (socket.userId) {
          activeCalls.startCall(socket.userId, {
            conversationId,
            callType,
            calleeId: calleeId || targetUserId
          });
        }
      } catch (err) {
        const { logError } = require('../config/winston');
        logError('call:start error', { message: err.message });
      }
    });

    socket.on('call_user', (data = {}) => {
      const conversationId = data.conversationId || data.chatId;
      if (conversationId) {
        const { logDebug } = require('../config/winston');
        logDebug('User initiating call', { userId: socket.userId, conversationId });
      }
      socket.broadcast.emit('incoming_call_signal', {
        ...data,
        callerId: socket.userId
      });
    });

    socket.on('call:accept', (data) => {
      const { conversationId, callerId } = data;
      const callerSocketId = onlineUsers.get(String(callerId));
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
        const { logError } = require('../config/winston');
        logError('call:reject log error', { message: err.message });
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
        const { logError } = require('../config/winston');
        logError('call:end log error', { message: err.message });
      }
    });

    socket.on('end_call', (data = {}) => {
      const conversationId = data.conversationId || data.chatId;
      if (conversationId) {
        io.to(conversationId).emit('call:ended', { conversationId });
      }
      socket.broadcast.emit('call_ended_signal', data);
    });

    // ---- Group Voice Chat (Clubhouse-style ambient room for large groups) ----
    socket.on('voicechat:start', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId || !socket.userId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.isGroup) return;

        conversation.voiceChat = {
          active: true,
          startedAt: new Date(),
          startedBy: socket.userId,
          participants: [socket.userId]
        };
        await conversation.save();

        io.to(conversationId).emit('voicechat:started', {
          conversationId,
          startedBy: socket.userId,
          participants: conversation.voiceChat.participants
        });
      } catch (err) {
        const { logError } = require('../config/winston');
        logError('voicechat:start error', { message: err.message });
      }
    });

    socket.on('voicechat:join', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId || !socket.userId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.voiceChat?.active) return;

        const already = conversation.voiceChat.participants.some(
          p => p.toString() === socket.userId.toString()
        );
        if (!already) {
          conversation.voiceChat.participants.push(socket.userId);
          await conversation.save();
        }

        io.to(conversationId).emit('voicechat:participant_joined', {
          conversationId,
          userId: socket.userId,
          participants: conversation.voiceChat.participants
        });
      } catch (err) {
        const { logError } = require('../config/winston');
        logError('voicechat:join error', { message: err.message });
      }
    });

    socket.on('voicechat:leave', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId || !socket.userId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation || !conversation.voiceChat?.active) return;

        conversation.voiceChat.participants = conversation.voiceChat.participants.filter(
          p => p.toString() !== socket.userId.toString()
        );

        const isEmpty = conversation.voiceChat.participants.length === 0;
        if (isEmpty) {
          conversation.voiceChat = { active: false, startedAt: null, startedBy: null, participants: [] };
        }
        await conversation.save();

        io.to(conversationId).emit(isEmpty ? 'voicechat:ended' : 'voicechat:participant_left', {
          conversationId,
          userId: socket.userId,
          participants: conversation.voiceChat.participants
        });
      } catch (err) {
        const { logError } = require('../config/winston');
        logError('voicechat:leave error', { message: err.message });
      }
    });

    socket.on('voicechat:end', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId || !socket.userId) return;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) return;

        const isStarter = conversation.voiceChat?.startedBy?.toString() === socket.userId.toString();
        const isAdmin = conversation.admins?.some(a => a.toString() === socket.userId.toString());
        if (!isStarter && !isAdmin) return;

        conversation.voiceChat = { active: false, startedAt: null, startedBy: null, participants: [] };
        await conversation.save();

        io.to(conversationId).emit('voicechat:ended', { conversationId });
      } catch (err) {
        const { logError } = require('../config/winston');
        logError('voicechat:end error', { message: err.message });
      }
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
          user: socket.userId,
          userId: String(socket.userId),
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
        // Only broadcast to contacts for privacy
try {
          const creator = await User.findById(socket.userId).select('contacts');
          const contacts = creator?.contacts || [];
          // FIX: contacts are stored as { user, savedName } subdocuments (see
          // User model), not raw ObjectIds. String(cId) on a subdocument
          // produced "[object Object]", which never matched a key in the
          // online-users map — so this loop never actually found anyone's
          // socket and a freshly-posted status only ever reached the poster
          // themselves in real time. Everyone else only saw it whenever they
          // next polled GET /api/status. Extract the nested `user` id so the
          // status reaches all of the poster's contacts the instant it's posted.
          contacts.forEach(c => {
            const contactUserId = c?.user ? String(c.user) : String(c);
            const sid = getOnlineUsers().get(contactUserId);
            if (sid) io.to(sid).emit('status:created', statusObj);
          });
          socket.emit('status:created', statusObj);
        } catch(_e) { socket.emit('status:created', statusObj); }
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
          // Check if viewer has hideViewStatus enabled
          const viewer = await User.findById(socket.userId).select('genzMods');
          const hideView = viewer?.genzMods?.hideViewStatus === true;
          if (!hideView) {
            const alreadyViewed = status.views.some(view => view.user?.toString() === socket.userId);
            if (!alreadyViewed) {
              await Status.findByIdAndUpdate(
                statusId,
                {
                  $push: { views: { user: socket.userId, viewedAt: new Date() } },
                  $set: { viewsCount: status.views.length + 1 }
                },
                { new: true }
              );
            }
          }
          const updatedStatus = await Status.findById(statusId);
          io.emit('status:viewed', updatedStatus.toObject ? updatedStatus.toObject() : JSON.parse(JSON.stringify(updatedStatus)));
        }
      } catch (error) {
        console.error('Error viewing status:', error);
      }
    });

    socket.on('view_status', async (data = {}) => {
      try {
        const { statusId } = data;
        if (statusId) {
          // Check hideViewStatus mod
          const viewer = await User.findById(socket.userId).select('genzMods').lean();
          const hideView = viewer?.genzMods?.hideViewStatus === true;
          if (!hideView) {
            const status = await Status.findById(statusId);
            if (status && !status.views.some(view => view.user?.toString() === socket.userId)) {
              status.views.push({ user: socket.userId, viewedAt: new Date() });
              status.viewsCount = status.views.length;
              await status.save();
            }
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
            if (!status.reactions) status.reactions = [];
            const existingIndex = status.reactions.findIndex(
              r => r.user && r.user.toString() === socket.userId && (r.emoji === '❤️' || r.emoji === 'like' || r.emoji === '\u2764\uFE0F')
            );
            const isCurrentlyLiked = existingIndex !== -1;
            
            if (liked && !isCurrentlyLiked) {
              status.reactions.push({ user: socket.userId, emoji: '❤️' });
            } else if (!liked && isCurrentlyLiked) {
              status.reactions.splice(existingIndex, 1);
            }
            
            likesCount = status.reactions.filter(r => r.emoji === '❤️' || r.emoji === 'like' || r.emoji === '\u2764\uFE0F').length;
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
          // Use atomic update to avoid VersionError
          await Status.findByIdAndUpdate(
            statusId,
            { $push: { replies: reply } },
            { new: true }
          );
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
        const { name, recipients = [], message, mediaUrl, mediaType } = data;
        if (!recipients.length) return socket.emit('error', { message: 'No recipients specified' });

        const broadcast = await Broadcast.create({
          name: name || `Broadcast ${new Date().toLocaleDateString()}`,
          sender: socket.userId,
          createdBy: socket.userId,
          recipients,
          message: message || '',
          timestamp: new Date()
        });

        // Send individual messages to each recipient (WhatsApp broadcast behavior)
        // Each recipient sees it as a private message, not a group
        const sender = await User.findById(socket.userId).select('username profilePicture phoneNumber');
        let sentCount = 0;

        for (const recipientId of recipients) {
          try {
            const recipStr = String(recipientId);
            // Get or create 1-to-1 conversation
            let conv = await Conversation.findOne({
              isGroup: false,
              participants: { $all: [socket.userId, recipientId], $size: 2 }
            });
            if (!conv) {
              conv = await Conversation.create({
                participants: [socket.userId, recipientId],
                isGroup: false,
                isBroadcast: true
              });
            }

            // Save message to DB
            const msg = await Message.create({
              conversationId: conv._id,
              sender: socket.userId,
              content: message || '',
              messageType: mediaUrl ? mediaType || 'image' : 'text',
              mediaUrl: mediaUrl || undefined,
              isBroadcast: true,
              broadcastId: broadcast._id,
              status: 'sent'
            });

            // Deliver to recipient if online
            const recipSocketId = getOnlineUsers().get(recipStr);
            if (recipSocketId) {
              io.to(recipSocketId).emit('message:received', {
                ...msg.toObject(),
                sender: { _id: socket.userId, username: sender?.username, profilePicture: sender?.profilePicture },
                conversationId: conv._id
              });
              sentCount++;
            }
          } catch (recipErr) {
            console.error('[broadcast:create] Error sending to recipient:', recipErr?.message);
          }
        }

        // Notify sender of delivery summary
        socket.emit('broadcast:created', {
          broadcastId: broadcast._id,
          name: broadcast.name,
          recipientCount: recipients.length,
          deliveredCount: sentCount
        });
      } catch (error) {
        console.error('Error creating broadcast:', error);
        socket.emit('error', { message: 'Broadcast failed' });
      }
    });

    // Send mass message handler
    socket.on('send_mass_message', async (data, callback) => {
      const ack = (payload) => {
        if (typeof callback === 'function') callback(payload);
      };

      try {
        const { recipients = [], message } = data || {};

        if (!socket.userId) {
          return ack({ success: false, error: 'Not authenticated' });
        }
        if (!message || !String(message).trim()) {
          return ack({ success: false, error: 'Message content is required' });
        }
        if (!Array.isArray(recipients) || recipients.length === 0) {
          return ack({ success: false, error: 'No recipients selected' });
        }

        let sentCount = 0;
        const failedRecipients = [];

        for (const recipientId of recipients) {
          try {
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

          sentCount++;
          } catch (recipientError) {
            console.error(`Error sending mass message to recipient ${recipientId}:`, recipientError);
            failedRecipients.push({ recipientId, error: recipientError.message });
          }
        }

        ack({
          success: sentCount > 0,
          sentCount,
          failedCount: failedRecipients.length,
          failedRecipients,
          error: sentCount === 0 ? 'Failed to send to any recipient' : undefined
        });
      } catch (error) {
        console.error('Error sending mass message:', error);
        ack({ success: false, error: error.message || 'Failed to send mass message' });
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
          const idx = Number(optionIndex);
          if (!Number.isInteger(idx) || idx < 0 || idx >= message.poll.options.length) {
            return socket.emit('error', { message: 'Invalid poll option' });
          }
          if (!Array.isArray(message.poll.options[idx].votes)) {
            message.poll.options[idx].votes = [];
          }
          message.poll.options[idx].votes.push(userId);
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
    socket.on('disappearing_messages:set', async (data = {}) => {
      try {
        const { chatId } = data;
        const conversation = await getConversationIfParticipant(chatId, socket);
        if (!conversation) return;

        conversation.disappearingMessages = normalizeDisappearingMessages(data);
        await conversation.save();
        io.to(chatId).emit('disappearing_messages:set', {
          chatId,
          disappearingMessages: conversation.disappearingMessages,
          ...conversation.disappearingMessages
        });
        io.to(chatId).emit('group_update_signal', {
          chatId,
          action: 'update_disappearing',
          disappearingMessages: conversation.disappearingMessages,
          ...conversation.disappearingMessages
        });
      } catch (error) {
        console.error('Error setting disappearing messages:', error);
      }
    });

    socket.on('update_disappearing_messages', async (data = {}) => {
      try {
        const { chatId } = data;
        const conversation = await Conversation.findById(chatId);
        if (conversation && includesId(conversation.participants, socket.userId)) {
          conversation.disappearingMessages = normalizeDisappearingMessages(data);
          await conversation.save();
        }
        io.to(chatId).emit('group_update_signal', {
          chatId,
          action: 'update_disappearing',
          disappearingMessages: conversation?.disappearingMessages || normalizeDisappearingMessages(data),
          ...(conversation?.disappearingMessages || normalizeDisappearingMessages(data))
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
          message: scheduledMessage.toObject ? scheduledMessage.toObject() : JSON.parse(JSON.stringify(scheduledMessage))
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
          io.emit('status:updated', status.toObject ? status.toObject() : JSON.parse(JSON.stringify(status)));
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
        io.emit('broadcast_list:created', broadcastList.toObject ? broadcastList.toObject() : JSON.parse(JSON.stringify(broadcastList)));
      } catch (error) {
        console.error('Error creating broadcast list:', error);
      }
    });

    // Update auto reply handler
    socket.on('update_auto_reply', async (data) => {
      try {
        if (!socket.userId) return;
        const { autoReplyEnabled, message } = data;
        // Record online session in history
      if (socket._connectedAt) {
        const duration = Math.round((Date.now() - socket._connectedAt.getTime()) / 1000);
        await User.findByIdAndUpdate(socket.userId, {
          $push: {
            onlineHistory: {
              $each: [{ connectedAt: socket._connectedAt, disconnectedAt: new Date(), duration }],
              $slice: -168 // keep last 7 days (24h * 7)
            }
          }
        });
      }
      await User.findByIdAndUpdate(socket.userId, {
          autoReplyEnabled,
          autoReplyMessage: message
        });
      } catch (error) {
        console.error('Error updating auto reply:', error);
      }
    });

    // Block user handler
    // FIX: Persist to database to ensure message sending checks see updated state immediately
    // This prevents race conditions where a user unblocks but messages still fail because
    // the database hasn't been updated yet.
    socket.on('block_user', async (data) => {
      try {
        if (!socket.userId) return;
        const { userId } = data;
        if (!userId) return;

        // Update database atomically
        await User.findByIdAndUpdate(socket.userId, {
          $addToSet: { blockedUsers: userId }
        });

        // Emit realtime notification to all connected clients
        io.emit('user:blocked', { blockerId: socket.userId, userId });
      } catch (error) {
        console.error('Error blocking user:', error);
      }
    });

    // Unblock user handler (same fix as block_user)
    socket.on('unblock_user', async (data) => {
      try {
        if (!socket.userId) return;
        const { userId } = data;
        if (!userId) return;

        // Update database atomically
        await User.findByIdAndUpdate(socket.userId, {
          $pull: { blockedUsers: userId }
        });

        // Emit realtime notification to all connected clients
        io.emit('user:unblocked', { blockerId: socket.userId, userId });
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
        const { logError } = require('../config/winston');
        logError('Error deleting message', { message: error.message });
      }
    });

    // Mark as read handler (mismatch fix)
    socket.on('mark_as_read', safeAsyncHandler(socket, async (data) => {
      const { chatId, skipReadReceipts } = data;

      if (!chatId || (!/^[0-9a-fA-F]{24}$/.test(chatId) && !chatId.startsWith('conv-status-'))) {
        const { logWarn } = require('../config/winston');
        logWarn('Invalid chatId format in mark_as_read', { chatId });
        return;
      }

      // Skip processing if this is a status conversation ID
      if (chatId.startsWith('conv-status-')) {
        const { logDebug } = require('../config/winston');
        logDebug('Skipping status conv-id in mark_as_read', { chatId });
        return;
      }

      const conversation = await getConversationIfParticipant(chatId, socket);
      if (!conversation) {
        const { logDebug } = require('../config/winston');
        logDebug('Conversation not found or user not participant', { chatId });
        return;
      }

      const userId = String(socket.userId);

      if (!skipReadReceipts) {
        // Validate conversationId is a valid MongoDB ObjectId before querying
        if (mongoose.Types.ObjectId.isValid(chatId) && !chatId.startsWith('conv-status-')) {
          // Batch update for performance (avoid N+1 DB calls)
          await Message.updateMany(
            {
              conversationId: chatId,
              sender: { $ne: userId },
              status: { $ne: 'read' },
              'readBy.user': { $ne: userId }
            },
            {
              $push: { readBy: { user: userId, readAt: new Date() } },
              $set: { status: 'read' }
            }
          );
        }
      }

      setUnreadCount(conversation, userId, 0);
      await conversation.save();

      io.to(userId).emit('conversation:unread-update', {
        conversationId: conversation._id,
        unreadCount: 0
      });

      if (!skipReadReceipts) {
        io.to(chatId).emit('messages:read', { chatId, userId });
      }
    }));

    socket.on('user_online', async () => {
      try {
        if (!socket.userId) return;
        const user = await User.findById(socket.userId).select('username');
        // Record online session in history
      if (socket._connectedAt) {
        const duration = Math.round((Date.now() - socket._connectedAt.getTime()) / 1000);
        await User.findByIdAndUpdate(socket.userId, {
          $push: {
            onlineHistory: {
              $each: [{ connectedAt: socket._connectedAt, disconnectedAt: new Date(), duration }],
              $slice: -168 // keep last 7 days (24h * 7)
            }
          }
        });
      }
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
        if (!visitedUserId || !visitorId || String(visitedUserId) === String(visitorId)) return;

        const visitor = await User.findById(visitorId).select('username profilePicture').lean();
        const entry = {
          visitorId,
          visitorName: visitorName || visitor?.username || 'Someone',
          visitorPicture: visitor?.profilePicture || null,
          timestamp: new Date()
        };

        await User.findByIdAndUpdate(visitedUserId, {
          $push: {
            profileVisitors: {
              $each: [entry],
              $position: 0,
              $slice: 50
            }
          }
        });

        io.to(String(visitedUserId)).emit('profile:visited', {
          visitedUserId,
          ...entry
        });
      } catch (error) {
        console.error('Error visiting profile:', error);
      }
    });

    socket.on('status:delete', async (data) => {
      try {
        const statusId = data?.statusId || data?.id;
        if (!statusId) return;
        const status = await Status.findById(statusId);
        if (!status) return;
        if (String(status.userId) !== String(socket.userId)) {
          return socket.emit('error', { message: 'You can only delete your own status' });
        }
        await Status.findByIdAndDelete(statusId);
        io.emit('status:deleted', { statusId: String(statusId), userId: String(socket.userId) });
      } catch (error) {
        console.error('Error deleting status via socket:', error);
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
    // FEATURE ADD: real implementation backing the alwaysOnline GENZ Mod.
    // Previously the toggle existed in Settings but nothing read it — there
    // was no "away" concept anywhere in the app at all (User.status schema
    // had 'away' in its enum but nothing ever set it). The client now sends
    // this after a period of inactivity (unless alwaysOnline is on, in
    // which case it never fires), and we broadcast it to the user's
    // conversation participants so open chats reflect it live.
    socket.on('presence:update', async (data = {}) => {
      try {
        const status = data.status === 'away' ? 'away' : 'online';
        if (!socket.userId) return;
        userAwayStatus.set(String(socket.userId), status === 'away');

        const conversations = await Conversation.find({ participants: socket.userId }).select('participants');
        const notifiedUsers = new Set();
        for (const conv of conversations) {
          for (const participantId of conv.participants) {
            const pid = String(participantId);
            if (pid === String(socket.userId) || notifiedUsers.has(pid)) continue;
            notifiedUsers.add(pid);
            const participantSocketId = onlineUsers.get(pid);
            if (participantSocketId) {
              io.to(participantSocketId).emit('presence:changed', {
                userId: String(socket.userId),
                status
              });
            }
          }
        }
      } catch (error) {
        console.error('Error updating presence:', error.message);
      }
    });

    socket.on('typing', async (data) => {
      try {
        const { conversationId } = data;
        socket.data = socket.data || {};
        socket.data.typingConversationId = conversationId;
        // Check hideTyping mod
        const sender = await User.findById(socket.userId).select('genzMods').lean();
        if (sender?.genzMods?.hideTyping === true) return;
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
        if (socket.data && socket.data.typingConversationId === conversationId) {
          socket.data.typingConversationId = null;
        }
        const payload = {
          userId: socket.userId,
          sender: data.sender,
          conversationId,
          isTyping: false
        };
        if (conversationId) {
          // FIX: this used to ALSO do socket.broadcast.emit('typing_status', ...),
          // which sends to every connected socket on the entire server —
          // every online user got a typing-stopped event for conversations
          // they're not even part of. The room-scoped emit above is already
          // correct and sufficient; the global broadcast was pure overhead
          // and a metadata leak (who's typing to whom, platform-wide).
          socket.to(conversationId).emit('user:typing', payload);
          socket.to(conversationId).emit('typing_status', payload);
        }
      } catch (error) {
        console.error('Error stopping typing:', error);
      }
    });

    // Recording handler
    socket.on('recording', async (data) => {
      try {
        const { conversationId } = data;
        // Check if user has hideRecording mod enabled
        const sender = await User.findById(socket.userId).select('genzMods');
        if (sender?.genzMods?.hideRecording === true) return;
        socket.to(conversationId).emit('user:recording', {
          userId: socket.userId,
          conversationId,
          isRecording: true
        });
        if (conversationId) {
          socket.to(conversationId).emit('recording_status', {
            sender: data.sender || socket.userId,
            isRecording: data.isRecording ?? true
          });
        }
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
      // SECURITY: verify caller is admin before updating group settings
      try {
        const { chatId, setting, value } = data;
        const conversation = await Conversation.findById(chatId);
        if (!conversation) return;
        if (!includesId(conversation.participants, socket.userId)) {
          return socket.emit('error', { message: 'Not a participant of this group' });
        }
        const allowedByAdmin = ['adminOnlyMessaging', 'canSendMedia', 'canCreatePolls', 'groupDescription', 'disappearingMessages'];
        const allowedByAll = ['disappearingMessages'];
        const isAdmin = conversation.admins?.some(a => String(a) === String(socket.userId));
        if (allowedByAdmin.includes(setting) && !isAdmin && !allowedByAll.includes(setting)) {
          return socket.emit('error', { message: 'Only group admins can change this setting' });
        }
        const SAFE_SETTINGS = ['adminOnlyMessaging', 'canSendMedia', 'canCreatePolls', 'groupDescription', 'disappearingMessages', 'groupName', 'groupPicture', 'isBroadcast'];
        if (!SAFE_SETTINGS.includes(setting)) {
          return socket.emit('error', { message: 'Setting not allowed' });
        }
        conversation[setting] = value;
        await conversation.save();
        io.to(chatId).emit('group_setting:updated', { chatId, setting, value });
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

    // ── Group membership events (relayed from frontend after HTTP calls) ──
    // Frontend calls HTTP API first (which persists data), then emits these
    // socket events so the change propagates in real time to all other members.

    socket.on('participant:added', async (data = {}) => {
      try {
        const { groupId, userId } = data;
        if (!groupId || !userId || !socket.userId) return;
        const conv = await Conversation.findById(groupId).select('participants admins isGroup');
        if (!conv?.isGroup || !includesId(conv.participants, socket.userId)) return;
        const addedUser = await User.findById(userId).select('username profilePicture status');
        const payload = { groupId, userId, user: addedUser };
        io.to(String(groupId)).emit('group:participant_added', payload);
        // Also tell the added user so they can load the group
        io.to(String(userId)).emit('group:you_were_added', { groupId, addedBy: socket.userId });
        // System message
        io.to(String(groupId)).emit('group:system_message', {
          groupId,
          text: `${addedUser?.username || 'A user'} was added`,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[socket] participant:added error:', err.message);
      }
    });

    socket.on('participant:removed', async (data = {}) => {
      try {
        const { groupId, userId } = data;
        if (!groupId || !userId || !socket.userId) return;
        const conv = await Conversation.findById(groupId).select('admins isGroup');
        if (!conv?.isGroup || !includesId(conv.admins, socket.userId)) return;
        const removedUser = await User.findById(userId).select('username');
        io.to(String(groupId)).emit('group:participant_removed', { groupId, userId });
        io.to(String(userId)).emit('group:you_were_removed', { groupId, removedBy: socket.userId });
        io.to(String(groupId)).emit('group:system_message', {
          groupId,
          text: `${removedUser?.username || 'A member'} was removed`,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[socket] participant:removed error:', err.message);
      }
    });

    socket.on('admin:added', async (data = {}) => {
      try {
        const { groupId, userId } = data;
        if (!groupId || !userId || !socket.userId) return;
        const conv = await Conversation.findById(groupId).select('admins isGroup participants');
        if (!conv?.isGroup || !includesId(conv.admins, socket.userId)) return;
        const promotedUser = await User.findById(userId).select('username');
        io.to(String(groupId)).emit('group:admin_added', { groupId, userId });
        io.to(String(userId)).emit('group:you_are_admin', { groupId, promotedBy: socket.userId });
        io.to(String(groupId)).emit('group:system_message', {
          groupId,
          text: `${promotedUser?.username || 'A member'} is now an admin`,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[socket] admin:added error:', err.message);
      }
    });

    socket.on('admin:removed', async (data = {}) => {
      try {
        const { groupId, userId } = data;
        if (!groupId || !userId || !socket.userId) return;
        const conv = await Conversation.findById(groupId).select('admins isGroup');
        if (!conv?.isGroup || !includesId(conv.admins, socket.userId)) return;
        io.to(String(groupId)).emit('group:admin_removed', { groupId, userId });
        io.to(String(userId)).emit('group:your_admin_removed', { groupId });
      } catch (err) {
        console.error('[socket] admin:removed error:', err.message);
      }
    });

    socket.on('group:left', async (data = {}) => {
      try {
        const { groupId } = data;
        if (!groupId || !socket.userId) return;
        const leftUser = await User.findById(socket.userId).select('username');
        io.to(String(groupId)).emit('group:member_left', {
          groupId,
          userId: String(socket.userId),
          username: leftUser?.username,
        });
        io.to(String(groupId)).emit('group:system_message', {
          groupId,
          text: `${leftUser?.username || 'A member'} left the group`,
          createdAt: new Date().toISOString(),
        });
        socket.leave(String(groupId));
      } catch (err) {
        console.error('[socket] group:left error:', err.message);
      }
    });

    socket.on('group:updated', async (data = {}) => {
      try {
        const { groupId, updates = {} } = data;
        if (!groupId || !socket.userId) return;
        const conv = await Conversation.findById(groupId).select('admins isGroup canChangeGroupInfo');
        if (!conv?.isGroup) return;
        const canEdit = includesId(conv.admins, socket.userId) || conv.canChangeGroupInfo;
        if (!canEdit) return;
        io.to(String(groupId)).emit('group:info_updated', { groupId, updates, updatedBy: socket.userId });
      } catch (err) {
        console.error('[socket] group:updated error:', err.message);
      }
    });

    socket.on('message:forwarded', async (data = {}) => {
      try {
        const { conversationId, messageId, originalSender } = data;
        if (!conversationId || !socket.userId) return;
        // The HTTP controller already saved and emitted message:received;
        // this socket event lets senders confirm delivery to the forwarded conversation.
        socket.to(String(conversationId)).emit('message:forwarded_notification', {
          conversationId,
          messageId,
          forwardedBy: socket.userId,
          originalSender,
        });
      } catch (err) {
        console.error('[socket] message:forwarded error:', err.message);
      }
    });

    // FEATURE ADD: the anti-screenshot mod detects an attempt client-side
    // (blur/visibility-change/PrintScreen/etc) but had no way to tell the
    // *other* participant it happened — the callback that used to fire this
    // was entirely commented out. Just relay it to everyone else currently
    // in the conversation.
    // FEATURE ADD: notify the sender when someone screenshots/records their
    // view-once photo/video/voice note while viewing it - same idea as
    // WhatsApp's "screenshot" notice for view-once media.
    socket.on('viewonce:screenshot_attempt', async (data = {}) => {
      try {
        const { messageId, senderId } = data;
        if (!senderId || !socket.userId) return;
        const viewer = await User.findById(socket.userId).select('username');
        const targetSid = global.onlineUsers?.get(String(senderId));
        if (targetSid) {
          io.to(targetSid).emit('viewonce:screenshotted', {
            messageId,
            byUserId: socket.userId,
            byUsername: viewer?.username || 'Someone',
            at: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('[socket] viewonce:screenshot_attempt error:', err.message);
      }
    });

    socket.on('screenshot:attempt', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId || !socket.userId) return;
        const conv = await Conversation.findById(conversationId).select('participants');
        if (!conv || !includesId(conv.participants, socket.userId)) return;
        const attempter = await User.findById(socket.userId).select('username');
        socket.to(String(conversationId)).emit('screenshot:attempted', {
          conversationId,
          byUserId: socket.userId,
          byUsername: attempter?.username || 'Someone',
          at: new Date().toISOString()
        });
      } catch (err) {
        console.error('[socket] screenshot:attempt error:', err.message);
      }
    });

    socket.on('status_reply', async (data = {}) => {
      try {
        const { statusOwnerId, replyText, statusId, quotedStatus } = data;
        if (!statusOwnerId || !socket.userId) return;
        const sender = await User.findById(socket.userId).select('username profilePicture');
        io.to(String(statusOwnerId)).emit('status:reply_received', {
          from: socket.userId,
          senderName: sender?.username,
          senderAvatar: sender?.profilePicture,
          statusId,
          replyText,
          quotedStatus,
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('[socket] status_reply error:', err.message);
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

        // ✅ Kagua block kabla ya simu
        const isBlocked = await isEitherUserBlocked(socket.userId, targetUserId);
        if (isBlocked) {
          return socket.emit('call:error', { error: 'Cannot call this user' });
        }

        const targetSocketId = onlineUsers.get(targetUserId);

        if (targetSocketId) {
          // Only ring the callee for the first offer of this call. Any later
          // offer on the same session is a mid-call ICE renegotiation, not a
          // new call — see markOfferSent in utils/activeCalls.js.
          const isRenegotiation = activeCalls.markOfferSent(socket.userId, conversationId);
          if (!isRenegotiation) {
            io.to(targetSocketId).emit('call:incoming', {
              callerId: socket.userId,
              callerSocketId: socket.id,
              offer,
              callType,
              conversationId
            });
          }
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
        const { to, callerSocketId, answer } = data;
        const targetSocketId = callerSocketId || onlineUsers.get(String(to)) || onlineUsers.get(String(data.callerId));
        if (!targetSocketId) {
          return socket.emit('call:error', { message: 'Caller is offline' });
        }
        io.to(targetSocketId).emit('call:answered', {
          answer,
          responderId: socket.userId
        });
        io.to(targetSocketId).emit('webrtc:answer', {
          answer,
          from: socket.userId,
          responderId: socket.userId
        });
      } catch (error) {
        const { logError } = require('../config/winston');
        logError('Error answering WebRTC call', { message: error.message });
      }
    });

    // WebRTC Signaling: ICE candidate
    socket.on('call:ice-candidate', async (data) => {
      try {
        const { targetSocketId, targetUserId, candidate } = data;
        const resolvedSocketId = targetSocketId || onlineUsers.get(String(targetUserId));
        
        if (!resolvedSocketId) {
          const { logWarn } = require('../config/winston');
          logWarn('WebRTC ICE candidate target not found', { targetUserId, targetSocketId });
          return socket.emit('call:error', { message: 'Target user is offline' });
        }
        
        const { logDebug } = require('../config/winston');
        logDebug('Relaying ICE candidate', { from: socket.userId, to: resolvedSocketId });
        
        io.to(resolvedSocketId).emit('call:ice-candidate', {
          candidate,
          senderId: socket.userId
        });
        io.to(resolvedSocketId).emit('webrtc:ice_candidate', {
          candidate,
          from: socket.userId,
          senderId: socket.userId
        });
      } catch (error) {
        console.error('Error sending ICE candidate:', error);
        socket.emit('call:error', { message: 'Failed to relay ICE candidate' });
      }
    });

    // Frontend WebRTC service emits these event names directly.
    socket.on('webrtc:offer', async (data) => {
      try {
        const { to, targetUserId, offer, callType, conversationId } = data;
        const targetId = to || targetUserId;
        const targetSocketId = onlineUsers.get(String(targetId));

        if (!targetSocketId) {
          const { logError } = require('../config/winston');
          logError('WebRTC target user not found', { targetId });
          return socket.emit('call:error', { message: 'Target user is offline' });
        }

        const { logDebug } = require('../config/winston');
        logDebug('Sending WebRTC offer', { from: socket.userId, to: targetId, callType });
        const caller = await User.findById(socket.userId).select('username profilePicture').lean();

        io.to(targetSocketId).emit('webrtc:offer', {
          from: socket.userId,
          callerId: socket.userId,
          callerSocketId: socket.id,
          offer,
          callType,
          conversationId
        });

        // Only ring the callee (and send the push notification) for the
        // first offer of this call session. A later offer on the same
        // conversation is a mid-call ICE renegotiation (e.g. after a brief
        // network drop), not a new call — without this check the callee's
        // phone re-rang and re-showed the "incoming call" screen every time
        // the connection blipped, forcing them to accept/decline again on a
        // call they had already answered.
        const isRenegotiation = activeCalls.markOfferSent(socket.userId, conversationId);
        if (!isRenegotiation) {
          io.to(targetSocketId).emit('call:incoming', {
            callerId: socket.userId,
            callerSocketId: socket.id,
            callerName: caller?.username || 'Unknown',
            callerPicture: caller?.profilePicture || '',
            offer,
            callType,
            conversationId
          });
          sendIncomingCallNotification(targetId, {
            callerName: caller?.username || 'GENZ',
            callerId: socket.userId,
            callType: callType || 'audio',
            conversationId,
            callId: conversationId || `${socket.userId}-${Date.now()}`,
            offer
          }).catch((notifyErr) => {
            const { logWarn } = require('../config/winston');
            logWarn('Incoming call push notification failed', { message: notifyErr?.message });
          });
        }
      } catch (error) {
        const { logError } = require('../config/winston');
        logError('Error relaying WebRTC offer', { message: error.message });
        socket.emit('call:error', { message: error.message });
      }
    });

    socket.on('webrtc:answer', async (data) => {
      try {
        const { to, callerSocketId, answer } = data;
        const targetSocketId = callerSocketId || onlineUsers.get(String(to));
        if (!targetSocketId) {
          const { logError } = require('../config/winston');
          logError('WebRTC caller socket not found', { to, callerSocketId });
          return socket.emit('call:error', { message: 'Caller is offline' });
        }

        const { logDebug } = require('../config/winston');
        logDebug('Sending WebRTC answer', { from: socket.userId, to: targetSocketId });

        io.to(targetSocketId).emit('webrtc:answer', {
          from: socket.userId,
          responderId: socket.userId,
          answer
        });
        io.to(targetSocketId).emit('call:accepted', {
          responderId: socket.userId,
          answer
        });
      } catch (error) {
        const { logError } = require('../config/winston');
        logError('Error relaying WebRTC answer', { message: error.message });
        socket.emit('call:error', { message: 'Failed to send answer' });
      }
    });

    socket.on('webrtc:ice_candidate', async (data) => {
      try {
        const { to, targetSocketId, candidate } = data;
        const relaySocketId = targetSocketId || onlineUsers.get(String(to)) || to;
        if (!relaySocketId) {
          const { logWarn } = require('../config/winston');
          logWarn('WebRTC ICE candidate relay target not found', { to, targetSocketId });
          return;
        }

        const { logDebug } = require('../config/winston');
        logDebug('Relaying ICE candidate via webrtc event', { from: socket.userId, to: relaySocketId });

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
        const { logError } = require('../config/winston');
        logError('Error relaying ICE candidate', { message: error.message });
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


    // ── Group Call (Conference) ────────────────────────────────────────────
    socket.on('group_call:start', async (data = {}) => {
      try {
        const { conversationId, callType = 'audio' } = data;
        if (!conversationId) return;
        const conversation = await Conversation.findById(conversationId)
          .populate('participants', '_id username profilePicture');
        if (!conversation) return;

        const caller = await User.findById(socket.userId).select('username profilePicture');

        // Notify all participants except caller
        for (const participant of conversation.participants) {
          const pid = String(participant._id);
          if (pid === String(socket.userId)) continue;
          const pSocketId = getOnlineUsers().get(pid);
          if (pSocketId) {
            io.to(pSocketId).emit('group_call:incoming', {
              conversationId,
              callType,
              callerId: socket.userId,
              callerName: caller?.username || 'Unknown',
              callerPicture: caller?.profilePicture || '',
              callerSocketId: socket.id,
              groupName: conversation.groupName || 'Group Call',
            });
          }
        }

        // Join caller to call room
        socket.join(`call:${conversationId}`);
        socket.emit('group_call:started', { conversationId, callType });
      } catch (err) {
        console.error('group_call:start error:', err);
      }
    });

    socket.on('group_call:join', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;
        socket.join(`call:${conversationId}`);
        // Notify others in the call room
        socket.to(`call:${conversationId}`).emit('group_call:participant_joined', {
          userId: socket.userId,
          socketId: socket.id,
        });
        socket.emit('group_call:joined', { conversationId });
      } catch (err) {
        console.error('group_call:join error:', err);
      }
    });

    socket.on('group_call:leave', async (data = {}) => {
      try {
        const { conversationId } = data;
        if (!conversationId) return;
        socket.leave(`call:${conversationId}`);
        socket.to(`call:${conversationId}`).emit('group_call:participant_left', {
          userId: socket.userId,
          socketId: socket.id,
        });
      } catch (err) {
        console.error('group_call:leave error:', err);
      }
    });

    // WebRTC signaling for group calls
    socket.on('group_call:offer', ({ to, offer, conversationId } = {}) => {
      if (!to) return;
      io.to(to).emit('group_call:offer', { from: socket.id, offer, conversationId });
    });
    socket.on('group_call:answer', ({ to, answer } = {}) => {
      if (!to) return;
      io.to(to).emit('group_call:answer', { from: socket.id, answer });
    });
    socket.on('group_call:ice', ({ to, candidate } = {}) => {
      if (!to) return;
      io.to(to).emit('group_call:ice', { from: socket.id, candidate });
    });

    // ─── Group management socket events ────────────────────────────────────
    // When admin bans a member, forward to the group room
    socket.on('group:ban_member', async ({ groupId, userId, reason } = {}) => {
      try {
        if (!groupId || !userId) return;
        const conversation = await Conversation.findById(groupId);
        if (!conversation) return;
        const isAdmin = conversation.admins?.some(a => String(a) === String(socket.userId));
        if (!isAdmin) return;
        io.to(String(groupId)).emit('group:member_banned', { groupId, userId, bannedBy: socket.userId, reason });
        io.to(String(userId)).emit('group:you_were_banned', { groupId, groupName: conversation.groupName, reason });
      } catch (err) { console.error('group:ban_member error:', err); }
    });

    // Transfer ownership notification
    socket.on('group:transfer_ownership', ({ groupId, newOwnerId } = {}) => {
      try {
        if (!groupId || !newOwnerId) return;
        io.to(String(groupId)).emit('group:ownership_transferred', {
          groupId, newOwnerId, previousOwnerId: socket.userId
        });
      } catch (err) { console.error('group:transfer_ownership error:', err); }
    });

    // Approve/Reject join request notification
    socket.on('group:approve_request', ({ groupId, userId } = {}) => {
      try {
        if (!groupId || !userId) return;
        io.to(String(userId)).emit('group:join_approved', { groupId });
      } catch (err) { console.error('group:approve_request error:', err); }
    });

    socket.on('group:reject_request', ({ groupId, userId, groupName } = {}) => {
      try {
        if (!groupId || !userId) return;
        io.to(String(userId)).emit('group:join_rejected', { groupId, groupName });
      } catch (err) { console.error('group:reject_request error:', err); }
    });

    // New group event created notification
    socket.on('group:event_created', ({ groupId, event } = {}) => {
      try {
        if (!groupId) return;
        io.to(String(groupId)).emit('group:event_created', { groupId, event, createdBy: socket.userId });
      } catch (err) { console.error('group:event_created error:', err); }
    });

    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);

      // 🔥 MUHIMU: Safisha kumbukumbu ili isijaze RAM (No Memory Leak)
      socket.removeAllListeners();

      const disconnectedUserId = socketToUser.get(socket.id) || socket.userId;
      socketToUser.delete(socket.id);

      // FIX: if the disconnected user was mid-call, the other party never
      // found out — their call screen would hang indefinitely with no
      // 'call:ended' event. Clean up any active call sessions and tell
      // whoever was on the other end.
      try {
        if (disconnectedUserId) {
          const endedSessions = activeCalls.endAllCallsForUser(disconnectedUserId);
          for (const session of endedSessions) {
            const otherPartyId = String(session.userId) === String(disconnectedUserId)
              ? session.calleeId
              : session.userId;
            if (otherPartyId) {
              const otherSocketId = onlineUsers.get(String(otherPartyId));
              if (otherSocketId) {
                io.to(otherSocketId).emit('call:ended', {
                  conversationId: session.conversationId,
                  reason: 'peer_disconnected',
                  duration: session.duration
                });
                io.to(otherSocketId).emit('call:ended_all', {
                  conversationId: session.conversationId,
                  reason: 'peer_disconnected'
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error cleaning up active calls on disconnect:', err);
      }

      // FIX: same "stuck UI" class of bug as the call-disconnect fix above —
      // if a user was typing and their connection dropped, the recipient's
      // screen would show "typing..." indefinitely since stop_typing only
      // ever fired on an explicit client event, never on disconnect.
      try {
        const typingConversationId = socket.data && socket.data.typingConversationId;
        if (typingConversationId) {
          socket.to(typingConversationId).emit('user:typing', {
            userId: disconnectedUserId,
            conversationId: typingConversationId,
            isTyping: false
          });
        }
      } catch (err) {
        console.error('Error clearing typing state on disconnect:', err);
      }

      // Clean up presence/away tracking for this user.
      if (disconnectedUserId) {
        userAwayStatus.delete(String(disconnectedUserId));
      }

      if (disconnectedUserId && !isUserStillOnline(disconnectedUserId)) {
        onlineUsers.delete(disconnectedUserId);

        try {
          const disconnectedUser = await User.findById(disconnectedUserId).select('genzMods');
          // If alwaysOnline mod is enabled, don't mark as offline
          if (disconnectedUser?.genzMods?.alwaysOnline === true) {
            return;
          }
          const updateData = { isOnline: false };
          // If freezeLastSeen is enabled, don't update lastSeen
          if (!disconnectedUser?.genzMods?.freezeLastSeen) {
            updateData.lastSeen = new Date();
          }
          await User.findByIdAndUpdate(disconnectedUserId, updateData);

          socket.broadcast.emit('user:offline', { userId: disconnectedUserId, lastSeen: new Date().toISOString() });
        } catch (error) {
          console.error('Error updating user offline status:', error);
        }
      }
    });

    socket.on('disconnecting', (reason) => {
      try {
        console.log('User disconnecting:', socket.id, 'reason:', reason);
        // Leave all rooms before disconnect
        const rooms = socket.rooms;
        for (const room of rooms) {
          if (room !== socket.id) {
            socket.leave(room);
          }
        }
      } catch (err) { console.error('disconnecting handler error:', err); }
    });

    // Handle connection errors gracefully
    socket.on('connect_error', (error) => {
      try {
        console.error('Socket connection error:', error);
        socket.emit('error', { message: 'Connection error occurred' });
      } catch (err) { console.error('connect_error handler error:', err); }
    });
  });
};

module.exports = setupSocket;

// Cleanup intervals on process exit
process.on('SIGTERM', () => { clearInterval(_dedupCleanupInterval); });
process.on('SIGINT', () => { clearInterval(_dedupCleanupInterval); });
