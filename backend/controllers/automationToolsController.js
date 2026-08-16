/**
 * automationToolsController.js
 * ----------------------------
 * Consolidated controller for automation MODs + text repeater
 * (REFACTOR_PLAN.md step 6 — merges automationModsController.js +
 * textRepeaterController.js).
 *
 * Every exported handler name and route path stays intact; the 7
 * near-identical automation toggle handlers now share one generic
 * createToggleHandler.
 *
 *   /api/automation-mods/... →  settings + auto-* toggles/updates
 *   /api/text-repeater/...   →  settings + repeat handlers
 */

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const {
  getUser,
  createSettingsMerger,
  createSettingsHandlers,
  createToggleHandler
} = require('../services/userScopedService');

// ── Automation MODs (route prefix /api/automation-mods) ─────────────────────

const AUTOMATION_MODS_DEFAULTS = {
  autoReplyEnabled: false,
  autoDeleteMessages: false,
  autoDeleteAfterDays: 30,
  autoArchiveChats: false,
  autoArchiveAfterDays: 90,
  autoMuteGroups: false,
  welcomeMessageEnabled: false,
  welcomeMessageText: '',
  goodbyeMessageEnabled: false,
  goodbyeMessageText: ''
};

const mergeAutomationModsSettings = createSettingsMerger(AUTOMATION_MODS_DEFAULTS);

// @desc    Get automation MODs settings
// @route   GET /api/automation-mods/settings
// @access  Private
const {
  getSettings: getAutomationModsSettings,
  updateSettings: updateAutomationModsSettings
} = createSettingsHandlers({
  field: 'automationModsSettings',
  label: 'automation MODs',
  mergeSettings: mergeAutomationModsSettings,
});

exports.getAutomationModsSettings = getAutomationModsSettings;

// @desc    Update automation MODs settings
// @route   POST /api/automation-mods/settings
// @access  Private
exports.updateAutomationModsSettings = updateAutomationModsSettings;

// Generic single-field toggle — every automation-mods toggle is identical
// apart from the field name and log label.
const toggleAutomationField = createToggleHandler({
  settingsField: 'automationModsSettings',
  merge: mergeAutomationModsSettings,
});

