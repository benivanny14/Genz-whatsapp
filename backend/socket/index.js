/**
 * Socket.IO entry point.
 *
 * This file owns the connection lifecycle (auth join, rooms, rate limiting,
 * disconnect cleanup) and wires the feature handler modules:
 *   - handlers/messageHandlers.js      → messages, reactions, typing, polls…
 *   - handlers/callHandlers.js         → calls, WebRTC signaling, live streams
 *   - handlers/groupHandlers.js        → groups, roles, broadcasts, members
 *   - handlers/statusHandlers.js       → WhatsApp-style statuses
 *   - handlers/conversationHandlers.js → block/archive/mute/lock, presence,
 *                                        privacy sync, auto-reply, backup
 * Shared models/state/helpers are built once per connection in ./context.js
 * and passed to every handler module, so behavior is identical to the
 * previous single-file implementation.
 */
const { createContext, SOCKET_SETUP_FLAG } = require('./context');
const registerMessageHandlers = require('./handlers/messageHandlers');
const registerCallHandlers = require('./handlers/callHandlers');
const registerGroupHandlers = require('./handlers/groupHandlers');
const registerStatusHandlers = require('./handlers/statusHandlers');
const registerConversationHandlers = require('./handlers/conversationHandlers');
const { logInfo, logError, logWarning, logDebug } = require('../config/winston');
const {
  getContactId,
  isExcluded,
  resolveOnlineSetting
} = require('../services/privacyEngineService');



