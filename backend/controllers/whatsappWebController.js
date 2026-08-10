
const qrcode = require('qrcode');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
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


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get WhatsApp Web settings
// @route   GET /api/whatsapp-web/settings
// @access  Private
exports.getWhatsAppWebSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get WhatsApp Web settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update WhatsApp Web settings
// @route   POST /api/whatsapp-web/settings
// @access  Private
exports.updateWhatsAppWebSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings || {};
    
    user.whatsappWebSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('whatsappWebSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.whatsappWebSettings });
  } catch (error) {
    console.error('Update WhatsApp Web settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate QR code for WhatsApp Web connection
// @route   POST /api/whatsapp-web/qr-code
// @access  Private
exports.generateQRCode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings);
    
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

    const settings = mergeSettings(user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings);
    
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

    const settings = mergeSettings(user.whatsappWebSettings?.toObject?.() || user.whatsappWebSettings);
    
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
    
    user.whatsappWebSettings = mergeSettings({
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
    
    user.whatsappWebSettings = mergeSettings({
      ...existing,
      syncChats: syncChats !== undefined ? syncChats : existing.syncChats,
      syncContacts: syncContacts !== undefined ? syncContacts : existing.syncContacts,
      syncMedia: syncMedia !== undefined ? syncMedia : existing.syncMedia
    });
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
exports.resetWhatsAppWebSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.whatsappWebSettings = mergeSettings({});
    user.markModified('whatsappWebSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.whatsappWebSettings });
  } catch (error) {
    console.error('Reset WhatsApp Web settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

