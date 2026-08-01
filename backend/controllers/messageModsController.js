const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const defaultSettings = {
  sendAnyFileType: false,
  fileSizeLimitIncrease: false,
  editSentMessages: false,
  deleteForEveryoneBypass: false,
  messageEncryptionToggle: false,
  messageTranslation: false,
  messageTranscription: false,
  blankMessages: false
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

// @desc    Get message MODs settings
// @route   GET /api/message-mods/settings
// @access  Private
exports.getMessageModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.messageModsSettings?.toObject?.() || user.messageModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get message MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update message MODs settings
// @route   POST /api/message-mods/settings
// @access  Private
exports.updateMessageModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    
    user.messageModsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('messageModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.messageModsSettings });
  } catch (error) {
    console.error('Update message MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Send Any File Type
// @route   POST /api/message-mods/send-any-file
// @access  Private
exports.toggleSendAnyFile = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    const newValue = !existing.sendAnyFileType;
    
    user.messageModsSettings = mergeSettings({ ...existing, sendAnyFileType: newValue });
    user.markModified('messageModsSettings');
    await user.save();

    res.json({ success: true, sendAnyFileType: newValue });
  } catch (error) {
    console.error('Toggle send any file error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle File Size Limit Increase
// @route   POST /api/message-mods/file-size-limit
// @access  Private
exports.toggleFileSizeLimit = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    const newValue = !existing.fileSizeLimitIncrease;
    
    user.messageModsSettings = mergeSettings({ ...existing, fileSizeLimitIncrease: newValue });
    user.markModified('messageModsSettings');
    await user.save();

    res.json({ success: true, fileSizeLimitIncrease: newValue });
  } catch (error) {
    console.error('Toggle file size limit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Edit Sent Messages
// @route   POST /api/message-mods/edit-sent
// @access  Private
exports.toggleEditSent = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    const newValue = !existing.editSentMessages;
    
    user.messageModsSettings = mergeSettings({ ...existing, editSentMessages: newValue });
    user.markModified('messageModsSettings');
    await user.save();

    res.json({ success: true, editSentMessages: newValue });
  } catch (error) {
    console.error('Toggle edit sent error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Delete for Everyone Bypass
// @route   POST /api/message-mods/delete-bypass
// @access  Private
exports.toggleDeleteBypass = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    const newValue = !existing.deleteForEveryoneBypass;
    
    user.messageModsSettings = mergeSettings({ ...existing, deleteForEveryoneBypass: newValue });
    user.markModified('messageModsSettings');
    await user.save();

    res.json({ success: true, deleteForEveryoneBypass: newValue });
  } catch (error) {
    console.error('Toggle delete bypass error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Message Encryption
// @route   POST /api/message-mods/encryption
// @access  Private
exports.toggleEncryption = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    const newValue = !existing.messageEncryptionToggle;
    
    user.messageModsSettings = mergeSettings({ ...existing, messageEncryptionToggle: newValue });
    user.markModified('messageModsSettings');
    await user.save();

    res.json({ success: true, messageEncryptionToggle: newValue });
  } catch (error) {
    console.error('Toggle encryption error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Message Translation
// @route   POST /api/message-mods/translation
// @access  Private
exports.toggleTranslation = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    const newValue = !existing.messageTranslation;
    
    user.messageModsSettings = mergeSettings({ ...existing, messageTranslation: newValue });
    user.markModified('messageModsSettings');
    await user.save();

    res.json({ success: true, messageTranslation: newValue });
  } catch (error) {
    console.error('Toggle translation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Message Transcription
// @route   POST /api/message-mods/transcription
// @access  Private
exports.toggleTranscription = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    const newValue = !existing.messageTranscription;
    
    user.messageModsSettings = mergeSettings({ ...existing, messageTranscription: newValue });
    user.markModified('messageModsSettings');
    await user.save();

    res.json({ success: true, messageTranscription: newValue });
  } catch (error) {
    console.error('Toggle transcription error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Blank (empty) Messages
// @route   POST /api/message-mods/blank-messages
// @access  Private
exports.toggleBlankMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.messageModsSettings?.toObject?.() || user.messageModsSettings || {};
    const newValue = !existing.blankMessages;

    user.messageModsSettings = mergeSettings({ ...existing, blankMessages: newValue });
    user.markModified('messageModsSettings');
    await user.save();

    res.json({ success: true, blankMessages: newValue });
  } catch (error) {
    console.error('Toggle blank messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send an empty (blank) message to a conversation
// @route   POST /api/message-mods/send-blank
// @access  Private
exports.sendBlankMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.messageModsSettings?.toObject?.() || user.messageModsSettings);
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
