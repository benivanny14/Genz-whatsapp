const { logInfo, logError, logWarning, logDebug } = require('../../config/winston');

/**
 * Call / WebRTC / live-stream socket handlers.
 *
 * Extracted from backend/socket/index.js — behavior is identical, the
 * handlers just receive the shared context built in ../context.js.
 */
module.exports = function registerCallHandlers(ctx) {
  const {
    io,
    socket,
    Conversation,
    User,
    activeCalls,
    persistCallFromSocket,
    isEitherUserBlocked,
    includesId,
    onlineUsers,
    getOnlineUsers,
    sendIncomingCallNotification
  } = ctx;

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
            logError('call:start error', { message: err.message });
    }
  });

  // SECURITY (1.3): call_user used to broadcast the incoming-call signal to
  // EVERY connected socket. It now resolves the conversation, verifies both
  // parties are participants, checks blocks, and emits to the callee ONLY.
  socket.on('call_user', async (data = {}) => {
    const conversationId = data.conversationId || data.chatId;
    const calleeId = data.calleeId || data.targetUserId || data.to;
    if (!socket.userId || !calleeId) {
      return socket.emit('call:error', { message: 'Cannot call this user' });
    }

    try {
      // 1. Find the 1-to-1 conversation between caller and callee.
      const conversation = await Conversation.findOne({
        isGroup: false,
        participants: { $all: [socket.userId, calleeId], $size: 2 }
      });
      if (!conversation) {
        return socket.emit('call:error', { message: 'Cannot call this user' });
      }

      // 2. Verify both are participants.
      if (!includesId(conversation.participants, socket.userId) || !includesId(conversation.participants, calleeId)) {
        return socket.emit('call:error', { message: 'Not authorized to call this user' });
      }

      // 3. Block check (either direction).
      if (await isEitherUserBlocked(socket.userId, calleeId)) {
        return socket.emit('call:error', { message: 'Cannot call this user' });
      }

      // 4. Emit to the callee ONLY.
      const calleeSocketId = onlineUsers.get(String(calleeId));
      if (!calleeSocketId) {
        return socket.emit('call:error', { message: 'User is offline' });
      }
      io.to(calleeSocketId).emit('incoming_call_signal', {
        ...data,
        callerId: socket.userId
      });
    } catch (error) {
            logError('Error in call_user', { message: error.message });
      socket.emit('call:error', { message: 'Cannot call this user' });
    }
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

  // Start live stream handler
  socket.on('start_live_stream', async (data) => {
    try {
      const { chatId, host } = data;
      io.to(chatId).emit('live_stream:started', { chatId, host, timestamp: new Date() });
    } catch (error) {
      logError('Error starting live stream:', error);
    }
  });

  // Stop live stream handler
  socket.on('stop_live_stream', async (data) => {
    try {
      const { chatId } = data;
      // SECURITY (1.2): targeted — emit to the chat room only, not globally.
      if (chatId) {
        io.to(chatId).emit('live_stream:stopped', { chatId, timestamp: new Date() });
      }
    } catch (error) {
      logError('Error stopping live stream:', error);
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
      logError('Error sending call offer:', error);
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
            logError('Error answering WebRTC call', { message: error.message });
    }
  });

  // WebRTC Signaling: ICE candidate
  socket.on('call:ice-candidate', async (data) => {
    try {
      const { targetSocketId, targetUserId, candidate } = data;
      const resolvedSocketId = targetSocketId || onlineUsers.get(String(targetUserId));

      if (!resolvedSocketId) {
                logWarn('WebRTC ICE candidate target not found', { targetUserId, targetSocketId });
        return socket.emit('call:error', { message: 'Target user is offline' });
      }

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
      logError('Error sending ICE candidate:', error);
      socket.emit('call:error', { message: 'Failed to relay ICE candidate' });
    }
  });

  // Frontend WebRTC service emits these event names directly.
  socket.on('webrtc:offer', async (data) => {
    try {
      const { to, targetUserId, offer, callType, conversationId } = data;
      const targetId = to || targetUserId;
      // SECURITY (1.7): block check before relaying the offer.
      const isBlocked = await isEitherUserBlocked(socket.userId, targetId);
      if (isBlocked) {
        return socket.emit('call:error', { error: 'Cannot call this user' });
      }
      const targetSocketId = onlineUsers.get(String(targetId));

      if (!targetSocketId) {
                logError('WebRTC target user not found', { targetId });
        return socket.emit('call:error', { message: 'Target user is offline' });
      }

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
                    logWarn('Incoming call push notification failed', { message: notifyErr?.message });
        });
      }
    } catch (error) {
            logError('Error relaying WebRTC offer', { message: error.message });
      socket.emit('call:error', { message: error.message });
    }
  });

  socket.on('webrtc:answer', async (data) => {
    try {
      const { to, callerSocketId, answer } = data;
      const targetSocketId = callerSocketId || onlineUsers.get(String(to));
      if (!targetSocketId) {
                logError('WebRTC caller socket not found', { to, callerSocketId });
        return socket.emit('call:error', { message: 'Caller is offline' });
      }

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
            logError('Error relaying WebRTC answer', { message: error.message });
      socket.emit('call:error', { message: 'Failed to send answer' });
    }
  });

  socket.on('webrtc:ice_candidate', async (data) => {
    try {
      const { to, targetSocketId, candidate } = data;
      const relaySocketId = targetSocketId || onlineUsers.get(String(to)) || to;
      if (!relaySocketId) {
                logWarn('WebRTC ICE candidate relay target not found', { to, targetSocketId });
        return;
      }

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
      logError('Error toggling audio:', error);
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
      logError('Error toggling video:', error);
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
      logError('group_call:start error:', err);
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
      logError('group_call:join error:', err);
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
      logError('group_call:leave error:', err);
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
};
