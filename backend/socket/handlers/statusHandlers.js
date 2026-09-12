const Status = require('../../models/Status');
const User = require('../../models/User');
const { logInfo, logError } = require('../../config/winston');
const mongoose = require('mongoose');

/**
 * Clean status socket handlers.
 * Handles real-time status operations: create, view, delete, reply, react, mute.
 * Real-time status CRUD is managed via secure REST endpoints in routes/status.js.
 * Socket handlers here deal only with real-time status reply fallbacks.
 */
module.exports = function registerStatusHandlers(ctx) {
  const { io, socket, getOnlineUsers } = ctx;

  // ── Status Created ──
  socket.on('status:create', async (data) => {
    try {
      const { type, content, caption, textStatus, music, privacy, excludedUsers, includedUsers, duration, clientStatusId, poll } = data;

      const user = await User.findById(socket.userId).select('username contacts');
      if (!user) return;

      // Validate privacy
      const allowedPrivacy = ['contacts', 'everyone', 'contacts_except', 'only_share_with'];
      const safePrivacy = allowedPrivacy.includes(privacy) ? privacy : 'contacts';

      const statusData = {
        userId: socket.userId,
        type: type || 'text',
        content: content || '',
        caption: caption || '',
        textStatus,
        music,
        privacy: safePrivacy,
        excludedUsers: excludedUsers || [],
        includedUsers: includedUsers || [],
        duration: duration || 0,
        isPublished: true
      };

      // Include poll data if provided
      if (poll && poll.question && Array.isArray(poll.options) && poll.options.length >= 2) {
        statusData.poll = {
          question: poll.question,
          options: poll.options.map((opt, i) => ({
            id: `opt_${Date.now()}_${i}`,
            text: typeof opt === 'string' ? opt : opt.text || '',
            votes: 0
          })),
          allowMultiple: poll.allowMultiple || false,
          expiresAt: poll.expiresAt || null,
          totalVotes: 0,
          voters: []
        };
      }

      const status = await Status.create(statusData);

      const populated = await Status.findById(status._id)
        .populate('userId', 'username profilePicture');

      const statusObj = populated.toObject();
      if (clientStatusId) statusObj.clientStatusId = clientStatusId;

      // Broadcast to online contacts
      const contacts = user.contacts || [];
      for (const contact of contacts) {
        const contactId = contact?.user ? String(contact.user) : String(contact);
        const sid = getOnlineUsers().get(contactId);
        if (sid) io.to(sid).emit('status:created', statusObj);
      }

      // Also emit to sender
      socket.emit('status:created', statusObj);

      // Notify admin rooms so the dashboard shows live status creation
      io.to('role:admin').to('admin-room').emit('admin:status_created', {
        type: 'status_created',
        statusId: status._id,
        username: user.username,
        statusType: type || 'text',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logError('Error creating status:', error);
    }
  });

  // ── Status Viewed ──
  socket.on('status:view', async (data) => {
    try {
      const { statusId } = data;
      if (!statusId) return;

      if (!mongoose.Types.ObjectId.isValid(statusId)) {
        return socket.emit('error', { message: 'Invalid status ID' });
      }

      const status = await Status.findById(statusId);
      if (!status) return;

      // Check if deleted
      if (status.isDeleted || status.isRevoked) return;

      // Check privacy — only contacts can see contact-only statuses
      if (status.privacy === 'contacts') {
        const owner = await User.findById(status.userId).select('contacts');
        const isContact = (owner?.contacts || []).some(c => {
          const cid = c?.user ? String(c.user) : String(c);
          return cid === String(socket.userId);
        });
        if (!isContact && String(status.userId) !== String(socket.userId)) return;
      }

      // Check if muted
      const alreadyMuted = status.mutedBy?.some(id => String(id) === String(socket.userId));
      if (alreadyMuted) return;

      const alreadyViewed = status.views?.some(
        v => String(v.userId) === String(socket.userId)
      );

      if (!alreadyViewed) {
        status.views.push({ userId: socket.userId });
        status.viewCount = status.views.length;
        await status.save();
      }

      const updated = await Status.findById(statusId)
        .populate('userId', 'username profilePicture');

      // Notify status owner
      const ownerId = String(updated.userId?._id || updated.userId);
      const ownerSid = getOnlineUsers().get(ownerId);
      if (ownerSid) {
        io.to(ownerSid).emit('status:viewed', {
          statusId,
          viewCount: updated.viewCount,
          viewerId: socket.userId
        });
      }

      // Notify the viewer
      socket.emit('status:viewed', {
        statusId,
        viewCount: updated.viewCount,
        viewerId: socket.userId
      });
    } catch (error) {
      logError('Error viewing status:', error);
    }
  });

  // ── Status Deleted (soft delete) ──
  socket.on('status:delete', async (data) => {
    try {
      const { statusId } = data;
      if (!statusId) return;

      if (!mongoose.Types.ObjectId.isValid(statusId)) {
        return socket.emit('error', { message: 'Invalid status ID' });
      }

      const status = await Status.findById(statusId);
      if (!status) return;

      if (String(status.userId) !== String(socket.userId)) {
        return socket.emit('error', { message: 'Not authorized to delete this status' });
      }

      // Soft delete — mark as deleted but keep for anti-revoke
      status.isDeleted = true;
      status.isRevoked = true;
      status.deletedAt = new Date();
      await status.save();

      // Notify contacts
      const user = await User.findById(socket.userId).select('contacts');
      const contacts = user?.contacts || [];

      for (const contact of contacts) {
        const contactId = contact?.user ? String(contact.user) : String(contact);
        const sid = getOnlineUsers().get(contactId);
        if (sid) io.to(sid).emit('status:deleted', { statusId, userId: String(socket.userId) });
      }

      socket.emit('status:deleted', { statusId, userId: String(socket.userId) });
    } catch (error) {
      logError('Error deleting status:', error);
    }
  });

  // ── Reply to Status ──
  socket.on('reply_to_status', async (data) => {
    try {
      const { statusId, ownerId, senderId, message } = data;
      if (!statusId || !message) return;

      if (!mongoose.Types.ObjectId.isValid(statusId)) {
        return socket.emit('error', { message: 'Invalid status ID' });
      }

      const status = await Status.findById(statusId);
      if (!status) return;

      // Check reply settings
      if (status.replySettings === 'none') {
        return socket.emit('error', { message: 'Replies are disabled for this status' });
      }
      if (status.replySettings === 'contacts') {
        const owner = await User.findById(status.userId).select('contacts');
        const isContact = (owner?.contacts || []).some(c => {
          const cid = c?.user ? String(c.user) : String(c);
          return cid === String(socket.userId);
        });
        if (!isContact && String(status.userId) !== String(socket.userId)) {
          return socket.emit('error', { message: 'Only contacts can reply to this status' });
        }
      }

      const sender = await User.findById(socket.userId).select('username profilePicture');

      const reply = {
        senderId: socket.userId,
        message,
        createdAt: new Date()
      };

      // Store reply in status
      await Status.findByIdAndUpdate(statusId, {
        $push: { replies: reply }
      });

      // Send to status owner
      const ownerSid = getOnlineUsers().get(String(ownerId));
      if (ownerSid) {
        io.to(ownerSid).emit('status:reply_received', {
          statusId,
          senderId: socket.userId,
          senderName: sender?.username,
          senderAvatar: sender?.profilePicture,
          message,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      logError('Error replying to status:', error);
    }
  });

  // ── React to Status ──
  socket.on('status:react', async (data) => {
    try {
      const { statusId, emoji } = data;
      if (!statusId || !emoji) return;

      const status = await Status.findById(statusId);
      if (!status) return;

      // Toggle reaction
      const existingIdx = status.reactions.findIndex(
        r => String(r.userId) === String(socket.userId) && r.emoji === emoji
      );

      if (existingIdx >= 0) {
        status.reactions.splice(existingIdx, 1);
      } else {
        status.reactions = status.reactions.filter(
          r => String(r.userId) !== String(socket.userId)
        );
        status.reactions.push({ userId: socket.userId, emoji });
      }

      await status.save();

      // Notify status owner
      const ownerId = String(status.userId);
      const ownerSid = getOnlineUsers().get(ownerId);
      const payload = { statusId, emoji, reactions: status.reactions, userId: socket.userId };

      if (ownerSid) io.to(ownerSid).emit('status:reacted', payload);
      socket.emit('status:reacted', payload);
    } catch (error) {
      logError('Error reacting to status:', error);
    }
  });

  // ── Mute Status User ──
  socket.on('status:mute', async (data) => {
    try {
      const { statusId } = data;
      if (!statusId) return;

      const status = await Status.findById(statusId);
      if (!status) return;

      const alreadyMuted = status.mutedBy?.some(id => String(id) === String(socket.userId));
      if (!alreadyMuted) {
        status.mutedBy.push(socket.userId);
        await status.save();
      }

      socket.emit('status:muted', { statusId, muted: true });
    } catch (error) {
      logError('Error muting status:', error);
    }
  });

  // ── Unmute Status User ──
  socket.on('status:unmute', async (data) => {
    try {
      const { statusId } = data;
      if (!statusId) return;

      const status = await Status.findById(statusId);
      if (!status) return;

      status.mutedBy = (status.mutedBy || []).filter(id => String(id) !== String(socket.userId));
      await status.save();

      socket.emit('status:muted', { statusId, muted: false });
    } catch (error) {
      logError('Error unmuting status:', error);
    }
  });
};
