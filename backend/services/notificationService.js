const { 
  sendNotification, 
  sendMulticastNotification, 
  sendTopicNotification,
  subscribeToTopic,
  unsubscribeFromTopic,
  isConfigured: isFirebaseConfigured
} = require('../config/firebase');
const User = require('../models/User');
const webPushService = require('./webPushService');

/**
 * Notification Service
 * Handles all push notification operations using Firebase Cloud Messaging
 */

/**
 * Send notification to a specific user
 * @param {string} userId - User ID to send notification to
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload
 * @returns {Promise<Object>} Send result
 */
const sendToUser = async (userId, notification, data = {}) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const delivery = [];

    if (isFirebaseConfigured() && user.fcmTokens && user.fcmTokens.length > 0) {
      const result = await sendMulticastNotification(user.fcmTokens, notification, data);
      delivery.push({ provider: 'firebase', ...result });

      if (result.invalidTokens && result.invalidTokens.length > 0) {
        await User.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { $in: result.invalidTokens } }
        });
        console.log(`[NotificationService] Removed ${result.invalidTokens.length} invalid tokens for user ${userId}`);
      }
    } else {
      delivery.push({
        provider: 'firebase',
        success: false,
        error: isFirebaseConfigured() ? 'No FCM tokens' : 'Firebase not configured'
      });
    }

    delivery.push(await webPushService.sendToUser(userId, notification, data));

    return {
      success: delivery.some((item) => item.success),
      delivery
    };
  } catch (error) {
    console.error('[NotificationService] Failed to send notification to user:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send notification to multiple users
 * @param {Array<string>} userIds - Array of user IDs
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload
 * @returns {Promise<Object>} Send result
 */
const sendToUsers = async (userIds, notification, data = {}) => {
  try {
    const users = await User.find({ _id: { $in: userIds } });
    const allTokens = [];
    const tokenToUserIdMap = new Map();

    users.forEach(user => {
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        user.fcmTokens.forEach(token => {
          allTokens.push(token);
          tokenToUserIdMap.set(token, user._id);
        });
      }
    });

    const delivery = [];

    if (isFirebaseConfigured() && allTokens.length > 0) {
      const result = await sendMulticastNotification(allTokens, notification, data);
      delivery.push({ provider: 'firebase', ...result });

      if (result.invalidTokens && result.invalidTokens.length > 0) {
        const userIdsToUpdate = new Set();
        result.invalidTokens.forEach(token => {
          const userId = tokenToUserIdMap.get(token);
          if (userId) {
            userIdsToUpdate.add(userId);
          }
        });

        for (const userId of userIdsToUpdate) {
          await User.findByIdAndUpdate(userId, {
            $pull: { fcmTokens: { $in: result.invalidTokens } }
          });
        }
        console.log(`[NotificationService] Removed invalid tokens for ${userIdsToUpdate.size} users`);
      }
    } else {
      delivery.push({
        provider: 'firebase',
        success: false,
        error: isFirebaseConfigured() ? 'No FCM tokens found' : 'Firebase not configured'
      });
    }

    delivery.push(await webPushService.sendToUsers(userIds, notification, data));

    return {
      success: delivery.some((item) => item.success),
      delivery
    };
  } catch (error) {
    console.error('[NotificationService] Failed to send notification to users:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send new message notification
 * @param {string} userId - Recipient user ID
 * @param {Object} messageData - Message data
 * @returns {Promise<Object>} Send result
 */
const sendNewMessageNotification = async (userId, messageData) => {
  const notification = {
    title: messageData.senderName || 'New Message',
    body: messageData.text || 'New message received',
    type: 'message',
    clickAction: `/chat?conversationId=${messageData.conversationId}`,
    tag: `message-${messageData.conversationId}`,
    priority: 'high'
  };

  const data = {
    conversationId: messageData.conversationId,
    senderId: messageData.senderId,
    messageType: messageData.type || 'text'
  };

  return sendToUser(userId, notification, data);
};

/**
 * Send missed call notification
 * @param {string} userId - Recipient user ID
 * @param {Object} callData - Call data
 * @returns {Promise<Object>} Send result
 */
const sendMissedCallNotification = async (userId, callData) => {
  const notification = {
    title: 'Missed Call',
    body: `${callData.callerName || 'Unknown'} tried to call you`,
    type: 'missed_call',
    clickAction: '/calls',
    tag: `call-${callData.callId}`,
    priority: 'high'
  };

  const data = {
    callId: callData.callId,
    callerId: callData.callerId,
    callType: callData.callType || 'audio'
  };

  return sendToUser(userId, notification, data);
};

/**
 * Send incoming call notification
 * @param {string} userId - Recipient user ID
 * @param {Object} callData - Call data
 * @returns {Promise<Object>} Send result
 */
const sendIncomingCallNotification = async (userId, callData) => {
  const notification = {
    title: `${callData.callerName || 'Incoming Call'}`,
    body: callData.callType === 'video' ? 'Video call' : 'Audio call',
    type: 'incoming_call',
    clickAction: callData.conversationId ? `/chat?conversationId=${callData.conversationId}` : '/calls',
    tag: `call-${callData.callId}`,
    priority: 'high',
    sound: 'ringtone'
  };

  const data = {
    callId: callData.callId,
    callerId: callData.callerId,
    conversationId: callData.conversationId,
    callType: callData.callType || 'audio',
    offer: callData.offer
  };

  return sendToUser(userId, notification, data);
};

/**
 * Send new status notification
 * @param {string} userId - Recipient user ID
 * @param {Object} statusData - Status data
 * @returns {Promise<Object>} Send result
 */
const sendNewStatusNotification = async (userId, statusData) => {
  const notification = {
    title: `${statusData.userName || 'Contact'} added a status`,
    body: 'Tap to view',
    type: 'status',
    clickAction: '/status',
    tag: `status-${statusData.statusId}`,
    priority: 'normal'
  };

  const data = {
    statusId: statusData.statusId,
    userId: statusData.userId,
    statusType: statusData.type || 'image'
  };

  return sendToUser(userId, notification, data);
};

/**
 * Send mention notification
 * @param {string} userId - Recipient user ID
 * @param {Object} mentionData - Mention data
 * @returns {Promise<Object>} Send result
 */
const sendMentionNotification = async (userId, mentionData) => {
  const notification = {
    title: `${mentionData.mentionerName} mentioned you`,
    body: mentionData.text || 'You were mentioned in a message',
    type: 'mention',
    clickAction: `/chat?conversationId=${mentionData.conversationId}`,
    tag: `mention-${mentionData.messageId}`,
    priority: 'high'
  };

  const data = {
    conversationId: mentionData.conversationId,
    messageId: mentionData.messageId,
    mentionerId: mentionData.mentionerId
  };

  return sendToUser(userId, notification, data);
};

/**
 * Send group notification
 * @param {string} groupId - Group ID
 * @param {Array<string>} userIds - User IDs to notify (excluding sender)
 * @param {Object} groupData - Group data
 * @returns {Promise<Object>} Send result
 */
const sendGroupNotification = async (groupId, userIds, groupData) => {
  const notification = {
    title: groupData.groupName || 'Group Message',
    body: `${groupData.senderName}: ${groupData.text || 'New message'}`,
    type: 'group_message',
    clickAction: `/chat?conversationId=${groupId}`,
    tag: `group-${groupId}`,
    priority: 'normal'
  };

  const data = {
    groupId: groupId,
    senderId: groupData.senderId,
    messageType: groupData.type || 'text'
  };

  return sendToUsers(userIds, notification, data);
};

/**
 * Register FCM token for a user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @returns {Promise<Object>} Registration result
 */
const registerToken = async (userId, token) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Add token if not already present
    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }

    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
      await user.save();
      console.log(`[NotificationService] Registered FCM token for user ${userId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Failed to register token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unregister FCM token for a user
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @returns {Promise<Object>} Unregistration result
 */
const unregisterToken = async (userId, token) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.fcmTokens && user.fcmTokens.includes(token)) {
      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      await user.save();
      console.log(`[NotificationService] Unregistered FCM token for user ${userId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Failed to unregister token:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe user to a topic
 * @param {string} userId - User ID
 * @param {string} topic - Topic name
 * @returns {Promise<Object>} Subscribe result
 */
const subscribeUserToTopic = async (userId, topic) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: false, error: 'No FCM tokens' };
    }

    // Subscribe all tokens to the topic
    let successCount = 0;
    for (const token of user.fcmTokens) {
      const result = await subscribeToTopic(token, topic);
      if (result.success) {
        successCount++;
      }
    }

    console.log(`[NotificationService] Subscribed user ${userId} to topic ${topic} (${successCount}/${user.fcmTokens.length} tokens)`);

    return { success: successCount > 0, successCount };
  } catch (error) {
    console.error('[NotificationService] Failed to subscribe to topic:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unsubscribe user from a topic
 * @param {string} userId - User ID
 * @param {string} topic - Topic name
 * @returns {Promise<Object>} Unsubscribe result
 */
const unsubscribeUserFromTopic = async (userId, topic) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.fcmTokens || user.fcmTokens.length === 0) {
      return { success: false, error: 'No FCM tokens' };
    }

    // Unsubscribe all tokens from the topic
    let successCount = 0;
    for (const token of user.fcmTokens) {
      const result = await unsubscribeFromTopic(token, topic);
      if (result.success) {
        successCount++;
      }
    }

    console.log(`[NotificationService] Unsubscribed user ${userId} from topic ${topic} (${successCount}/${user.fcmTokens.length} tokens)`);

    return { success: successCount > 0, successCount };
  } catch (error) {
    console.error('[NotificationService] Failed to unsubscribe from topic:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send broadcast notification to all users (admin only)
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload
 * @returns {Promise<Object>} Send result
 */
const sendBroadcastNotification = async (notification, data = {}) => {
  try {
    const delivery = [];

    if (isFirebaseConfigured()) {
      delivery.push({ provider: 'firebase', ...(await sendTopicNotification('all-users', notification, data)) });
    } else {
      delivery.push({ provider: 'firebase', success: false, error: 'Firebase not configured' });
    }

    delivery.push(await webPushService.sendBroadcast(notification, data));

    return {
      success: delivery.some((item) => item.success),
      delivery
    };
  } catch (error) {
    console.error('[NotificationService] Failed to send broadcast:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendToUser,
  sendToUsers,
  sendNewMessageNotification,
  sendMissedCallNotification,
  sendIncomingCallNotification,
  sendNewStatusNotification,
  sendMentionNotification,
  sendGroupNotification,
  registerToken,
  unregisterToken,
  subscribeUserToTopic,
  unsubscribeUserFromTopic,
  sendBroadcastNotification,
  isConfigured: () => isFirebaseConfigured() || webPushService.isConfigured()
};
