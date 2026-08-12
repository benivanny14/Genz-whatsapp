const { logInfo, logError, logWarning, logDebug } = require('../../config/winston');
const { canViewStatus } = require('../../services/privacyEngineService');


/**
 * Status (WhatsApp-style stories) socket handlers.
 *
 * Extracted from backend/socket/index.js — behavior is identical, the
 * handlers just receive the shared context built in ../context.js.
 */
module.exports = function registerStatusHandlers(ctx) {
  const {
    io,
    socket,
    Status,
    User,
    getOnlineUsers
  } = ctx;

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
        // SECURITY: also respect the status's own privacy — never push to
        // viewers the owner excluded (contacts_except / only_share_with /
        // nobody / only_me), even though the feed API hides the status from
        // them too.
        contacts.forEach(c => {
          const contactUserId = c?.user ? String(c.user) : String(c);
          if (!canViewStatus(statusObj, contactUserId, creator)) return;
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
      logError('Error creating status:', error);
    }
  });

  // Status view handler
  socket.on('status:view', async (data) => {
    try {
      const { statusId } = data;
      const status = await Status.findById(statusId);
      if (status) {
        const viewerId = String(socket.userId);
        // SECURITY: never record/relay a view from someone the owner's
        // privacy excludes — mirrors the feed API's visibility rules.
        const owner = (status.privacy === 'contacts' || status.privacy === 'contacts_except')
          ? await User.findById(status.userId).select('contacts')
          : null;
        if (!canViewStatus(status, viewerId, owner)) {
          return; // silently ignore unauthorized view attempts
        }
        const alreadyViewed = status.views.some(view => view.user?.toString() === socket.userId);
        if (!alreadyViewed) {
          // Use atomic update to avoid VersionError
          await Status.findByIdAndUpdate(
            statusId,
            {
              $push: { views: { user: socket.userId, viewedAt: new Date() } },
              $set: { viewsCount: status.views.length + 1 }
            },
            { new: true }
          );
        }
        const updatedStatus = await Status.findById(statusId);
        const statusPayload = updatedStatus.toObject ? updatedStatus.toObject() : JSON.parse(JSON.stringify(updatedStatus));
        // SECURITY (1.2): targeted — only the status owner and the viewer
        // need this update. Never emit globally.
        if (status.userId) {
          io.to(String(status.userId)).emit('status:viewed', statusPayload);
        }
        socket.emit('status:viewed', statusPayload);
      }
    } catch (error) {
      logError('Error viewing status:', error);
    }
  });

  socket.on('view_status', async (data = {}) => {
    try {
      const { statusId } = data;
      if (statusId) {
        const status = await Status.findById(statusId);
        if (status) {
          const viewerId = String(socket.userId);
          // SECURITY: ignore views from viewers the owner's privacy excludes.
          const owner = (status.privacy === 'contacts' || status.privacy === 'contacts_except')
            ? await User.findById(status.userId).select('contacts')
            : null;
          if (!canViewStatus(status, viewerId, owner)) {
            return;
          }
          if (!status.views.some(view => view.user?.toString() === socket.userId)) {
            status.views.push({ user: socket.userId, viewedAt: new Date() });
            status.viewsCount = status.views.length;
            await status.save();
          }
          // SECURITY (1.2): only the status owner is notified of the view.
          if (status.userId) {
            io.to(String(status.userId)).emit('status_view_signal', {
              ...data,
              userId: socket.userId,
              timestamp: new Date().toISOString()
            });
          }
        }
      }
    } catch (error) {
      logError('Error relaying status view:', error);
    }
  });

  socket.on('status_like', async (data = {}) => {
    try {
      const { statusId } = data;
      let liked = Boolean(data.liked);
      let likesCount = data.likesCount || 0;
      let statusOwnerId = null;
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
          statusOwnerId = status.userId ? String(status.userId) : null;
        }
      }
      const likePayload = {
        statusId,
        liked,
        likesCount,
        userId: socket.userId
      };
      // SECURITY (1.2): targeted — only the status owner is notified.
      if (statusOwnerId) {
        io.to(statusOwnerId).emit('status_liked_signal', likePayload);
      }
      socket.emit('status_liked_signal', likePayload);
    } catch (error) {
      logError('Error liking status in socket:', error);
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
      let statusOwnerId = null;
      if (statusId && content) {
        // Use atomic update to avoid VersionError
        const updated = await Status.findByIdAndUpdate(
          statusId,
          { $push: { replies: reply } },
          { new: true }
        );
        if (updated && updated.userId) {
          statusOwnerId = String(updated.userId);
        }
      }
      const commentPayload = {
        statusId,
        ...reply,
        timestamp: reply.createdAt.toISOString()
      };
      // SECURITY (1.2): targeted — only the status owner is notified.
      if (statusOwnerId) {
        io.to(statusOwnerId).emit('status_comment_signal', commentPayload);
      }
      socket.emit('status_comment_signal', commentPayload);
    } catch (error) {
      logError('Error commenting on status in socket:', error);
    }
  });

  socket.on('update_status', async (data) => {
    try {
      const { statusId, updates } = data;
      const status = await Status.findById(statusId);
      // SECURITY (2.4): only the status owner may update it.
      if (!status) return;
      if (String(status.userId) !== String(socket.userId)) {
        return socket.emit('error', { message: 'Not authorized to update this status' });
      }
      Object.assign(status, updates);
      await status.save();
      // SECURITY (1.2): targeted — only the owner needs this update.
      io.to(String(status.userId)).emit('status:updated', status.toObject ? status.toObject() : JSON.parse(JSON.stringify(status)));
    } catch (error) {
      logError('Error updating status:', error);
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
      // SECURITY (1.2): targeted — notify the owner's contacts (mirrors how
      // status:create delivers), never the whole server.
      const creator = await User.findById(socket.userId).select('contacts');
      const contacts = creator?.contacts || [];
      contacts.forEach(c => {
        const contactUserId = c?.user ? String(c.user) : String(c);
        const sid = getOnlineUsers().get(contactUserId);
        if (sid) io.to(sid).emit('status:deleted', { statusId: String(statusId), userId: String(socket.userId) });
      });
      socket.emit('status:deleted', { statusId: String(statusId), userId: String(socket.userId) });
    } catch (error) {
      logError('Error deleting status via socket:', error);
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
      logError('[socket] status_reply error:', err.message);
    }
  });
};
