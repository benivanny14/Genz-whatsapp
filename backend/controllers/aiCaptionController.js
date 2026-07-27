const User = require('../models/User');

const defaultSettings = {
  aiCaptionEnabled: true,
  autoGenerate: false,
  captionStyle: 'casual', // casual, professional, funny, inspirational
  captionLength: 'medium', // short, medium, long
  includeEmojis: true,
  includeHashtags: true,
  maxHashtags: 5,
  language: 'auto',
  saveHistory: true,
  maxHistory: 50
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

// @desc    Get AI caption generator settings
// @route   GET /api/ai-caption/settings
// @access  Private
exports.getAiCaptionSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.aiCaptionSettings?.toObject?.() || user.aiCaptionSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get AI caption settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update AI caption generator settings
// @route   POST /api/ai-caption/settings
// @access  Private
exports.updateAiCaptionSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.aiCaptionSettings?.toObject?.() || user.aiCaptionSettings || {};
    
    user.aiCaptionSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('aiCaptionSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.aiCaptionSettings });
  } catch (error) {
    console.error('Update AI caption settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate AI caption
// @route   POST /api/ai-caption/generate
// @access  Private
exports.generateCaption = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { mediaType, description, context, customPrompt } = req.body;

    if (!mediaType) {
      return res.status(400).json({ success: false, message: 'Media type is required' });
    }

    const settings = mergeSettings(user.aiCaptionSettings?.toObject?.() || user.aiCaptionSettings);
    
    if (!settings.aiCaptionEnabled) {
      return res.status(403).json({ success: false, message: 'AI caption generation is disabled' });
    }

    // Mock AI caption generation (in real implementation, use OpenAI or similar)
    const captions = generateMockCaptions(mediaType, description, context, settings);
    
    const caption = {
      _id: new (require('mongoose').Types.ObjectId)(),
      text: captions.text,
      hashtags: captions.hashtags,
      style: settings.captionStyle,
      mediaType,
      createdAt: new Date()
    };

    // Save to history if enabled
    if (settings.saveHistory) {
      if (!user.aiCaptionHistory) user.aiCaptionHistory = [];
      user.aiCaptionHistory.unshift(caption);
      
      // Keep only maxHistory items
      if (user.aiCaptionHistory.length > settings.maxHistory) {
        user.aiCaptionHistory = user.aiCaptionHistory.slice(0, settings.maxHistory);
      }
      
      await user.save();
    }

    res.status(200).json({ success: true, caption });
  } catch (error) {
    console.error('Generate caption error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mock caption generation function
function generateMockCaptions(mediaType, description, context, settings) {
  const styleTemplates = {
    casual: [
      "Just captured this moment! 📸",
      "Living my best life ✨",
      "Making memories that last forever 💫",
      "Good vibes only today 🌟",
      "Simple pleasures in life 🌸"
    ],
    professional: [
      "Capturing excellence in every frame.",
      "Professional moments worth sharing.",
      "Quality content for quality connections.",
      "Building something meaningful.",
      "Excellence in every detail."
    ],
    funny: [
      "When life gives you moments, capture them! 😄",
      "Proof that I'm actually productive 🎯",
      "Living the dream (mostly) 🌈",
      "Professional overthinker 🧠",
      "Chaos coordinator at work 🎪"
    ],
    inspirational: [
      "Every moment is a new beginning.",
      "Capture the beauty around you.",
      "Life is what you make of it.",
      "Embrace every opportunity.",
      "Create your own sunshine ☀️"
    ]
  };

  const hashtagSets = {
    photo: ['#photography', '#memories', '#lifestyle', '#moments', '#capture'],
    video: ['#video', '#content', '#vibes', '#creative', '#storytelling'],
    image: ['#image', '#visuals', '#art', '#design', '#creative']
  };

  const templates = styleTemplates[settings.captionStyle] || styleTemplates.casual;
  const hashtags = hashtagSets[mediaType] || hashtagSets.photo;
  
  const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];
  const selectedHashtags = hashtags.slice(0, settings.maxHas);

  let captionText = selectedTemplate;
  if (description) {
    captionText += ` ${description}`;
  }
  if (context) {
    captionText += ` ${context}`;
  }

  if (settings.includeEmojis) {
    captionText += ' ✨📸💫';
  }

  return {
    text: captionText,
    hashtags: settings.includeHashtags ? selectedHashtags : []
  };
}

// @desc    Get caption history
// @route   GET /api/ai-caption/history
// @access  Private
exports.getCaptionHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const history = user.aiCaptionHistory || [];
    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('Get caption history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete caption from history
// @route   DELETE /api/ai-caption/history/:id
// @access  Private
exports.deleteCaptionFromHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const history = user.aiCaptionHistory || [];
    const index = history.findIndex(c => c._id.toString() === id);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Caption not found' });
    }

    history.splice(index, 1);
    user.aiCaptionHistory = history;
    await user.save();

    res.status(200).json({ success: true, message: 'Caption deleted' });
  } catch (error) {
    console.error('Delete caption from history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear caption history
// @route   DELETE /api/ai-caption/history
// @access  Private
exports.clearCaptionHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.aiCaptionHistory = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Caption history cleared' });
  } catch (error) {
    console.error('Clear caption history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle AI caption generator
// @route   POST /api/ai-caption/toggle
// @access  Private
exports.toggleAiCaption = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.aiCaptionSettings?.toObject?.() || user.aiCaptionSettings || {};
    
    user.aiCaptionSettings = mergeSettings({
      ...existing,
      aiCaptionEnabled: enabled !== undefined ? enabled : !existing.aiCaptionEnabled
    });
    user.markModified('aiCaptionSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.aiCaptionSettings });
  } catch (error) {
    console.error('Toggle AI caption error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset AI caption settings to default
// @route   POST /api/ai-caption/reset
// @access  Private
exports.resetAiCaptionSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.aiCaptionSettings = mergeSettings({});
    user.markModified('aiCaptionSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.aiCaptionSettings });
  } catch (error) {
    console.error('Reset AI caption settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
