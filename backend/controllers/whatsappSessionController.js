const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const qrcode = require('qrcode');
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');

// ============================================================================
// WhatsApp Web session management (from whatsappWebController)
// ============================================================================

const whatsappWebDefaultSettings = {
  whatsappWebEnabled: false,
  autoConnect: false,
  keepLoggedIn: true,
  sessionTimeout: 30, // days
  syncChats: true,
  syncContacts: true,
  syncMedia: true,
  notificationsEnabled: true,
  desktopNotifications: true,
  soundEnabled: true,
  qrCodeRefreshInterval: 60, // seconds
  maxConnectedDevices: 4
};

const mergeWhatsAppWebSettings = createSettingsMerger(whatsappWebDefaultSettings);

// @desc    Get WhatsApp Web settings
// @route   GET /api/whatsapp-web/settings
// @access  Private
const { getSettings: getWhatsAppWebSettings, updateSettings: updateWhatsAppWebSettings, resetSettings: resetWhatsAppWebSettings } = createSettingsHandlers({
  field: 'whatsappWebSettings',
  label: 'WhatsApp Web',
  mergeSettings: mergeWhatsAppWebSettings,
});

exports.getWhatsAppWebSettings = getWhatsAppWebSettings;

// @desc    Update WhatsApp Web settings
// @route   POST /api/whatsapp-web/settings
// @access  Private
exports.updateWhatsAppWebSettings = updateWhatsAppWebSettings;

