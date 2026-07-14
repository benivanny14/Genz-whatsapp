const Message = require('../models/Message');
const User = require('../models/User');

const defaultSettings = {
  antiDeleteMessages: true,
  antiDeleteStatus: true,
  ghostMode: false,
  hideLastSeen: false,
  hideOnline: false,
  hideTyping: false,
  hideRecording: false,
  autoReply: { enabled: false, message: '', keywords: [] },
  antiViewOnce: false,
  voiceEffect: 'none',
  highResMedia: false,
  autoDownloadMedia: false,
  autoSaveMedia: false,
  chatBackgroundMusic: { enabled: false, track: '' },
  readReceipts: true,
  typingIndicators: true,
  onlineStatusVisible: true,
  freezeLastSeen: false,
  alwaysOnline: false,
  spamFilter: false,
  selfDestruct: false,
  noForwardLabel: false,
  hideBlueTickColor: false,
  linkPreview: true,
  clientE2EE: false,
  debugEncryption: false
};

const normalizeIncomingMods = (incoming = {}, existing = {}) => {
  const normalized = { ...incoming };

  if (typeof incoming.autoReply === 'boolean') {
    normalized.autoReply = {
      ...defaultSettings.autoReply,
      ...(existing.autoReply || {}),
      enabled: incoming.autoReply,
      message: incoming.autoReplyMsg || existing.autoReply?.message || ''
    };
    delete normalized.autoReplyMsg;
  } else if (incoming.autoReplyMsg && typeof incoming.autoReply === 'object') {
    normalized.autoReply = {
      ...defaultSettings.autoReply,
      ...incoming.autoReply,
      message: incoming.autoReplyMsg
    };
    delete normalized.autoReplyMsg;
  }

  if (typeof incoming.chatMusic === 'boolean' || incoming.chatMusicUrl !== undefined) {
    normalized.chatBackgroundMusic = {
      ...defaultSettings.chatBackgroundMusic,
      ...(existing.chatBackgroundMusic || {}),
      enabled: Boolean(incoming.chatMusic),
      track: incoming.chatMusicUrl || existing.chatBackgroundMusic?.track || ''
    };
    delete normalized.chatMusic;
    delete normalized.chatMusicUrl;
  }

  if (typeof incoming.antiDelete === 'boolean') {
    normalized.antiDeleteMessages = incoming.antiDelete;
  }

  if (typeof incoming.hideReadReceipts === 'boolean') {
    normalized.readReceipts = !incoming.hideReadReceipts;
  }

  if (typeof incoming.ghostMode === 'boolean' && incoming.ghostMode) {
    normalized.hideOnline = true;
    normalized.hideTyping = true;
    normalized.hideRecording = true;
  }

  return normalized;
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
  ...settings,
  autoReply: {
    ...defaultSettings.autoReply,
    ...(settings.autoReply || {})
  },
  chatBackgroundMusic: {
    ...defaultSettings.chatBackgroundMusic,
    ...(settings.chatBackgroundMusic || {})
  }
});

