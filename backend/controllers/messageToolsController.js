/**
 * messageToolsController.js
 * -------------------------
 * Consolidated controller for message MODs + message translator
 * (REFACTOR_PLAN.md step 5 — merges messageModsController.js +
 * messageTranslatorController.js).
 *
 * Both controllers share getUser/mergeSettings scaffolding; the MODs
 * half had 8 near-identical toggle handlers. This file keeps every
 * exported handler name and route path intact — only the internal
 * wiring is shared now.
 *
 *   /api/message-mods/...        →  settings, toggle* MODs, send-blank
 *   /api/message-translator/...  →  settings, translate, detect, languages
 */

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger, createSettingsHandlers, createToggleHandler } = require('../services/userScopedService');

// ── Message MODs (route prefix /api/message-mods) ───────────────────────────

const MODS_DEFAULTS = {
  sendAnyFileType: false,
  fileSizeLimitIncrease: false,
  editSentMessages: false,
  deleteForEveryoneBypass: false,
  messageEncryptionToggle: false,
  messageTranslation: false,
  messageTranscription: false,
  blankMessages: false
};

const mergeModsSettings = createSettingsMerger(MODS_DEFAULTS);

// Generic single-field toggle — every message-mods toggle is identical apart
// from the field name and log label.
const toggleModsField = createToggleHandler({
  settingsField: 'messageModsSettings',
  merge: mergeModsSettings,
});

const { getSettings: getMessageModsSettings, updateSettings: updateMessageModsSettings } = createSettingsHandlers({
  field: 'messageModsSettings',
  label: 'message MODs',
  mergeSettings: mergeModsSettings,
});

exports.getMessageModsSettings = getMessageModsSettings;

exports.updateMessageModsSettings = updateMessageModsSettings;

exports.toggleSendAnyFile = (req, res) => toggleModsField(req, res, 'sendAnyFileType', 'Toggle send any file');
exports.toggleFileSizeLimit = (req, res) => toggleModsField(req, res, 'fileSizeLimitIncrease', 'Toggle file size limit');
exports.toggleEditSent = (req, res) => toggleModsField(req, res, 'editSentMessages', 'Toggle edit sent');
exports.toggleDeleteBypass = (req, res) => toggleModsField(req, res, 'deleteForEveryoneBypass', 'Toggle delete bypass');
exports.toggleEncryption = (req, res) => toggleModsField(req, res, 'messageEncryptionToggle', 'Toggle encryption');
exports.toggleTranslation = (req, res) => toggleModsField(req, res, 'messageTranslation', 'Toggle translation');
exports.toggleTranscription = (req, res) => toggleModsField(req, res, 'messageTranscription', 'Toggle transcription');
exports.toggleBlankMessages = (req, res) => toggleModsField(req, res, 'blankMessages', 'Toggle blank messages');

exports.sendBlankMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeModsSettings(user.messageModsSettings?.toObject?.() || user.messageModsSettings);
    if (!settings.blankMessages) {
      return res.status(403).json({ success: false, message: 'Blank messages mod is not enabled' });
    }

    const { conversationId } = req.body;
    if (!conversationId || !String(conversationId).match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'A valid conversationId is required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const isParticipant = conversation.participants?.some(p => String(p) === String(user._id));
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not a participant of this conversation' });
    }

    const message = await Message.create({
      conversationId: conversation._id,
      sender: user._id,
      content: '\u200B',
      messageType: 'text'
    });

    res.status(201).json({ success: true, message });
  } catch (error) {
    console.error('Send blank message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Message translator (route prefix /api/message-translator) ───────────────

const TRANSLATOR_DEFAULTS = {
  autoTranslate: false,
  targetLanguage: 'en',
  sourceLanguage: 'auto',
  showOriginal: true,
  translateIncoming: false,
  translateOutgoing: false,
  supportedLanguages: ['en', 'sw', 'ar', 'fr', 'es', 'de', 'zh', 'hi', 'pt', 'ru']
};

const mergeTranslatorSettings = createSettingsMerger(TRANSLATOR_DEFAULTS);

const { getSettings: getTranslatorSettings, updateSettings: updateTranslatorSettings, resetSettings: resetTranslatorSettings } = createSettingsHandlers({
  field: 'translatorSettings',
  label: 'translator',
  mergeSettings: mergeTranslatorSettings,
});

exports.getTranslatorSettings = getTranslatorSettings;

exports.updateTranslatorSettings = updateTranslatorSettings;

exports.translateMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    const target = targetLanguage || user.translatorSettings?.targetLanguage || 'en';
    const source = sourceLanguage || user.translatorSettings?.sourceLanguage || 'auto';

    // Offline dictionary translation (no AI)
    const mockTranslations = {
      'sw': { 'hello': 'habari', 'how are you': 'habari gani', 'good': 'nzuri' },
      'en': { 'habari': 'hello', 'habari gani': 'how are you', 'nzuri': 'good' }
    };

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

exports.toggleAutoTranslate = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.translatorSettings?.toObject?.() || user.translatorSettings || {};

    user.translatorSettings = mergeTranslatorSettings({
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

exports.resetTranslatorSettings = resetTranslatorSettings;