// @desc    Generate QR code for WhatsApp Web connection
// @route   POST /api/whatsapp-web/qr-code
// @access  Private
exports.generateQRCode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeWhatsAppWebSettings(user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings);
    
    if (!settings.whatsappWebEnabled) {
      return res.status(403).json({ success: false, message: 'WhatsApp Web is disabled' });
    }

    // Check if user has too many connected devices
    const connectedDevices = user.connectedDevices || [];
    if (connectedDevices.length >= settings.maxConnectedDevices) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${settings.maxConnectedDevices} devices allowed` 
      });
    }

    // Generate a unique session ID
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    
    // Generate QR code (in real implementation, this would be from WhatsApp Web API)
    const qrCodeData = `genz-whatsapp-web:${user._id}:${sessionId}`;
    
    try {
      const qrCodeDataUrl = await qrcode.toDataURL(qrCodeData, {
        width: 300,
        margin: 2
      });

      // Store session info
      const sessionInfo = {
        _id: new (require('mongoose').Types.ObjectId)(),
        sessionId,
        qrCode: qrCodeDataUrl,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + settings.qrCodeRefreshInterval * 1000),
        status: 'pending'
      };

      if (!user.whatsappWebSessions) user.whatsappWebSessions = [];
      user.whatsappWebSessions.push(sessionInfo);
      user.markModified('whatsappWebSessions');
      await user.save();

      res.status(200).json({
        success: true,
        qrCode: qrCodeDataUrl,
        sessionId: sessionInfo._id,
        expiresAt: sessionInfo.expiresAt
      });
    } catch (qrError) {
      console.error('QR code generation error:', qrError);
      res.status(500).json({ success: false, message: 'Failed to generate QR code' });
    }
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check connection status
// @route   GET /api/whatsapp-web/status
// @access  Private
exports.getConnectionStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeWhatsAppWebSettings(user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings);
    
    const connectedDevices = user.connectedDevices || [];
    const activeSessions = (user.whatsappWebSessions || []).filter(
      s => s.status === 'connected' && (!s.expiresAt || s.expiresAt > new Date())
    );

    res.status(200).json({
      success: true,
      enabled: settings.whatsappWebEnabled,
      connected: activeSessions.length > 0,
      connectedDevices: connectedDevices.length,
      activeSessions: activeSessions.length,
      maxDevices: settings.maxConnectedDevices,
      devices: connectedDevices
    });
  } catch (error) {
    console.error('Get connection status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Connect device (mock)
// @route   POST /api/whatsapp-web/connect
// @access  Private
exports.connectDevice = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { sessionId, deviceName, deviceType } = req.body;

    if (!sessionId || !deviceName) {
      return res.status(400).json({ success: false, message: 'Session ID and device name are required' });
    }

    const settings = mergeWhatsAppWebSettings(user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings);
    
    if (!settings.whatsappWebEnabled) {
      return res.status(403).json({ success: false, message: 'WhatsApp Web is disabled' });
    }

    const session = (user.whatsappWebSessions || []).find(s => s._id.toString() === sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.expiresAt && new Date() > session.expiresAt) {
      return res.status(400).json({ success: false, message: 'Session has expired' });
    }

    // Add connected device
    const connectedDevice = {
      _id: new (require('mongoose').Types.ObjectId)(),
      sessionId,
      deviceName,
      deviceType: deviceType || 'desktop',
      connectedAt: new Date(),
      lastActive: new Date(),
      status: 'connected'
    };

    if (!user.connectedDevices) user.connectedDevices = [];
    user.connectedDevices.push(connectedDevice);
    user.markModified('connectedDevices');

    // Update session status
    const sessionIndex = user.whatsappWebSessions.findIndex(s => s._id.toString() === sessionId);
    if (sessionIndex !== -1) {
      user.whatsappWebSessions[sessionIndex].status = 'connected';
      user.markModified('whatsappWebSessions');
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Device connected successfully',
      device: connectedDevice
    });
  } catch (error) {
    console.error('Connect device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Disconnect device
// @route   DELETE /api/whatsapp-web/disconnect/:deviceId
// @access  Private
exports.disconnectDevice = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { deviceId } = req.params;

    if (!user.connectedDevices) {
      return res.status(404).json({ success: false, message: 'No connected devices found' });
    }

    const deviceIndex = user.connectedDevices.findIndex(d => d._id.toString() === deviceId);
    if (deviceIndex === -1) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const device = user.connectedDevices[deviceIndex];
    user.connectedDevices.splice(deviceIndex, 1);
    user.markModified('connectedDevices');

    // Update session status
    const sessionIndex = (user.whatsappWebSessions || []).findIndex(
      s => s.sessionId === device.sessionId
    );
    if (sessionIndex !== -1) {
      user.whatsappWebSessions[sessionIndex].status = 'disconnected';
      user.markModified('whatsappWebSessions');
    }

    await user.save();

    res.status(200).json({ success: true, message: 'Device disconnected successfully' });
  } catch (error) {
    console.error('Disconnect device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get connected devices
// @route   GET /api/whatsapp-web/devices
// @access  Private
exports.getConnectedDevices = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const devices = user.connectedDevices || [];
    res.status(200).json({ success: true, devices });
  } catch (error) {
    console.error('Get connected devices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Logout from all devices
// @route   POST /api/whatsapp-web/logout-all
// @access  Private
exports.logoutAllDevices = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.connectedDevices = [];
    user.markModified('connectedDevices');
    
    // Update all sessions to disconnected
    if (user.whatsappWebSessions) {
      user.whatsappWebSessions.forEach(s => {
        s.status = 'disconnected';
      });
      user.markModified('whatsappWebSessions');
    }

    await user.save();

    res.status(200).json({ success: true, message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all devices error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle WhatsApp Web
// @route   POST /api/whatsapp-web/toggle
// @access  Private
exports.toggleWhatsAppWeb = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings || {};
    
    user.whatsappWebSettings = mergeWhatsAppWebSettings({
      ...existing,
      whatsappWebEnabled: enabled !== undefined ? enabled : !existing.whatsappWebEnabled
    });
    user.markModified('whatsappWebSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.whatsappWebSettings });
  } catch (error) {
    console.error('Toggle WhatsApp Web error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update sync settings
// @route   POST /api/whatsapp-web/sync-settings
// @access  Private
exports.updateSyncSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { syncChats, syncContacts, syncMedia } = req.body;
    const existing = user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings || {};

    // Only set the keys actually provided, so unset fields keep their
    // defaults instead of being overwritten with undefined.
    const updated = { ...existing };
    if (syncChats !== undefined) updated.syncChats = syncChats;
    if (syncContacts !== undefined) updated.syncContacts = syncContacts;
    if (syncMedia !== undefined) updated.syncMedia = syncMedia;

    user.whatsappWebSettings = mergeWhatsAppWebSettings(updated);
    user.markModified('whatsappWebSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.whatsappWebSettings });
  } catch (error) {
    console.error('Update sync settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset WhatsApp Web settings to default
// @route   POST /api/whatsapp-web/reset
// @access  Private
exports.resetWhatsAppWebSettings = resetWhatsAppWebSettings;

// ============================================================================
// Bulk sender (from bulkSenderController)
// ============================================================================

const bulkSenderDefaultSettings = {
  bulkSendingEnabled: true,
  maxRecipientsPerBatch: 100,
  delayBetweenMessages: 1000, // milliseconds
  allowGroups: true,
  allowBroadcasts: true,
  trackDelivery: true,
  autoRetryFailed: true,
  maxRetries: 3,
  requireConfirmation: true,
  scheduleBulkMessages: true
};

const mergeBulkSenderSettings = createSettingsMerger(bulkSenderDefaultSettings);

// @desc    Get bulk sender settings
// @route   GET /api/bulk-sender/settings
// @access  Private
const { getSettings: getBulkSenderSettings, updateSettings: updateBulkSenderSettings, resetSettings: resetBulkSenderSettings } = createSettingsHandlers({
  field: 'bulkSenderSettings',
  label: 'bulk sender',
  mergeSettings: mergeBulkSenderSettings,
});

exports.getBulkSenderSettings = getBulkSenderSettings;

// @desc    Update bulk sender settings
// @route   POST /api/bulk-sender/settings
// @access  Private
exports.updateBulkSenderSettings = updateBulkSenderSettings;

// @desc    Send bulk message
// @route   POST /api/bulk-sender/send
// @access  Private
exports.sendBulkMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { recipients, content, messageType, mediaUrl, delay, scheduleTime } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'Recipients are required' });
    }

    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, message: 'Content or media URL is required' });
    }

    const settings = mergeBulkSenderSettings(user.bulkSenderSettings?.toObject?.() || user.bulkSenderSettings);
    
    if (!settings.bulkSendingEnabled) {
      return res.status(403).json({ success: false, message: 'Bulk sending is disabled' });
    }

    if (recipients.length > settings.maxRecipientsPerBatch) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${settings.maxRecipientsPerBatch} recipients allowed per batch` 
      });
    }

    if (scheduleTime) {
      // Schedule the bulk message
      const scheduledMessage = {
        _id: new (require('mongoose').Types.ObjectId)(),
        recipients,
        content,
        messageType,
        mediaUrl,
        scheduledFor: new Date(scheduleTime),
        createdBy: user._id,
        createdAt: new Date(),
        status: 'scheduled'
      };

      if (!user.scheduledBulkMessages) user.scheduledBulkMessages = [];
      user.scheduledBulkMessages.push(scheduledMessage);
      user.markModified('scheduledBulkMessages');
      await user.save();

      return res.status(200).json({
        success: true,
        message: 'Bulk message scheduled successfully',
        scheduledMessageId: scheduledMessage._id,
        scheduledFor: scheduledMessage.scheduledFor
      });
    }

    // Send immediately
    const results = [];
    const errors = [];
    const messageDelay = delay || settings.delayBetweenMessages;

    for (let i = 0; i < recipients.length; i++) {
      const recipientId = recipients[i];
      
      try {
        const conversation = await Conversation.findOne({
          participants: { $all: [user._id, recipientId] },
          isGroup: false
        });

        if (!conversation) {
          errors.push({ recipientId, error: 'Conversation not found' });
          continue;
        }

        const message = await Message.create({
          conversationId: conversation._id,
          sender: user._id,
          content: content || '',
          messageType: messageType || 'text',
          mediaUrl: mediaUrl || null,
          bulkMessage: true,
          bulkBatchId: new (require('mongoose').Types.ObjectId)()
        });

        results.push({ recipientId, messageId: message._id });

        // Add delay between messages
        if (i < recipients.length - 1 && messageDelay > 0) {
          await new Promise(resolve => setTimeout(resolve, messageDelay));
        }
      } catch (err) {
        errors.push({ recipientId, error: err.message });
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
    console.error('Send bulk message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get scheduled bulk messages
// @route   GET /api/bulk-sender/scheduled
// @access  Private
exports.getScheduledBulkMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const scheduled = user.scheduledBulkMessages || [];
    res.status(200).json({ success: true, scheduled });
  } catch (error) {
    console.error('Get scheduled bulk messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel scheduled bulk message
// @route   DELETE /api/bulk-sender/scheduled/:id
// @access  Private
exports.cancelScheduledBulkMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    if (!user.scheduledBulkMessages) {
      return res.status(404).json({ success: false, message: 'No scheduled messages found' });
    }

    const messageIndex = user.scheduledBulkMessages.findIndex(msg => msg._id.toString() === id);
    if (messageIndex === -1) {
      return res.status(404).json({ success: false, message: 'Scheduled message not found' });
    }

    user.scheduledBulkMessages.splice(messageIndex, 1);
    user.markModified('scheduledBulkMessages');
    await user.save();

    res.status(200).json({ success: true, message: 'Scheduled bulk message cancelled' });
  } catch (error) {
    console.error('Cancel scheduled bulk message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bulk message history
// @route   GET /api/bulk-sender/history
// @access  Private
exports.getBulkMessageHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { limit = 20, offset = 0 } = req.query;

    const bulkMessages = await Message.find({
      sender: user._id,
      bulkMessage: true
    })
      .populate('conversationId', 'name')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Message.countDocuments({
      sender: user._id,
      bulkMessage: true
    });

    res.status(200).json({
      success: true,
      messages: bulkMessages,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get bulk message history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bulk message delivery status
// @route   GET /api/bulk-sender/delivery/:batchId
// @access  Private
exports.getBulkMessageDeliveryStatus = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { batchId } = req.params;

    const messages = await Message.find({
      sender: user._id,
      bulkBatchId: batchId
    });

    const delivered = messages.filter(msg => msg.status === 'delivered').length;
    const failed = messages.filter(msg => msg.status === 'failed').length;
    const pending = messages.filter(msg => msg.status === 'sent').length;

    res.status(200).json({
      success: true,
      batchId,
      total: messages.length,
      delivered,
      failed,
      pending,
      messages
    });
  } catch (error) {
    console.error('Get bulk message delivery status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle bulk sending
// @route   POST /api/bulk-sender/toggle
// @access  Private
exports.toggleBulkSending = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.bulkSenderSettings?.toObject?.() || user.bulkSenderSettings || {};
    
    user.bulkSenderSettings = mergeBulkSenderSettings({
      ...existing,
      bulkSendingEnabled: enabled !== undefined ? enabled : !existing.bulkSendingEnabled
    });
    user.markModified('bulkSenderSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.bulkSenderSettings });
  } catch (error) {
    console.error('Toggle bulk sending error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset bulk sender settings to default
// @route   POST /api/bulk-sender/reset
// @access  Private
exports.resetBulkSenderSettings = resetBulkSenderSettings;

// ============================================================================
// Multi accounts (from multiAccountsController)
// ============================================================================

const multiAccountsDefaultSettings = {
  multiAccountsEnabled: false,
  maxAccounts: 5,
  currentAccounts: [],
  activeAccountId: null,
  syncSettings: false,
  syncChats: false,
  syncContacts: false,
  autoSwitch: false,
  switchInterval: 60, // minutes
  notificationsPerAccount: true,
  unifiedInbox: false
};

const mergeMultiAccountsSettings = createSettingsMerger(multiAccountsDefaultSettings);

// @desc    Get multi accounts settings
// @route   GET /api/multi-accounts/settings
// @access  Private
const { getSettings: getMultiAccountsSettings, updateSettings: updateMultiAccountsSettings, resetSettings: resetMultiAccountsSettings } = createSettingsHandlers({
  field: 'multiAccountsSettings',
  label: 'multi accounts',
  mergeSettings: mergeMultiAccountsSettings,
});

exports.getMultiAccountsSettings = getMultiAccountsSettings;

// @desc    Update multi accounts settings
// @route   POST /api/multi-accounts/settings
// @access  Private
exports.updateMultiAccountsSettings = updateMultiAccountsSettings;

// @desc    Enable multi accounts
// @route   POST /api/multi-accounts/enable
// @access  Private
exports.enableMultiAccounts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    user.multiAccountsSettings = mergeMultiAccountsSettings({
      ...existing,
      multiAccountsEnabled: true,
      currentAccounts: [
        {
          _id: new (require('mongoose').Types.ObjectId)(),
          name: 'Primary Account',
          phoneNumber: user.phoneNumber || '',
          isActive: true,
          createdAt: new Date()
        }
      ],
      activeAccountId: new (require('mongoose').Types.ObjectId)()
    });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.multiAccountsSettings });
  } catch (error) {
    console.error('Enable multi accounts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Disable multi accounts
// @route   POST /api/multi-accounts/disable
// @access  Private
exports.disableMultiAccounts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    user.multiAccountsSettings = mergeMultiAccountsSettings({
      ...existing,
      multiAccountsEnabled: false,
      currentAccounts: [],
      activeAccountId: null
    });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.multiAccountsSettings });
  } catch (error) {
    console.error('Disable multi accounts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add account
// @route   POST /api/multi-accounts/add
// @access  Private
exports.addAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { name, phoneNumber, profilePicture } = req.body;

    if (!name || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'Name and phone number are required' });
    }

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    if (!existing.multiAccountsEnabled) {
      return res.status(403).json({ success: false, message: 'Multi accounts is not enabled' });
    }

    if (existing.currentAccounts && existing.currentAccounts.length >= existing.maxAccounts) {
      return res.status(400).json({ 
        success: false, 
        message: `Maximum ${existing.maxAccounts} accounts allowed` 
      });
    }

    if (!existing.currentAccounts) existing.currentAccounts = [];
    
    const newAccount = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name,
      phoneNumber,
      profilePicture: profilePicture || '',
      isActive: false,
      createdAt: new Date()
    };

    existing.currentAccounts.push(newAccount);

    user.multiAccountsSettings = mergeMultiAccountsSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, accounts: user.multiAccountsSettings.currentAccounts });
  } catch (error) {
    console.error('Add account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove account
// @route   DELETE /api/multi-accounts/remove/:id
// @access  Private
exports.removeAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    if (!existing.currentAccounts) {
      return res.status(404).json({ success: false, message: 'No accounts found' });
    }

    const index = existing.currentAccounts.findIndex(acc => acc._id.toString() === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    if (existing.currentAccounts.length <= 1) {
      return res.status(400).json({ success: false, message: 'Cannot remove the last account' });
    }

    existing.currentAccounts.splice(index, 1);

    // Reset active account if it was the removed one
    if (existing.activeAccountId?.toString() === id) {
      existing.activeAccountId = existing.currentAccounts[0]._id;
    }

    user.multiAccountsSettings = mergeMultiAccountsSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, accounts: user.multiAccountsSettings.currentAccounts });
  } catch (error) {
    console.error('Remove account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Switch active account
// @route   POST /api/multi-accounts/switch
// @access  Private
exports.switchAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { accountId } = req.body;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    if (!existing.currentAccounts) {
      return res.status(404).json({ success: false, message: 'No accounts found' });
    }

    const account = existing.currentAccounts.find(acc => acc._id.toString() === accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    // Update active status
    existing.currentAccounts.forEach(acc => {
      acc.isActive = acc._id.toString() === accountId;
    });

    existing.activeAccountId = accountId;

    user.multiAccountsSettings = mergeMultiAccountsSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ 
      success: true, 
      activeAccountId: user.multiAccountsSettings.activeAccountId,
      accounts: user.multiAccountsSettings.currentAccounts
    });
  } catch (error) {
    console.error('Switch account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update account
// @route   POST /api/multi-accounts/update/:id
// @access  Private
exports.updateAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;
    const { name, phoneNumber, profilePicture } = req.body;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    if (!existing.currentAccounts) {
      return res.status(404).json({ success: false, message: 'No accounts found' });
    }

    const account = existing.currentAccounts.find(acc => acc._id.toString() === id);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    account.name = name || account.name;
    account.phoneNumber = phoneNumber || account.phoneNumber;
    account.profilePicture = profilePicture !== undefined ? profilePicture : account.profilePicture;

    user.multiAccountsSettings = mergeMultiAccountsSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, accounts: user.multiAccountsSettings.currentAccounts });
  } catch (error) {
    console.error('Update account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clone an existing account (account cloning)
// @route   POST /api/multi-accounts/clone
// @access  Private
exports.cloneAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { accountId, newName } = req.body;

    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};

    if (!existing.multiAccountsEnabled) {
      return res.status(403).json({ success: false, message: 'Multi accounts is not enabled' });
    }

    if (!existing.currentAccounts || existing.currentAccounts.length === 0) {
      return res.status(404).json({ success: false, message: 'No accounts found to clone' });
    }

    const source = accountId
      ? existing.currentAccounts.find(acc => acc._id.toString() === accountId)
      : existing.currentAccounts[0];

    if (!source) {
      return res.status(404).json({ success: false, message: 'Source account not found' });
    }

    if (existing.currentAccounts.length >= existing.maxAccounts) {
      return res.status(400).json({
        success: false,
        message: `Maximum ${existing.maxAccounts} accounts allowed`
      });
    }

    const clonedAccount = {
      _id: new (require('mongoose').Types.ObjectId)(),
      name: newName || `${source.name} (Clone)`,
      phoneNumber: source.phoneNumber,
      profilePicture: source.profilePicture || '',
      clonedFrom: source._id,
      isActive: false,
      createdAt: new Date()
    };

    existing.currentAccounts.push(clonedAccount);

    user.multiAccountsSettings = mergeMultiAccountsSettings({ ...existing });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, account: clonedAccount, accounts: user.multiAccountsSettings.currentAccounts });
  } catch (error) {
    console.error('Clone account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all accounts
// @route   GET /api/multi-accounts/accounts
// @access  Private
exports.getAccounts = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeMultiAccountsSettings(user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings);
    res.status(200).json({ 
      success: true, 
      accounts: settings.currentAccounts || [],
      activeAccountId: settings.activeAccountId
    });
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle unified inbox
// @route   POST /api/multi-accounts/unified-inbox
// @access  Private
exports.toggleUnifiedInbox = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.multiAccountsSettings?.toObject?.() || user.multiAccountsSettings || {};
    
    user.multiAccountsSettings = mergeMultiAccountsSettings({
      ...existing,
      unifiedInbox: enabled !== undefined ? enabled : !existing.unifiedInbox
    });
    user.markModified('multiAccountsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.multiAccountsSettings });
  } catch (error) {
    console.error('Toggle unified inbox error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset multi accounts settings to default
// @route   POST /api/multi-accounts/reset
// @access  Private
exports.resetMultiAccountsSettings = resetMultiAccountsSettings;
