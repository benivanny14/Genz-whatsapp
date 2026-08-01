const User = require('../models/User');

const defaultSettings = {
  autoTranslate: false,
  targetLanguage: 'en',
  sourceLanguage: 'auto',
  showOriginal: true,
  translateIncoming: false,
  translateOutgoing: false,
  supportedLanguages: ['en', 'sw', 'ar', 'fr', 'es', 'de', 'zh', 'hi', 'pt', 'ru']
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

// @desc    Get message translator settings
// @route   GET /api/message-translator/settings
// @access  Private
exports.getTranslatorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.translatorSettings?.toObject?.() || user.translatorSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get translator settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update message translator settings
// @route   POST /api/message-translator/settings
// @access  Private
exports.updateTranslatorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.translatorSettings?.toObject?.() || user.translatorSettings || {};
    
    user.translatorSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('translatorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.translatorSettings });
  } catch (error) {
    console.error('Update translator settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Translate message
// @route   POST /api/message-translator/translate
// @access  Private
exports.translateMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    // Simple offline dictionary translation
    const mockTranslations = {
      'sw': { 'hello': 'habari', 'how are you': 'habari gani', 'good': 'nzuri' },
      'en': { 'habari': 'hello', 'habari gani': 'how are you', 'nzuri': 'good' }
    };

    const target = targetLanguage || user.translatorSettings?.targetLanguage || 'en';
    const source = sourceLanguage || user.translatorSettings?.sourceLanguage || 'auto';

    let translatedText = text;
    if (mockTranslations[target]) {
      Object.keys(mockTranslations[target]).forEach(key => {
        if (text.toLowerCase().includes(key)) {
          translatedText = text.toLowerCase().replace(key, mockTranslations[target][key]);
        }
      });
    }

    return res.status(200).json({
      success: true,
      originalText: text,
      translatedText,
      sourceLanguage: source,
      targetLanguage: target,
      provider: 'mock'
    });
  } catch (error) {
    console.error('Translate message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Detect language
// @route   POST /api/message-translator/detect
// @access  Private
exports.detectLanguage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    // Simple heuristic detection
    const swahiliWords = ['habari', 'jambo', 'asante', 'kwa', 'na', 'la', 'ya', 'wa', 'ni', 'hu'];
    const arabicWords = ['السلام', 'عليكم', 'شكرا', 'حسن'];

    let detectedLang = 'en';
    const lowerText = text.toLowerCase();

    if (swahiliWords.some(word => lowerText.includes(word))) {
      detectedLang = 'sw';
    } else if (arabicWords.some(word => lowerText.includes(word))) {
      detectedLang = 'ar';
    }

    return res.status(200).json({
      success: true,
      language: detectedLang,
      confidence: 0.8,
      provider: 'heuristic'
    });
  } catch (error) {
    console.error('Detect language error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle auto translate
// @route   POST /api/message-translator/auto-translate
// @access  Private
exports.toggleAutoTranslate = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.translatorSettings?.toObject?.() || user.translatorSettings || {};
    
    user.translatorSettings = mergeSettings({
      ...existing,
      autoTranslate: enabled !== undefined ? enabled : !existing.autoTranslate
    });
    user.markModified('translatorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.translatorSettings });
  } catch (error) {
    console.error('Toggle auto translate error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get supported languages
// @route   GET /api/message-translator/languages
// @access  Private
exports.getSupportedLanguages = async (req, res) => {
  try {
    const languages = [
      { code: 'en', name: 'English', native: 'English' },
      { code: 'sw', name: 'Swahili', native: 'Kiswahili' },
      { code: 'ar', name: 'Arabic', native: 'العربية' },
      { code: 'fr', name: 'French', native: 'Français' },
      { code: 'es', name: 'Spanish', native: 'Español' },
      { code: 'de', name: 'German', native: 'Deutsch' },
      { code: 'zh', name: 'Chinese', native: '中文' },
      { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
      { code: 'pt', name: 'Portuguese', native: 'Português' },
      { code: 'ru', name: 'Russian', native: 'Русский' }
    ];

    res.status(200).json({ success: true, languages });
  } catch (error) {
    console.error('Get supported languages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset translator settings to default
// @route   POST /api/message-translator/reset
// @access  Private
exports.resetTranslatorSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.translatorSettings = mergeSettings({});
    user.markModified('translatorSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.translatorSettings });
  } catch (error) {
    console.error('Reset translator settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
