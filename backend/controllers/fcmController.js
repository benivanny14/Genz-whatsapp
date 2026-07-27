const { registerToken, unregisterToken, subscribeUserToTopic, unsubscribeUserFromTopic } = require('../services/notificationService');

/**
 * FCM Controller
 * Handles Firebase Cloud Messaging token registration and topic subscriptions
 */

/**
 * @desc    Register FCM token for current user
 * @route   POST /api/notifications/fcm/register
 * @access  Private
 */
exports.registerToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const result = await registerToken(userId, token);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'FCM token registered successfully'
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[FCM Controller] Register token error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Unregister FCM token for current user
 * @route   POST /api/notifications/fcm/unregister
 * @access  Private
 */
exports.unregisterToken = async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    const result = await unregisterToken(userId, token);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'FCM token unregistered successfully'
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[FCM Controller] Unregister token error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Subscribe current user to a topic
 * @route   POST /api/notifications/fcm/subscribe-topic
 * @access  Private
 */
exports.subscribeToTopic = async (req, res) => {
  try {
    const { topic } = req.body;
    const userId = req.user._id;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    const result = await subscribeUserToTopic(userId, topic);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Subscribed to topic ${topic} successfully`,
        successCount: result.successCount
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[FCM Controller] Subscribe topic error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * @desc    Unsubscribe current user from a topic
 * @route   POST /api/notifications/fcm/unsubscribe-topic
 * @access  Private
 */
exports.unsubscribeFromTopic = async (req, res) => {
  try {
    const { topic } = req.body;
    const userId = req.user._id;

    if (!topic) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required'
      });
    }

    const result = await unsubscribeUserFromTopic(userId, topic);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: `Unsubscribed from topic ${topic} successfully`,
        successCount: result.successCount
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('[FCM Controller] Unsubscribe topic error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
