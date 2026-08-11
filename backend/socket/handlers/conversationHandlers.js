/**
 * Conversation/account utility socket handlers (block, archive, mute, lock,
 * pin, presence, privacy sync, auto-reply, backup, profile visits).
 *
 * Extracted from backend/socket/index.js — behavior is identical, the
 * handlers just receive the shared context built in ../context.js.
 */
module.exports = function registerConversationHandlers(ctx) {
  const {
    io,
    socket,
    Conversation,
    User,
    onlineUsers,
    userAwayStatus,
    presenceStore,
    includesId,
    getMapValue,
    setMapValue,
    deleteMapValue
  } = ctx;

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
  // NOTE: the frontend already persists this via the REST endpoint
  // (POST /chat/users/:id/block) before emitting this event — this
  // handler used to redundantly re-fetch and re-save the user document,
  // which raced with the REST write on the exact same field and could
  // let a fast block→unblock sequence silently overwrite each other.
  // It now only relays the realtime notification.
  socket.on('block_user', async (data) => {
    try {
      if (!socket.userId) return;
      const { userId } = data;
      if (!userId) return;
      // SECURITY (1.2): notify only the blocker and the target user.
      const payload = { blockerId: socket.userId, userId };
      io.to(String(socket.userId)).emit('user:blocked', payload);
      io.to(String(userId)).emit('user:blocked', payload);
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  });

  // Unblock user handler (see note on block_user above)
  socket.on('unblock_user', async (data) => {
    try {
      if (!socket.userId) return;
      const { userId } = data;
      if (!userId) return;
      // SECURITY (1.2): notify only the blocker and the target user.
      const payload = { blockerId: socket.userId, userId };
      io.to(String(socket.userId)).emit('user:unblocked', payload);
      io.to(String(userId)).emit('user:unblocked', payload);
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

  socket.on('user_online', async () => {
    try {
      if (!socket.userId) return;
      const user = await User.findById(socket.userId).select('username settings contacts');
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
      // SECURITY (1.2): respect privacy settings for the online broadcast.
      const privacySettings = user?.settings?.privacy || {};
      const onlineSetting = privacySettings.online === 'same_as_last_seen'
        ? privacySettings.lastSeen
        : privacySettings.online;
      const payload = { userId: socket.userId, username: user?.username };
      if (onlineSetting === 'nobody') {
        // Do not broadcast
      } else if (onlineSetting === 'contacts' || onlineSetting === 'contacts_except') {
        const contacts = user?.contacts || [];
        contacts.forEach(contact => {
          const contactUserId = contact?.user ? String(contact.user) : String(contact);
          const recipientSocketId = onlineUsers.get(contactUserId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('user:online', payload);
          }
        });
      } else {
        socket.broadcast.emit('user:online', payload);
      }
    } catch (error) {
      console.error('Error setting user online:', error);
    }
  });

  // Visit profile handler
  socket.on('visit_profile', async (data) => {
    try {
      const { visitedUserId, visitorName } = data;
      if (!visitedUserId || !socket.userId || String(visitedUserId) === String(socket.userId)) return;

      // SECURITY (3.7): only record visits when the target user opted in.
      const targetUser = await User.findById(visitedUserId).select('settings').lean();
      if (!targetUser?.settings?.privacy?.trackProfileVisitors) return;

      // SECURITY: never trust a client-supplied visitorId — always use the
      // authenticated socket user.
      const visitorId = socket.userId;
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
      presenceStore.setLocalPresence(String(socket.userId), { online: true, away: status === 'away' });

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

  // Start backup handler — runs the real encrypted backup via
  // backupController.runBackup (was previously a fake progress simulation).
  socket.on('start_backup', async (data) => {
    try {
      const userId = socket.userId || (data && data.userId);
      if (!userId) {
        return socket.emit('backup:error', { message: 'User not authenticated' });
      }

      const { runBackup } = require('../../controllers/backupController');
      const result = await runBackup(userId, ({ phase, progress, metadata, backupId, storage }) => {
        if (phase === 'start') {
          socket.emit('backup:started', { timestamp: new Date(), progress: 0 });
        } else if (phase === 'encrypting') {
          socket.emit('backup:progress', { progress: progress || 50, metadata });
        } else if (phase === 'completed') {
          socket.emit('backup:progress', { progress: 100 });
          socket.emit('backup:completed', {
            timestamp: new Date(),
            backupId,
            storage,
            message: 'Backup completed successfully'
          });
        }
      });

      return result;
    } catch (error) {
      console.error('Error starting backup:', error);
      socket.emit('backup:error', { message: 'Failed to create backup', error: error.message });
    }
  });

  // Privacy settings changed - broadcast to all user's connected devices
  socket.on('privacy:settings_changed', async ({ privacyType, newValue } = {}) => {
    try {
      if (!socket.userId || !privacyType) return;

      // Broadcast to all user's connected sessions
      io.to(String(socket.userId)).emit('privacy:settings_updated', {
        userId: socket.userId,
        privacyType,
        newValue,
        timestamp: new Date().toISOString()
      });
    } catch (err) { console.error('privacy:settings_changed error:', err); }
  });

  // Excluded contacts changed - broadcast to all user's connected devices
  socket.on('privacy:excluded_changed', async ({ privacyType, excludedContacts } = {}) => {
    try {
      if (!socket.userId || !privacyType) return;

      // Broadcast to all user's connected sessions
      io.to(String(socket.userId)).emit('privacy:excluded_updated', {
        userId: socket.userId,
        privacyType,
        excludedContacts,
        timestamp: new Date().toISOString()
      });
    } catch (err) { console.error('privacy:excluded_changed error:', err); }
  });

  // Allowed contacts changed - broadcast to all user's connected devices
  socket.on('privacy:allowed_changed', async ({ privacyType, allowedContacts } = {}) => {
    try {
      if (!socket.userId || !privacyType) return;

      // Broadcast to all user's connected sessions
      io.to(String(socket.userId)).emit('privacy:allowed_updated', {
        userId: socket.userId,
        privacyType,
        allowedContacts,
        timestamp: new Date().toISOString()
      });
    } catch (err) { console.error('privacy:allowed_changed error:', err); }
  });
};