// @desc    Toggle Auto-Reply
// @route   POST /api/automation-mods/auto-reply
// @access  Private
// Auto-Reply historically lived in TWO separate stores: the automation-mods
// settings (below) and the canonical user.autoReplyEnabled / autoReplyMessage
// fields + user.genzMods.autoReply (which the message pipeline actually reads
// in socket/handlers/messageHandlers.js). Toggling here MUST update all of
// them, otherwise the toggle looks ON in the Automation panel but never fires,
// and the GENZ Mods page / app settings disagree with the panel.
exports.toggleAutoReply = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};
    const newValue = !existing.autoReplyEnabled;

    user.automationModsSettings = mergeAutomationModsSettings({ ...existing, autoReplyEnabled: newValue });
    user.markModified('automationModsSettings');

    // Mirror into the canonical auto-reply fields the socket reads, so the
    // Automation panel, GENZ Mods page and app settings all agree.
    const genzMods = user.genzMods?.toObject?.() || user.genzMods || {};
    const message = genzMods.autoReply?.message || user.autoReplyMessage || '';
    user.genzMods = {
      ...genzMods,
      autoReply: { ...(genzMods.autoReply || {}), enabled: newValue, message }
    };
    user.markModified('genzMods');
    user.autoReplyEnabled = newValue;
    user.autoReplyMessage = message;

    await user.save();
    res.status(200).json({ success: true, autoReplyEnabled: newValue });
  } catch (error) {
    console.error('Toggle auto reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Delete Messages
// @route   POST /api/automation-mods/auto-delete
// @access  Private
exports.toggleAutoDelete = (req, res) => toggleAutomationField(req, res, 'autoDeleteMessages', 'Toggle auto delete');

// @desc    Update Auto-Delete After Days
// @route   POST /api/automation-mods/auto-delete-days
// @access  Private
exports.updateAutoDeleteDays = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { days } = req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};

    user.automationModsSettings = mergeAutomationModsSettings({ ...existing, autoDeleteAfterDays: days });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoDeleteAfterDays: days });
  } catch (error) {
    console.error('Update auto delete days error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Archive Chats
// @route   POST /api/automation-mods/auto-archive
// @access  Private
exports.toggleAutoArchive = (req, res) => toggleAutomationField(req, res, 'autoArchiveChats', 'Toggle auto archive');

// @desc    Update Auto-Archive After Days
// @route   POST /api/automation-mods/auto-archive-days
// @access  Private
exports.updateAutoArchiveDays = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { days } = req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};

    user.automationModsSettings = mergeAutomationModsSettings({ ...existing, autoArchiveAfterDays: days });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, autoArchiveAfterDays: days });
  } catch (error) {
    console.error('Update auto archive days error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Auto-Mute Groups
// @route   POST /api/automation-mods/auto-mute-groups
// @access  Private
exports.toggleAutoMuteGroups = (req, res) => toggleAutomationField(req, res, 'autoMuteGroups', 'Toggle auto mute groups');

// @desc    Toggle Welcome Message
// @route   POST /api/automation-mods/welcome-message
// @access  Private
exports.toggleWelcomeMessage = (req, res) => toggleAutomationField(req, res, 'welcomeMessageEnabled', 'Toggle welcome message');

// @desc    Update Welcome Message Text
// @route   POST /api/automation-mods/welcome-message-text
// @access  Private
exports.updateWelcomeMessageText = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { text } = req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};

    user.automationModsSettings = mergeAutomationModsSettings({ ...existing, welcomeMessageText: text });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, welcomeMessageText: text });
  } catch (error) {
    console.error('Update welcome message text error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Goodbye Message
// @route   POST /api/automation-mods/goodbye-message
// @access  Private
exports.toggleGoodbyeMessage = (req, res) => toggleAutomationField(req, res, 'goodbyeMessageEnabled', 'Toggle goodbye message');

// @desc    Update Goodbye Message Text
// @route   POST /api/automation-mods/goodbye-message-text
// @access  Private
exports.updateGoodbyeMessageText = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { text } = req.body;
    const existing = user.automationModsSettings?.toObject?.() || user.automationModsSettings || {};

    user.automationModsSettings = mergeAutomationModsSettings({ ...existing, goodbyeMessageText: text });
    user.markModified('automationModsSettings');
    await user.save();

    res.json({ success: true, goodbyeMessageText: text });
  } catch (error) {
    console.error('Update goodbye message text error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ── Text repeater (route prefix /api/text-repeater) ─────────────────────────

const TEXT_REPEATER_DEFAULTS = {
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

const mergeTextRepeaterSettings = createSettingsMerger(TEXT_REPEATER_DEFAULTS);

// @desc    Get text repeater settings
// @route   GET /api/text-repeater/settings
// @access  Private
const {
  getSettings: getTextRepeaterSettings,
  updateSettings: updateTextRepeaterSettings,
  resetSettings: resetTextRepeaterSettings
} = createSettingsHandlers({
  field: 'textRepeaterSettings',
  label: 'text repeater',
  mergeSettings: mergeTextRepeaterSettings,
});

exports.getTextRepeaterSettings = getTextRepeaterSettings;

// @desc    Update text repeater settings
// @route   POST /api/text-repeater/settings
// @access  Private
exports.updateTextRepeaterSettings = updateTextRepeaterSettings;

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

    const settings = mergeTextRepeaterSettings(user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings);

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

    const settings = mergeTextRepeaterSettings(user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings);

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

const toggleTextRepeaterField = createToggleHandler({
  settingsField: 'textRepeaterSettings',
  merge: mergeTextRepeaterSettings,
  acceptEnabled: true,
});

// @desc    Toggle text repeater
// @route   POST /api/text-repeater/toggle
// @access  Private
exports.toggleTextRepeater = (req, res) => toggleTextRepeaterField(req, res, 'textRepeaterEnabled', 'Toggle text repeater');

// @desc    Update max repeat count
// @route   POST /api/text-repeater/max-count
// @access  Private
exports.updateMaxRepeatCount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { maxCount } = req.body;
    const existing = user.textRepeaterSettings?.toObject?.() || user.textRepeaterSettings || {};

    user.textRepeaterSettings = mergeTextRepeaterSettings({
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
exports.resetTextRepeaterSettings = resetTextRepeaterSettings;