exports.updateGenzModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.genzMods?.toObject?.() || user.genzMods || {};
    const normalizedIncoming = normalizeIncomingMods(incoming, existing);
    user.genzMods = mergeSettings({ ...existing, ...normalizedIncoming });
    user.markModified('genzMods');

    if (
      Object.prototype.hasOwnProperty.call(normalizedIncoming, 'autoReply') ||
      Object.prototype.hasOwnProperty.call(incoming, 'autoReply')
    ) {
      user.autoReplyEnabled = Boolean(user.genzMods.autoReply?.enabled);
      user.autoReplyMessage = user.genzMods.autoReply?.message || '';
    }

    await user.save();
    res.status(200).json({ success: true, settings: user.genzMods });
  } catch (error) {
    console.error('Update GENZ Mods error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGenzModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    res.status(200).json({
      success: true,
      settings: mergeSettings(user.genzMods?.toObject?.() || user.genzMods)
    });
  } catch (error) {
    console.error('Get GENZ Mods error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDeletedMessages = async (req, res) => {
  try {
    const userId = req.user._id.toString();
    const messages = await Message.find({
      deletedForEveryone: true,
      originalContent: { $ne: '' },
      $or: [{ sender: userId }, { readBy: { $elemMatch: { user: userId } } }]
    })
      .populate('sender', 'username profilePicture')
      .sort({ deletedAt: -1 })
      .limit(100);

    res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Get deleted messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.restoreDeletedMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (message.originalContent) {
      message.content = message.originalContent;
      message.deletedForEveryone = false;
      message.wasDeletedBySender = false;
      message.deletedAt = null;
      await message.save();
    }

    res.status(200).json({ success: true, message: 'Message restored', restoredMessage: message });
  } catch (error) {
    console.error('Restore deleted message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.processAutoReply = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const autoReply = req.body.autoReply || req.body;
    user.genzMods = mergeSettings({
      ...(user.genzMods?.toObject?.() || user.genzMods || {}),
      autoReply: {
        ...defaultSettings.autoReply,
        ...(user.genzMods?.autoReply?.toObject?.() || user.genzMods?.autoReply || {}),
        ...autoReply
      }
    });
    user.markModified('genzMods');
    user.autoReplyEnabled = Boolean(user.genzMods.autoReply.enabled);
    user.autoReplyMessage = user.genzMods.autoReply.message || '';
    await user.save();

    res.status(200).json({ success: true, autoReply: user.genzMods.autoReply });
  } catch (error) {
    console.error('Process auto-reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAutoReply = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    res.status(200).json({
      success: true,
      autoReply: mergeSettings(user.genzMods?.toObject?.() || user.genzMods).autoReply
    });
  } catch (error) {
    console.error('Get auto-reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('isOnline lastSeen genzMods');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const settings = mergeSettings(user.genzMods?.toObject?.() || user.genzMods);
    res.status(200).json({
      success: true,
      userStatus: {
        isOnline: settings.alwaysOnline ? true : (settings.hideOnline || !settings.onlineStatusVisible ? false : user.isOnline),
        lastSeen: settings.hideLastSeen || settings.freezeLastSeen ? null : user.lastSeen
      }
    });
  } catch (error) {
    console.error('Get user status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateGhostMode = async (req, res) => {
  req.body = {
    ...req.body,
    ghostMode: req.body.enabled ?? req.body.ghostMode ?? true,
    hideOnline: req.body.hideOnline ?? req.body.enabled ?? true,
    hideTyping: req.body.hideTyping ?? req.body.enabled ?? true,
    hideRecording: req.body.hideRecording ?? req.body.enabled ?? true
  };
  return exports.updateGenzModsSettings(req, res);
};

exports.updateReadReceipts = async (req, res) => {
  req.body = { readReceipts: Boolean(req.body.enabled) };
  return exports.updateGenzModsSettings(req, res);
};

exports.updateTypingIndicators = async (req, res) => {
  req.body = { typingIndicators: Boolean(req.body.enabled), hideTyping: !req.body.enabled };
  return exports.updateGenzModsSettings(req, res);
};

exports.updateOnlineStatus = async (req, res) => {
  req.body = { onlineStatusVisible: Boolean(req.body.visible), hideOnline: !req.body.visible };
  return exports.updateGenzModsSettings(req, res);
};

exports.freezeLastSeen = async (req, res) => {
  req.body = { freezeLastSeen: Boolean(req.body.freeze), hideLastSeen: Boolean(req.body.freeze) };
  return exports.updateGenzModsSettings(req, res);
};

exports.getMessageTracking = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId)
      .populate('readBy.user', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture');

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    res.json({
      success: true,
      tracking: {
        status: message.status,
        readBy: message.readBy,
        reactions: message.reactions,
        deletedForEveryone: message.deletedForEveryone,
        editedAt: message.editedAt
      }
    });
  } catch (error) {
    console.error('Get message tracking error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getModStats = async (req, res) => {
  try {
    const settings = mergeSettings(req.user.genzMods?.toObject?.() || req.user.genzMods);
    const enabledCount = Object.values(settings).filter(value => {
      if (typeof value === 'boolean') return value;
      if (value && typeof value === 'object') return value.enabled;
      return false;
    }).length;

    res.json({ success: true, stats: { enabledCount, settings } });
  } catch (error) {
    console.error('Get mod stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.exportModSettings = async (req, res) => {
  res.json({
    success: true,
    exportedAt: new Date().toISOString(),
    settings: mergeSettings(req.user.genzMods?.toObject?.() || req.user.genzMods)
  });
};

exports.importModSettings = async (req, res) => {
  req.body = req.body.settings || req.body;
  return exports.updateGenzModsSettings(req, res);
};
