const { logInfo, logError, logWarning, logDebug } = require('../../config/winston');
const {
  computePublicKeyFingerprint,
  classifyPublicKeyAgainstHistory
} = require('../../utils/keyFingerprint');

/**
 * Message-related socket handlers.
 *
 * Extracted from backend/socket/index.js — behavior is identical, the
 * handlers just receive the shared context built in ../context.js.
 */
module.exports = function registerMessageHandlers(ctx) {
  const {
    io,
    socket,
    mongoose,
    Message,
    Conversation,
    User,
    onlineUsers,
    getOnlineUsers,
    includesId,
    safeAsyncHandler,
    normalizeDisappearingMessages,
    getConversationIfParticipant,
    getMessageIfParticipant,
    getUnreadCount,
    setUnreadCount,
    serializeOutgoingMessage,
    resolveMessageMentions,
    normalizeReplyToId,
    getSelfDestructExpiry,
    isConversationBlocked,
    isEitherUserBlocked,
    sendNewMessageNotification,
    notifyMentionedUsers,
    scheduleHardDelete,
    dedupHas,
    dedupSet,
    dedupDelete
  } = ctx;

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
        isVideoNote,
        isSelfDestruct,
        selfDestructTimer,
        structuredContent,
        latitude,
        longitude,
        isLiveLocation,
        liveLocationExpiresAt
      } = data;
      const safeContent = content || fileName || (mediaUrl ? `${messageType || 'media'} message` : '') || (structuredContent && structuredContent.length ? 'Structured Message' : '');
      if (!safeContent) {
        return socket.emit('message:error', { error: 'Message content or media is required' });
      }


      // Generate deduplication key
      dedupKey = `${socket.userId}_${conversationId}_${messageId || Date.now()}_${safeContent}`;

      // Check if message was already processed
      if (await dedupHas(dedupKey)) {
                logDebug('Duplicate message detected, ignoring', { dedupKey });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(conversationId)) {
                logWarn('Invalid conversationId provided', { conversationId });
        return socket.emit('message:error', { error: 'Invalid conversation ID format' });
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

      // Stamp the E2EE envelope's sender key fingerprint + status (current vs
      // rotated) onto the message so any device can render the key badge from
      // the message record itself — no re-fetch of the sender's key history.
      let e2eeKeyFingerprint;
      let e2eeKeyStatus;
      if (isClientE2EE) {
        try {
          const envelope = JSON.parse(safeContent);
          const senderPublicKey = envelope.senderPublicKey;
          if (senderPublicKey) {
            const senderDoc = await User.findById(socket.userId).select('encryptionKeys encryptionKeyHistory');
            e2eeKeyFingerprint = computePublicKeyFingerprint(senderPublicKey);
            e2eeKeyStatus = classifyPublicKeyAgainstHistory(
              senderPublicKey,
              senderDoc?.encryptionKeys?.publicKey,
              senderDoc?.encryptionKeyHistory || []
            );
          }
        } catch (error) {
          logWarning('[E2EE] Failed to stamp message key fingerprint', error);
        }
      }

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
        e2eeKeyFingerprint: e2eeKeyFingerprint || undefined,
        e2eeKeyStatus: e2eeKeyStatus || undefined,
        messageType: messageType || 'text',
        mediaUrl: mediaUrl || '',
        fileName: fileName || '',
        fileSize: fileSize || 0,
        duration: duration || 0,
        replyTo: replyToId,
        isViewOnce: Boolean(isViewOnce),
        isVideoNote: Boolean(isVideoNote),
        isSelfDestruct: Boolean(isSelfDestruct),
        disappearAt,
        mentions: mentionData.mentions,
        clientMessageId: messageId ? String(messageId) : undefined,
        structuredContent: structuredContent || [],
        latitude: typeof latitude === 'number' ? latitude : (latitude ? Number(latitude) : null),
        longitude: typeof longitude === 'number' ? longitude : (longitude ? Number(longitude) : null),
        isLiveLocation: Boolean(isLiveLocation),
        liveLocationExpiresAt: liveLocationExpiresAt ? new Date(liveLocationExpiresAt) : null
      });

      // Mark as processed only after successful persistence
      await dedupSet(dedupKey);

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
            logWarning('[Socket] Message push notification failed:', notifyErr?.message || notifyErr);
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
            logWarning('[Socket] Auto-reply skipped:', autoErr?.message || autoErr);
          }
        }
      }

    } catch (error) {
      logError('Error sending message:', error);
      if (dedupKey) dedupDelete(dedupKey);
      socket.emit('message:error', { error: error.message, messageId: data?.messageId });
    }
  });

  // Live location: update the coordinates on the ORIGINAL location message
  // and broadcast the new position to every participant, instead of
  // creating a brand new chat message on every GPS tick.
  socket.on('location:live:update', safeAsyncHandler(socket, async (data) => {
    const { messageId, latitude, longitude } = data || {};
    if (!messageId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return socket.emit('message:error', { error: 'messageId, latitude and longitude are required' });
    }

    const found = await getMessageIfParticipant(messageId, socket);
    if (!found) return;
    const { message, conversation } = found;

    if (String(message.sender) !== String(socket.userId)) {
      return socket.emit('message:error', { error: 'Only the sender can update this live location' });
    }
    if (!message.isLiveLocation) {
      return socket.emit('message:error', { error: 'This message is not an active live location' });
    }
    if (message.liveLocationExpiresAt && new Date() > message.liveLocationExpiresAt) {
      message.isLiveLocation = false;
      message.liveLocationStoppedAt = new Date();
      await message.save();
      io.to(String(conversation._id)).emit('location:live:stopped', {
        messageId: String(message._id),
        conversationId: String(conversation._id),
        reason: 'expired'
      });
      return socket.emit('message:error', { error: 'Live location session has expired' });
    }

    message.latitude = latitude;
    message.longitude = longitude;
    await message.save();

    io.to(String(conversation._id)).emit('location:live:updated', {
      messageId: String(message._id),
      conversationId: String(conversation._id),
      latitude,
      longitude,
      updatedAt: new Date()
    });
  }));

  // Live location: sender explicitly stops sharing (or auto-stop timer fires client-side).
  socket.on('location:live:stop', safeAsyncHandler(socket, async (data) => {
    const { messageId } = data || {};
    if (!messageId) return;

    const found = await getMessageIfParticipant(messageId, socket);
    if (!found) return;
    const { message, conversation } = found;

    if (String(message.sender) !== String(socket.userId)) {
      return socket.emit('message:error', { error: 'Only the sender can stop this live location' });
    }

    message.isLiveLocation = false;
    message.liveLocationStoppedAt = new Date();
    await message.save();

    io.to(String(conversation._id)).emit('location:live:stopped', {
      messageId: String(message._id),
      conversationId: String(conversation._id),
      reason: 'stopped'
    });
  }));

  socket.on('message:typing', safeAsyncHandler(socket, async (data) => {
    const { conversationId, isTyping } = data;
    const conversation = await getConversationIfParticipant(conversationId, socket);
    if (!conversation) return;

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
      logError('Error marking message as delivered:', error);
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
      logError('Error marking message as read:', error);
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
      logError('Error editing message:', error);
    }
  });

  socket.on('message:delete', async (data) => {
    try {
      const { messageId, forEveryone } = data;
      const result = await getMessageIfParticipant(messageId, socket);
      if (!result) return;
      const { message } = result;

      if (forEveryone) {
        // Only the sender may delete for everyone via socket (admins use REST).
        if (message.sender.toString() !== socket.userId) return;
        // SECURITY (1.6): scrub content immediately and schedule hard delete.
        message.deletedForEveryone = true;
        message.deletedAt = new Date();
        // Keep the pre-delete content so the anti-revoke mod can still list
        // and restore it (GET/POST /genz-mods/deleted-messages). Must be set
        // BEFORE the content is scrubbed below.
        message.originalContent = message.originalContent || message.content;
        message.content = '[deleted]';
        message.caption = '';
        message.mediaUrl = '';
        message.fileName = '';
        message.fileSize = 0;
        message.duration = 0;
        scheduleHardDelete(message, socket.userId);
      } else {
        // Delete for me works for any participant of the conversation.
        if (!Array.isArray(message.deletedFor)) message.deletedFor = [];
        if (!message.deletedFor.some((id) => id?.toString() === socket.userId)) {
          message.deletedFor.push(socket.userId);
        }
      }
      await message.save();

      io.to(message.conversationId.toString()).emit('message:deleted', {
        messageId,
        forEveryone,
        deletedBy: socket.userId
      });
    } catch (error) {
      logError('Error deleting message:', error);
    }
  });

  socket.on('reaction:add', async (data) => {
    try {
      const { messageId, emoji } = data;
      const result = await getMessageIfParticipant(messageId, socket);
      if (!result) return;
      const { message } = result;

      // SECURITY (3.1): atomic upsert — one user can hold only one reaction.
      const added = await Message.findOneAndUpdate(
        { _id: message._id, 'reactions.user': { $ne: socket.userId } },
        { $push: { reactions: { user: socket.userId, emoji } } },
        { new: true }
      );

      if (!added) {
        // User already reacted — atomically update their emoji instead.
        await Message.findOneAndUpdate(
          { _id: message._id, 'reactions.user': socket.userId },
          { $set: { 'reactions.$.emoji': emoji } }
        );
      }

      const updatedMessage = await Message.findById(message._id)
        .populate('sender', 'username profilePicture')
        .populate('replyTo')
        .populate('reactions.user', 'username profilePicture');

      io.to(message.conversationId.toString()).emit('reaction:added', updatedMessage);
    } catch (error) {
      logError('Error adding reaction:', error);
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
      logError('Error removing reaction:', error);
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
      // SECURITY (3.1): atomic upsert — one user can hold only one reaction.
      const added = await Message.findOneAndUpdate(
        { _id: message._id, 'reactions.user': { $ne: actorId } },
        { $push: { reactions: { user: actorId, emoji } } },
        { new: true }
      );

      if (!added) {
        await Message.findOneAndUpdate(
          { _id: message._id, 'reactions.user': actorId },
          { $set: { 'reactions.$.emoji': emoji } }
        );
      }

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
      logError('Error handling legacy message reaction:', error);
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
      logError('Error starring message:', error);
    }
  });

  socket.on('live_reaction', safeAsyncHandler(socket, async (data = {}) => {
    const chatId = data.chatId || data.conversationId;
    if (!chatId) {
      return socket.emit('error', { message: 'chatId is required for live reactions' });
    }
    const conversation = await getConversationIfParticipant(chatId, socket);
    if (!conversation) return;
    const payload = {
      chatId,
      emoji: data.emoji,
      userId: socket.userId,
      timestamp: new Date().toISOString()
    };
    socket.to(chatId).emit('live_reaction_signal', payload);
   }));

  // ── Floating Sticker Broadcast ──
  socket.on('sticker:floating', safeAsyncHandler(socket, async (data = {}) => {
    const { conversationId, chatId, stickerUrl, senderId, senderName, caption } = data;
    const chatRoomId = conversationId || chatId;
    if (!chatRoomId) {
      return socket.emit('error', { message: 'conversationId is required for floating stickers' });
    }
    const conversation = await getConversationIfParticipant(chatRoomId, socket);
    if (!conversation) return;
    const payload = {
      conversationId: chatRoomId,
      stickerUrl: stickerUrl || data.url || data.content,
      senderId: senderId || socket.userId,
      senderName: senderName || socket.username,
      caption: caption || data.caption,
      createdAt: new Date().toISOString()
    };
    // Broadcast to all participants in the chat room, excluding the sender
    socket.to(chatRoomId).emit('sticker:floating', payload);
    // Also emit to the sender (so they see their own sticker float)
    socket.emit('sticker:floating', payload);
  }));

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

      // SECURITY (2.8): cap mass-message recipients per send.
      const MAX_MASS_RECIPIENTS = 20;
      if (recipients.length > MAX_MASS_RECIPIENTS) {
        return ack({ success: false, error: `Maximum ${MAX_MASS_RECIPIENTS} recipients allowed` });
      }

      // SECURITY (2.8): rate-limit mass messages per user per hour (max 5).
      const recentMassCount = await Message.countDocuments({
        sender: socket.userId,
        isMassMessage: true,
        createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) }
      });
      if (recentMassCount >= 5) {
        return ack({ success: false, error: 'Rate limit exceeded' });
      }

      let sentCount = 0;
      const failedRecipients = [];

      for (const recipientId of recipients) {
        try {
        const blocked = await isEitherUserBlocked(socket.userId, recipientId);
        if (blocked) {
          failedRecipients.push({ recipientId, error: 'blocked' });
          continue;
        }
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
          isMassMessage: true,
          timestamp: new Date()
        });

        const populatedMessage = await Message.findById(newMessage._id)
          .populate('sender', 'username profilePicture');

        conversation.lastMessage = newMessage._id;
        conversation.updatedAt = new Date();
        await conversation.save();

        if (isNewConv) {
          const populatedConv = await Conversation.findById(conversation._id)
            .populate('participants', 'username phoneNumber profilePicture isOnline lastSeen about')
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
          logError(`Error sending mass message to recipient ${recipientId}:`, recipientError);
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
      logError('Error sending mass message:', error);
      ack({ success: false, error: error.message || 'Failed to send mass message' });
    }
  });

  // Poll create handler
  socket.on('poll:create', async (data) => {
    try {
      const { conversationId, question, options } = data;
      const conversation = await getConversationIfParticipant(conversationId, socket);
      if (!conversation) return;
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
      logError('Error creating poll:', error);
    }
  });

  // Poll vote handler
  socket.on('poll:vote', async (data) => {
    try {
      const { messageId, optionIndex } = data;
      const message = await Message.findById(messageId);
      if (message && message.poll) {
        const conversation = await getConversationIfParticipant(message.conversationId, socket);
        if (!conversation) return;
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
      logError('Error voting on poll:', error);
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
      logError('Error setting disappearing messages:', error);
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
      logError('Error updating disappearing messages:', error);
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
      logError('Error scheduling message:', error);
      socket.emit('message:error', { error: error.message });
    }
  });

  // Edit message handler (mismatch fix)
  socket.on('edit_message', async (data) => {
    try {
      const { messageId, newContent } = data;
      const result = await getMessageIfParticipant(messageId, socket);
      if (!result) return;
      const { message } = result;
      if (message.sender.toString() === socket.userId) {
        message.content = newContent;
        message.isEdited = true;
        message.editedAt = new Date();
        await message.save();
        const updatedMessage = await Message.findById(message._id)
          .populate('sender', 'username profilePicture');
        io.to(message.conversationId.toString()).emit('message:edited', updatedMessage);
      }
    } catch (error) {
      logError('Error editing message:', error);
    }
  });

  // Delete message handler (mismatch fix)
  socket.on('delete_message', async (data) => {
    try {
      const { messageId } = data;
      const result = await getMessageIfParticipant(messageId, socket);
      if (!result) return;
      const { message } = result;
      if (message.sender.toString() === socket.userId) {
        // SECURITY (1.6): scrub content on delete-for-everyone so the payload
        // can never be re-read from the DB, then schedule hard delete.
        message.deletedForEveryone = true;
        message.deletedAt = new Date();
        // Keep the pre-delete content so the anti-revoke mod can still list
        // and restore it (GET/POST /genz-mods/deleted-messages). Must be set
        // BEFORE the content is scrubbed below.
        message.originalContent = message.originalContent || message.content;
        message.content = '[deleted]';
        message.caption = '';
        message.mediaUrl = '';
        message.fileName = '';
        message.fileSize = 0;
        message.duration = 0;
        await message.save();
        scheduleHardDelete(message, socket.userId);
        io.to(message.conversationId.toString()).emit('message:deleted', { messageId, forEveryone: true });
      }
    } catch (error) {
            logError('Error deleting message', { message: error.message });
    }
  });

  // Mark as read handler (mismatch fix)
  socket.on('mark_as_read', safeAsyncHandler(socket, async (data) => {
    const { chatId, skipReadReceipts } = data;

    if (!chatId || (!/^[0-9a-fA-F]{24}$/.test(chatId) && !chatId.startsWith('conv-status-'))) {
            logWarn('Invalid chatId format in mark_as_read', { chatId });
      return;
    }

    // Skip processing if this is a status conversation ID
    if (chatId.startsWith('conv-status-')) {
            logDebug('Skipping status conv-id in mark_as_read', { chatId });
      return;
    }

    const conversation = await getConversationIfParticipant(chatId, socket);
    if (!conversation) {
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
      logError('Error forwarding message:', error);
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
      logError('[socket] message:forwarded error:', err.message);
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
      logError('[socket] viewonce:screenshot_attempt error:', err.message);
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
      logError('[socket] screenshot:attempt error:', err.message);
    }
  });

  socket.on('typing', async (data) => {
    try {
      const { conversationId } = data;
      // SECURITY (2.2): only participants may emit typing for a conversation.
      const conversation = await getConversationIfParticipant(conversationId, socket);
      if (!conversation) return;
      // FIX: needed so disconnect cleanup (below) knows which room to
      // send a stop-typing event to if this socket vanishes mid-typing.
      socket.data = socket.data || {};
      socket.data.typingConversationId = conversationId;
      socket.to(conversationId).emit('user:typing', {
        userId: socket.userId,
        conversationId,
        isTyping: true
      });
    } catch (error) {
      logError('Error sending typing:', error);
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
      logError('Error stopping typing:', error);
    }
  });

  // Recording handler
  socket.on('recording', async (data) => {
    try {
      const { conversationId } = data;
      // SECURITY (2.2): only participants may emit recording for a conversation.
      const conversation = await getConversationIfParticipant(conversationId, socket);
      if (!conversation) return;
      // FIX: same global-broadcast leak as stop_typing above — scope to
      // the conversation room instead of every connected user.
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
      logError('Error sending recording:', error);
    }
  });
};
