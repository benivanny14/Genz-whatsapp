const User = require('../models/User');

const defaultSettings = {
  chatBubbleAnimationsEnabled: true,
  animationType: 'default', // default, confetti, hearts, sparkles, bounce, fade, slide
  animationDuration: 1.5, // seconds
  triggerOnSend: true,
  triggerOnReceive: false,
  animationIntensity: 'medium', // low, medium, high
  soundEnabled: true,
  vibrationEnabled: false,
  specificWords: [],
  emojiTriggers: ['❤️', '🎉', '🔥', '✨', '💫'],
  randomAnimations: false,
  maxAnimationsPerMinute: 10
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

// @desc    Get chat bubble animations settings
// @route   GET /api/chat-bubble-animations/settings
// @access  Private
exports.getChatBubbleAnimationsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.chatBubbleAnimationsSettings?.toObject?.() || user.chatBubbleAnimationsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get chat bubble animations settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update chat bubble animations settings
// @route   POST /api/chat-bubble-animations/settings
// @access  Private
exports.updateChatBubbleAnimationsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.chatBubbleAnimationsSettings?.toObject?.() || user.chatBubbleAnimationsSettings || {};
    
    user.chatBubbleAnimationsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('chatBubbleAnimationsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatBubbleAnimationsSettings });
  } catch (error) {
    console.error('Update chat bubble animations settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Trigger chat bubble animation
// @route   POST /api/chat-bubble-animations/trigger
// @access  Private
exports.triggerAnimation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { animationType, conversationId, messageId } = req.body;

    const settings = mergeSettings(user.chatBubbleAnimationsSettings?.toObject?.() || user.chatBubbleAnimationsSettings);
    
    if (!settings.chatBubbleAnimationsEnabled) {
      return res.status(403).json({ success: false, message: 'Chat bubble animations are disabled' });
    }

    // Rate limiting check
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    
    if (!user.animationHistory) user.animationHistory = [];
    const recentAnimations = user.animationHistory.filter(a => new Date(a.timestamp) > oneMinuteAgo);
    
    if (recentAnimations.length >= settings.maxAnimationsPerMinute) {
      return res.status(429).json({ success: false, message: 'Too many animations. Please wait.' });
    }

    const animation = {
      _id: new (require('mongoose').Types.ObjectId)(),
      type: animationType || settings.animationType,
      duration: settings.animationDuration,
      intensity: settings.animationIntensity,
      conversationId,
      messageId,
      soundEnabled: settings.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled,
      timestamp: now
    };

    user.animationHistory.push(animation);
    user.animationHistory = user.animationHistory.filter(a => new Date(a.timestamp) > oneMinuteAgo);
    await user.save();

    // Emit socket event for real-time animation (mock)
    // io.to(conversationId).emit('chat-bubble-animation', animation);

    res.status(200).json({ success: true, animation });
  } catch (error) {
    console.error('Trigger animation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get available animation types
// @route   GET /api/chat-bubble-animations/types
// @access  Private
exports.getAnimationTypes = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const animationTypes = [
      { id: 'default', name: 'Default', description: 'Standard message appearance' },
      { id: 'confetti', name: 'Confetti', description: 'Colorful confetti burst' },
      { id: 'hearts', name: 'Hearts', description: 'Floating hearts animation' },
      { id: 'sparkles', name: 'Sparkles', description: 'Twinkling sparkles effect' },
      { id: 'bounce', name: 'Bounce', description: 'Bouncy message entry' },
      { id: 'fade', name: 'Fade', description: 'Smooth fade in' },
      { id: 'slide', name: 'Slide', description: 'Slide from side' },
      { id: 'pop', name: 'Pop', description: 'Pop in effect' },
      { id: 'scale', name: 'Scale', description: 'Scale up animation' },
      { id: 'rotate', name: 'Rotate', description: 'Rotate in effect' }
    ];

    res.status(200).json({ success: true, animationTypes });
  } catch (error) {
    console.error('Get animation types error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add word trigger
// @route   POST /api/chat-bubble-animations/word-trigger
// @access  Private
exports.addWordTrigger = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { word, animationType } = req.body;

    if (!word) {
      return res.status(400).json({ success: false, message: 'Word is required' });
    }

    const existing = user.chatBubbleAnimationsSettings?.toObject?.() || user.chatBubbleAnimationsSettings || {};
    
    if (!existing.specificWords) existing.specificWords = [];
    
    const existingWord = existing.specificWords.find(w => w.word === word);
    if (existingWord) {
      existingWord.animationType = animationType || existing.animationType;
    } else {
      existing.specificWords.push({ word, animationType });
    }

    user.chatBubbleAnimationsSettings = mergeSettings({ ...existing });
    user.markModified('chatBubbleAnimationsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatBubbleAnimationsSettings });
  } catch (error) {
    console.error('Add word trigger error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove word trigger
// @route   DELETE /api/chat-bubble-animations/word-trigger/:word
// @access  Private
exports.removeWordTrigger = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { word } = req.params;

    const existing = user.chatBubbleAnimationsSettings?.toObject?.() || user.chatBubbleAnimationsSettings || {};
    
    if (existing.specificWords) {
      existing.specificWords = existing.specificWords.filter(w => w.word !== word);
    }

    user.chatBubbleAnimationsSettings = mergeSettings({ ...existing });
    user.markModified('chatBubbleAnimationsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatBubbleAnimationsSettings });
  } catch (error) {
    console.error('Remove word trigger error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get animation history
// @route   GET /api/chat-bubble-animations/history
// @access  Private
exports.getAnimationHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const history = user.animationHistory || [];
    const { limit } = req.query;
    
    const historyLimit = parseInt(limit) || 50;
    const recentHistory = history.slice(0, historyLimit);

    res.status(200).json({ success: true, history: recentHistory });
  } catch (error) {
    console.error('Get animation history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear animation history
// @route   DELETE /api/chat-bubble-animations/history
// @access  Private
exports.clearAnimationHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.animationHistory = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Animation history cleared' });
  } catch (error) {
    console.error('Clear animation history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle chat bubble animations
// @route   POST /api/chat-bubble-animations/toggle
// @access  Private
exports.toggleChatBubbleAnimations = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.chatBubbleAnimationsSettings?.toObject?.() || user.chatBubbleAnimationsSettings || {};
    
    user.chatBubbleAnimationsSettings = mergeSettings({
      ...existing,
      chatBubbleAnimationsEnabled: enabled !== undefined ? enabled : !existing.chatBubbleAnimationsEnabled
    });
    user.markModified('chatBubbleAnimationsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatBubbleAnimationsSettings });
  } catch (error) {
    console.error('Toggle chat bubble animations error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset chat bubble animations settings to default
// @route   POST /api/chat-bubble-animations/reset
// @access  Private
exports.resetChatBubbleAnimationsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.chatBubbleAnimationsSettings = mergeSettings({});
    user.markModified('chatBubbleAnimationsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.chatBubbleAnimationsSettings });
  } catch (error) {
    console.error('Reset chat bubble animations settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
