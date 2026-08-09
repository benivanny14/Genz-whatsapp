const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const defaultSettings = {
  textRepeaterEnabled: true,
  maxRepeatCount: 100,
  defaultRepeatCount: 10,
  addDelay: false,
  delayBetweenMessages: 500, // milliseconds
  enableRandomDelay: false,
  minDelay: 300,
  maxDelay: 1000,
  allowCustomSeparator: true,
  defaultSeparator: '\n',
  preventSpam: true,
  spamThreshold: 50
};

const getUser = async (req, res) => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return null;
  }
  return user;
};

const mergeSettings = (settings = {}) => ({
  ...defaultSettings,
  ...settings
});

// @desc    Get text repeater settings
// @route   GET /api/text-repeater/settings
// @access  Private
exports.getTextRepeaterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get text repeater settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update text repeater settings
// @route   POST /api/text-repeater/settings
// @access  Private
exports.updateTextRepeaterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings || {};
    
    user.textRepeaterSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('textRepeaterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.textRepeaterSettings });
  } catch (error) {
    console.error('Update text repeater settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Repeat text
// @route   POST /api/text-repeater/repeat
// @access  Private
exports.repeatText = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, text, count, separator, send } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const settings = mergeSettings(user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings);
    
    if (!settings.textRepeaterEnabled) {
      return res.status(403).json({ success: false, message: 'Text repeater is disabled' });
    }

    const repeatCount = count || settings.defaultRepeatCount;
    
    if (repeatCount > settings.maxRepeatCount) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum repeat count is ${settings.maxRepeatCount}` 
      });
    }

    if (settings.preventSpam && repeatCount > settings.spamThreshold) {
      return res.status(400).json({ 
        success: false, 
        message: `Spam protection: Maximum ${settings.spamThreshold} repeats allowed` 
      });
    }

    const textSeparator = separator || settings.defaultSeparator;
    const repeatedText = text + textSeparator + text.repeat(repeatCount - 1);

    if (!send) {
      return res.status(200).json({
        success: true,
        repeatedText,
        count: repeatCount,
        previewOnly: true
      });
    }

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required to send' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => String(p) === String(user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    const message = await Message.create({
      conversationId,
      sender: user._id,
      content: repeatedText,
      messageType: 'text',
      repeatedText: true,
      repeatCount
    });

    res.status(200).json({
      success: true,
      repeatedText,
      count: repeatCount,
      messageId: message._id,
      sent: true
    });
  } catch (error) {
    console.error('Repeat text error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Repeat text with delay (send multiple messages)
// @route   POST /api/text-repeater/repeat-delayed
// @access  Private
exports.repeatTextDelayed = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, text, count, delay, randomDelay } = req.body;

    if (!text || !conversationId) {
      return res.status(400).json({ success: false, message: 'Text and conversation ID are required' });
    }

    const settings = mergeSettings(user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings);
    
    if (!settings.textRepeaterEnabled) {
      return res.status(403).json({ success: false, message: 'Text repeater is disabled' });
    }

    const repeatCount = count || settings.defaultRepeatCount;
    
    if (repeatCount > settings.maxRepeatCount) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum repeat count is ${settings.maxRepeatCount}` 
      });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    if (!conversation.participants.some((p) => String(p) === String(user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this conversation' });
    }

    const messageDelay = delay || settings.delayBetweenMessages;
    const useRandomDelay = randomDelay !== undefined ? randomDelay : settings.enableRandomDelay;

    const results = [];
    const errors = [];

    for (let i = 0; i < repeatCount; i++) {
      try {
        const message = await Message.create({
          conversationId,
          sender: user._id,
          content: text,
          messageType: 'text',
          repeatedText: true,
          repeatIndex: i + 1
        });

        results.push({ index: i + 1, messageId: message._id });

        // Add delay between messages
        if (i < repeatCount - 1 && messageDelay > 0) {
          const actualDelay = useRandomDelay 
            ? Math.floor(Math.random() * (settings.maxDelay - settings.minDelay + 1)) + settings.minDelay
            : messageDelay;
          await new Promise(resolve => setTimeout(resolve, actualDelay));
        }
      } catch (err) {
        errors.push({ index: i + 1, error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      sent: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('Repeat text delayed error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle text repeater
// @route   POST /api/text-repeater/toggle
// @access  Private
exports.toggleTextRepeater = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings || {};
    
    user.textRepeaterSettings = mergeSettings({
      ...existing,
      textRepeaterEnabled: enabled !== undefined ? enabled : !existing.textRepeaterEnabled
    });
    user.markModified('textRepeaterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.textRepeaterSettings });
  } catch (error) {
    console.error('Toggle text repeater error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update max repeat count
// @route   POST /api/text-repeater/max-count
// @access  Private
exports.updateMaxRepeatCount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { maxCount } = req.body;
    const existing = user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings || {};
    
    user.textRepeaterSettings = mergeSettings({
      ...existing,
      maxRepeatCount: maxCount !== undefined ? maxCount : existing.maxRepeatCount
    });
    user.markModified('textRepeaterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.textRepeaterSettings });
  } catch (error) {
    console.error('Update max repeat count error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset text repeater settings to default
// @route   POST /api/text-repeater/reset
// @access  Private
exports.resetTextRepeaterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.textRepeaterSettings = mergeSettings({});
    user.markModified('textRepeaterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.textRepeaterSettings });
  } catch (error) {
    console.error('Reset text repeater settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
