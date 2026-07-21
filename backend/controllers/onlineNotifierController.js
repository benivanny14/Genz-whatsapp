const User = require('../models/User');
const { sendNewMessageNotification } = require('../services/notificationService');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

// POST /api/notifier/watch - Start watching a user's online status
// When the target user comes online, send a push notification
exports.watchUser = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { targetUserId } = req.body;

    if (!targetUserId) {
      return res.status(400).json({ success: false, message: 'Target user ID is required' });
    }

    const targetUser = await User.findById(targetUserId).select('_id username');
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const watcher = await User.findById(userId).select('_id username');

    // Store the watch subscription in a simple in-memory store
    if (!global.onlineWatchList) {
      global.onlineWatchList = new Map();
    }

    const targetKey = String(targetUserId);
    if (!global.onlineWatchList.has(targetKey)) {
      global.onlineWatchList.set(targetKey, new Set());
    }
    global.onlineWatchList.get(targetKey).add(String(userId));

    // Check if already online right now
    const onlineUsers = global.onlineUsers || new Map();
    const isOnline = onlineUsers.has(targetKey);

    res.json({
      success: true,
      message: `Now watching ${targetUser.username}'s online status`,
      isCurrentlyOnline: isOnline,
    });

    // If already online, notify immediately
    if (isOnline) {
      try {
        await sendNewMessageNotification(userId, {
          senderName: targetUser.username,
          text: `${targetUser.username} is online now! 📱`,
          conversationId: null,
          senderId: targetUserId,
          type: 'system',
          // Custom notification for online notifier
          isOnlineNotifier: true,
        });
      } catch (notifyErr) {
        console.warn('[OnlineNotifier] Immediate notification failed:', notifyErr?.message);
      }
    }
  } catch (error) {
    console.error('Online notifier watch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifier/unwatch - Stop watching a user
exports.unwatchUser = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { targetUserId } = req.body;

    if (global.onlineWatchList?.has(String(targetUserId))) {
      global.onlineWatchList.get(String(targetUserId)).delete(String(userId));
    }

    res.json({ success: true, message: 'Stopped watching' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/notifier/check - Check if user is online
exports.checkOnlineStatus = async (req, res) => {
  try {
    const { targetUserId } = req.body;
    const onlineUsers = global.onlineUsers || new Map();
    const isOnline = onlineUsers.has(String(targetUserId));
    
    const user = await User.findById(targetUserId).select('username lastSeen isOnline');
    
    res.json({
      success: true,
      isOnline,
      lastSeen: user?.lastSeen || null,
      username: user?.username || 'Unknown'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = exports;