const setupSocket = (io) => {
  if (io[SOCKET_SETUP_FLAG]) {
    return;
  }
  io[SOCKET_SETUP_FLAG] = true;

  io.on('connection', (socket) => {
        logDebug('User connected', { socketId: socket.id });

    // ── Per-socket rate limiting (P1-5) ───────────────────────────────────
    // Sliding-window limiter applied to every inbound event. Prevents a
    // single hijacked/faulty client from flooding the event loop. Exceeding
    // the window disconnects the socket.
    const RATE_LIMIT_WINDOW_MS = 10000; // 10 seconds
    const RATE_LIMIT_MAX_EVENTS = 120; // 120 events per window
    const eventTimestamps = [];
    const isRateLimited = () => {
      const now = Date.now();
      while (eventTimestamps.length && now - eventTimestamps[0] > RATE_LIMIT_WINDOW_MS) {
        eventTimestamps.shift();
      }
      eventTimestamps.push(now);
      return eventTimestamps.length > RATE_LIMIT_MAX_EVENTS;
    };

    // ── Global socket error protection ────────────────────────────────────
    // Override socket.on to automatically wrap handlers with try-catch
    const _originalOn = socket.on.bind(socket);
    socket.on = function(event, handler) {
      if (typeof handler !== 'function') return _originalOn(event, handler);
      const safeHandler = async (...args) => {
        if (isRateLimited()) {
                    logWarning('Socket rate limit exceeded, disconnecting', {
            socketId: socket.id,
            userId: socket.userId,
            event
          });
          socket.emit('error', { message: 'Too many requests. Try again shortly.', event });
          socket.disconnect(true);
          return;
        }
        try {
          await handler(...args);
        } catch (err) {
          logError(`[Socket] Unhandled error in "${event}" handler:`, err?.message || err);
          socket.emit('error', { message: 'Server error processing your request', event });
        }
      };
      return _originalOn(event, safeHandler);
    };

    // Handle reconnection
    socket.on('reconnect_attempt', () => {
            logDebug('Reconnection attempt', { socketId: socket.id });
    });

    socket.on('error', (error) => {
            logError('Socket error', { message: error.message, socketId: socket.id });
    });

    socket.on('user:join', async (userId) => {
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

      // Share online state with other instances (no-op without Redis).
      presenceStore.setLocalPresence(userKey, { online: true, away: false });

      try {
        const user = await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() }, { new: true }).select('settings contacts');

        const privacySettings = user?.settings?.privacy || {};
        const onlineSetting = resolveOnlineSetting(privacySettings);

        if (onlineSetting === 'nobody') {
          // Do not broadcast
        } else if (onlineSetting === 'contacts' || onlineSetting === 'contacts_except') {
          // SECURITY: contacts are { user, savedName } subdocs — extract the
          // nested id (String(subdoc) would be "[object Object]"), and for
          // contacts_except skip anyone on the owner's exclusion list
          // (presence follows the last-seen rules + its exclusions).
          const contacts = user?.contacts || [];
          for (const contact of contacts) {
            const contactId = getContactId(contact);
            if (!contactId) continue;
            const contactIdStr = String(contactId);
            if (onlineSetting === 'contacts_except' && await isExcluded(user._id, 'last_seen', contactIdStr)) {
              continue;
            }
            const recipientSocketId = onlineUsers.get(contactIdStr);
            if (recipientSocketId) {
              io.to(recipientSocketId).emit('user:online', { userId });
            }
          }
        } else {
          socket.broadcast.emit('user:online', { userId });
        }
      } catch (error) {
        logError('Error updating user online status:', error);
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
                logDebug('User joined conversation', { userId: socket.userId, conversationId });
      } catch (error) {
                logError('Error joining conversation room', { message: error.message, userId: socket.userId, conversationId });
        socket.emit('error', { message: 'Failed to join conversation' });
      }
    });

    socket.on('leave:conversation', (conversationId) => {
      socket.leave(conversationId);
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
        logError('Error joining channel room:', error.message);
      }
    });

    socket.on('leave:channel', (channelId) => {
      if (!channelId) return;
      socket.leave(`channel:${channelId}`);
    });

    // ── Feature handlers (split into modules, see header comment) ─────────
    const ctx = createContext(io, socket);
    registerMessageHandlers(ctx);
    registerCallHandlers(ctx);
    registerGroupHandlers(ctx);
    registerStatusHandlers(ctx);
    registerConversationHandlers(ctx);

    const {
      Conversation,
      User,
      activeCalls,
      onlineUsers,
      userAwayStatus,
      socketToUser,
      isUserStillOnline,
      presenceStore,
      includesId
    } = ctx;

    socket.on('disconnect', async () => {
      logInfo('User disconnected:', socket.id);

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
        logError('Error cleaning up active calls on disconnect:', err);
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
        logError('Error clearing typing state on disconnect:', err);
      }

      // Clean up presence/away tracking for this user.
      if (disconnectedUserId) {
        userAwayStatus.delete(String(disconnectedUserId));
      }

      // FIX: presenceStore.removeLocalPresence must run BEFORE the
      // isUserStillOnline check — the check consults sharedPresence, so a
      // stale "online" entry there meant the whole offline broadcast below
      // was skipped and user:offline never reached anyone.
      if (disconnectedUserId) {
        presenceStore.removeLocalPresence(disconnectedUserId);
      }

      if (disconnectedUserId && !isUserStillOnline(disconnectedUserId)) {
        onlineUsers.delete(disconnectedUserId);

        try {
          await User.findByIdAndUpdate(disconnectedUserId, {
            isOnline: false,
            lastSeen: new Date()
          });

          // SECURITY (1.2): mirror the online broadcast — respect the user's
          // privacy setting for who may see their presence.
          const offlineUser = await User.findById(disconnectedUserId).select('settings contacts').lean();
          const privacySettings = offlineUser?.settings?.privacy || {};
          const onlineSetting = resolveOnlineSetting(privacySettings);
          const offlinePayload = { userId: disconnectedUserId, lastSeen: new Date().toISOString() };
          if (onlineSetting === 'nobody') {
            // Do not broadcast
          } else if (onlineSetting === 'contacts' || onlineSetting === 'contacts_except') {
            // SECURITY: skip excluded contacts for contacts_except (presence
            // follows the last-seen exclusion list).
            const contacts = offlineUser?.contacts || [];
            for (const c of contacts) {
              const contactUserId = getContactId(c);
              if (!contactUserId) continue;
              const contactIdStr = String(contactUserId);
              if (onlineSetting === 'contacts_except' && await isExcluded(disconnectedUserId, 'last_seen', contactIdStr)) {
                continue;
              }
              const sid = onlineUsers.get(contactIdStr);
              if (sid) io.to(sid).emit('user:offline', offlinePayload);
            }
          } else {
            socket.broadcast.emit('user:offline', offlinePayload);
          }
        } catch (error) {
          logError('Error updating user offline status:', error);
        }
      }
    });

    socket.on('disconnecting', (reason) => {
      try {
        logInfo('User disconnecting:', socket.id, 'reason:', reason);
        // Leave all rooms before disconnect
        const rooms = socket.rooms;
        for (const room of rooms) {
          if (room !== socket.id) {
            socket.leave(room);
          }
        }
      } catch (err) { logError('disconnecting handler error:', err); }
    });

    // Handle connection errors gracefully
    socket.on('connect_error', (error) => {
      try {
        logError('Socket connection error:', error);
        socket.emit('error', { message: 'Connection error occurred' });
      } catch (err) { logError('connect_error handler error:', err); }
    });
  });
};

module.exports = setupSocket;
