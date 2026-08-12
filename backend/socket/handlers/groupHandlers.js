const { logInfo, logError, logWarning, logDebug } = require('../../config/winston');


/**
 * Group, broadcast-list and group-conversation socket handlers.
 *
 * Extracted from backend/socket/index.js — behavior is identical, the
 * handlers just receive the shared context built in ../context.js.
 */
module.exports = function registerGroupHandlers(ctx) {
  const {
    io,
    socket,
    Message,
    Conversation,
    User,
    Broadcast,
    includesId,
    getConversationIfParticipant,
    getOnlineUsers,
    isEitherUserBlocked
  } = ctx;

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
      logError('Error pinning message:', error);
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
      logError('Error unpinning message:', error);
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
          // FIX: never deliver to a user who blocked the sender (or whom
          // the sender blocked) — broadcast delivery must respect blocks
          // exactly like the REST broadcast path.
          const blocked = await isEitherUserBlocked(socket.userId, recipientId);
          if (blocked) continue;
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
          logError('[broadcast:create] Error sending to recipient:', recipErr?.message);
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
      logError('Error creating broadcast:', error);
      socket.emit('error', { message: 'Broadcast failed' });
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
      // SECURITY (1.2): a broadcast list (incl. its recipients) is private to
      // its creator — acknowledge only the creator, never broadcast globally.
      socket.emit('broadcast_list:created', broadcastList.toObject ? broadcastList.toObject() : JSON.parse(JSON.stringify(broadcastList)));
    } catch (error) {
      logError('Error creating broadcast list:', error);
    }
  });

  socket.on('create_custom_role', async (data) => {
    try {
      const { chatId, roleName, permissions } = data;
      const conversation = await Conversation.findById(chatId);
      // SECURITY (2.5): only group admins may create roles.
      if (!conversation || !includesId(conversation.admins, socket.userId)) {
        return socket.emit('error', { message: 'Only admins can create roles' });
      }
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
      logError('Error creating custom role:', error);
    }
  });

  // Assign role handler
  socket.on('assign_role', async (data) => {
    try {
      const { chatId, userId, roleId } = data;
      const conversation = await Conversation.findById(chatId);
      // SECURITY (2.5): only group admins may assign roles.
      if (!conversation || !includesId(conversation.admins, socket.userId)) {
        return socket.emit('error', { message: 'Only admins can assign roles' });
      }
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
      logError('Error assigning role:', error);
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
      logError('Error updating group setting:', error);
    }
  });

  // Join group handler — requires invite code; use REST /groups/:id/join for canonical flow
  socket.on('join_group', async (data) => {
    try {
      if (!socket.userId) return;
      const { chatId, inviteCode } = data;
      const conversation = await Conversation.findById(chatId).select('+groupInviteCode');
      if (!conversation || !conversation.isGroup) return;

      // SECURITY (3.3): reject expired invite codes.
      if (conversation.groupInviteCodeExpiry && new Date() > conversation.groupInviteCodeExpiry) {
        return socket.emit('error', { message: 'Invite code expired' });
      }

      // SECURITY (2.6): groups requiring admin approval must use the REST API.
      if (conversation.requireJoinApproval) {
        return socket.emit('error', { message: 'Join requires admin approval. Use REST API.' });
      }

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
      logError('Error joining group:', error);
    }
  });

  // ── Group membership events (relayed from frontend after HTTP calls) ──
  // Frontend calls HTTP API first (which persists data), then emits these
  // socket events so the change propagates in real time to all other members.

  socket.on('participant:added', async (data = {}) => {
    try {
      const { groupId, userId } = data;
      if (!groupId || !userId || !socket.userId) return;
      // SECURITY: this is a relay emitted by the frontend AFTER the HTTP
      // addParticipant persisted the change — but any connected client could
      // spoof it to broadcast a fake "was added" to a group and send
      // group:you_were_added to an arbitrary user. Only relay when the
      // emitter is allowed to add (admin or canAddMembers) AND the target is
      // actually a participant now (i.e. the HTTP add really happened).
      const conv = await Conversation.findById(groupId).select('participants admins isGroup canAddMembers');
      if (!conv?.isGroup) return;
      if (!includesId(conv.participants, socket.userId)) return;
      if (!includesId(conv.admins, socket.userId) && !conv.canAddMembers) return;
      if (!includesId(conv.participants, userId)) return;
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
      logError('[socket] participant:added error:', err.message);
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
      logError('[socket] participant:removed error:', err.message);
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
      logError('[socket] admin:added error:', err.message);
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
      logError('[socket] admin:removed error:', err.message);
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
      logError('[socket] group:left error:', err.message);
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
      logError('[socket] group:updated error:', err.message);
    }
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
    } catch (err) { logError('group:ban_member error:', err); }
  });

  // Transfer ownership notification
  socket.on('group:transfer_ownership', ({ groupId, newOwnerId } = {}) => {
    try {
      if (!groupId || !newOwnerId) return;
      io.to(String(groupId)).emit('group:ownership_transferred', {
        groupId, newOwnerId, previousOwnerId: socket.userId
      });
    } catch (err) { logError('group:transfer_ownership error:', err); }
  });

  // Approve/Reject join request notification
  socket.on('group:approve_request', ({ groupId, userId } = {}) => {
    try {
      if (!groupId || !userId) return;
      io.to(String(userId)).emit('group:join_approved', { groupId });
    } catch (err) { logError('group:approve_request error:', err); }
  });

  socket.on('group:reject_request', ({ groupId, userId, groupName } = {}) => {
    try {
      if (!groupId || !userId) return;
      io.to(String(userId)).emit('group:join_rejected', { groupId, groupName });
    } catch (err) { logError('group:reject_request error:', err); }
  });

  // New group event created notification
  socket.on('group:event_created', ({ groupId, event } = {}) => {
    try {
      if (!groupId) return;
      io.to(String(groupId)).emit('group:event_created', { groupId, event, createdBy: socket.userId });
    } catch (err) { logError('group:event_created error:', err); }
  });
};
