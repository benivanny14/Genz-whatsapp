const Status = require('../../models/Status');
const User = require('../../models/User');
const { logError } = require('../../config/winston');

/**
 * Clean status socket handlers.
 * Real-time status CRUD is managed via secure REST endpoints in routes/status.js.
 * Socket handlers here deal only with real-time status reply fallbacks.
 */
module.exports = function registerStatusHandlers(ctx) {
  const { io, socket, getOnlineUsers } = ctx;

  // ── Reply to Status ──
  socket.on('reply_to_status', async (data) => {
    try {
      const { statusId, ownerId, senderId, message } = data;
      if (!statusId || !message) return;

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
};
