/**
 * messageToolsController.js
 * -------------------------
 * Consolidated controller for message MODs
 * (REFACTOR_PLAN.md step 5 — merges messageModsController.js +
 * messageTranslatorController.js).
 *
 * The MODs half had 8 near-identical toggle handlers. This file keeps every
 * exported handler name and route path intact — only the internal
 * wiring is shared now.
 *
 *   /api/message-mods/...        →  settings, toggle* MODs, send-blank
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
