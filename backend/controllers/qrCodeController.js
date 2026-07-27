const User = require('../models/User');
const QRCode = require('qrcode');

const defaultSettings = {
  qrCodeGeneratorEnabled: true,
  qrCodeScannerEnabled: true,
  autoScanLinks: false,
  saveQRCodes: true,
  generateForContacts: true,
  generateForGroups: true,
  generateForStatus: true,
  customQRStyle: false,
  qrCodeExpiration: 0, // 0 = never expires
  maxQRCodeSize: 1024
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

// @desc    Get QR code settings
// @route   GET /api/qr-code/settings
// @access  Private
exports.getQRCodeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.qrCodeSettings?.toObject?.() || user.qrCodeSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get QR code settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update QR code settings
// @route   POST /api/qr-code/settings
// @access  Private
exports.updateQRCodeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.qrCodeSettings?.toObject?.() || user.qrCodeSettings || {};
    
    user.qrCodeSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('qrCodeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.qrCodeSettings });
  } catch (error) {
    console.error('Update QR code settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate QR code
// @route   POST /api/qr-code/generate
// @access  Private
exports.generateQRCode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { data, size, color, backgroundColor, type } = req.body;

    if (!data) {
      return res.status(400).json({ success: false, message: 'Data is required' });
    }

    const settings = mergeSettings(user.qrCodeSettings?.toObject?.() || user.qrCodeSettings);
    
    if (!settings.qrCodeGeneratorEnabled) {
      return res.status(403).json({ success: false, message: 'QR code generation is disabled' });
    }

    const qrSize = size || settings.maxQRCodeSize;
    const qrColor = color || '#000000';
    const qrBgColor = backgroundColor || '#FFFFFF';

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data, {
        width: qrSize,
        margin: 2,
        color: {
          dark: qrColor,
          light: qrBgColor
        }
      });

      // Save QR code if enabled
      if (settings.saveQRCodes) {
        const savedQRCode = {
          _id: new (require('mongoose').Types.ObjectId)(),
          data,
          type: type || 'general',
          qrCodeDataUrl,
          createdAt: new Date(),
          expiresAt: settings.qrCodeExpiration > 0 
            ? new Date(Date.now() + settings.qrCodeExpiration * 24 * 60 * 60 * 1000) 
            : null
        };

        if (!user.savedQRCodes) user.savedQRCodes = [];
        user.savedQRCodes.push(savedQRCode);
        await user.save();
      }

      res.status(200).json({
        success: true,
        qrCodeDataUrl,
        data,
        size: qrSize
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

// @desc    Generate contact QR code
// @route   POST /api/qr-code/contact
// @access  Private
exports.generateContactQRCode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.qrCodeSettings?.toObject?.() || user.qrCodeSettings);
    
    if (!settings.generateForContacts) {
      return res.status(403).json({ success: false, message: 'Contact QR code generation is disabled' });
    }

    const contactData = {
      name: user.username || user.name,
      phone: user.phoneNumber || '',
      email: user.email || '',
      userId: user._id.toString()
    };

    const vCardData = `BEGIN:VCARD
VERSION:3.0
N:${contactData.name}
FN:${contactData.name}
TEL:${contactData.phone}
EMAIL:${contactData.email}
NOTE:GENZ User ID: ${contactData.userId}
END:VCARD`;

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(vCardData, {
        width: 512,
        margin: 2
      });

      res.status(200).json({
        success: true,
        qrCodeDataUrl,
        contactData,
        type: 'contact'
      });
    } catch (qrError) {
      console.error('Contact QR code generation error:', qrError);
      res.status(500).json({ success: false, message: 'Failed to generate contact QR code' });
    }
  } catch (error) {
    console.error('Generate contact QR code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate group QR code
// @route   POST /api/qr-code/group
// @access  Private
exports.generateGroupQRCode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ success: false, message: 'Conversation ID is required' });
    }

    const settings = mergeSettings(user.qrCodeSettings?.toObject?.() || user.qrCodeSettings);
    
    if (!settings.generateForGroups) {
      return res.status(403).json({ success: false, message: 'Group QR code generation is disabled' });
    }

    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findById(conversationId);

    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group conversation not found' });
    }

    if (!conversation.participants.includes(user._id.toString())) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
    }

    const groupData = {
      type: 'group',
      groupId: conversation._id.toString(),
      groupName: conversation.name || 'Unknown Group',
      inviteCode: conversation.inviteCode || conversation._id.toString()
    };

    const groupLink = `genz://group/${groupData.groupId}?code=${groupData.inviteCode}`;

    try {
      const qrCodeDataUrl = await QRCode.toDataURL(groupLink, {
        width: 512,
        margin: 2
      });

      res.status(200).json({
        success: true,
        qrCodeDataUrl,
        groupData,
        groupLink,
        type: 'group'
      });
    } catch (qrError) {
      console.error('Group QR code generation error:', qrError);
      res.status(500).json({ success: false, message: 'Failed to generate group QR code' });
    }
  } catch (error) {
    console.error('Generate group QR code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Scan QR code (mock implementation)
// @route   POST /api/qr-code/scan
// @access  Private
exports.scanQRCode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).json({ success: false, message: 'Image data is required' });
    }

    const settings = mergeSettings(user.qrCodeSettings?.toObject?.() || user.qrCodeSettings);
    
    if (!settings.qrCodeScannerEnabled) {
      return res.status(403).json({ success: false, message: 'QR code scanning is disabled' });
    }

    // In real implementation, use a QR code scanning library like jsQR
    // For now, return a mock response
    res.status(200).json({
      success: true,
      message: 'QR code scanning requires client-side implementation',
      note: 'Use a client-side QR code library like jsQR for actual scanning'
    });
  } catch (error) {
    console.error('Scan QR code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get saved QR codes
// @route   GET /api/qr-code/saved
// @access  Private
exports.getSavedQRCodes = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const saved = user.savedQRCodes || [];
    
    // Filter out expired QR codes
    const now = new Date();
    const validQRCodes = saved.filter(qr => !qr.expiresAt || qr.expiresAt > now);

    res.status(200).json({ success: true, savedQRCodes: validQRCodes });
  } catch (error) {
    console.error('Get saved QR codes error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete saved QR code
// @route   DELETE /api/qr-code/saved/:id
// @access  Private
exports.deleteSavedQRCode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    if (!user.savedQRCodes) {
      return res.status(404).json({ success: false, message: 'No saved QR codes found' });
    }

    const qrIndex = user.savedQRCodes.findIndex(qr => qr._id.toString() === id);
    if (qrIndex === -1) {
      return res.status(404).json({ success: false, message: 'QR code not found' });
    }

    user.savedQRCodes.splice(qrIndex, 1);
    await user.save();

    res.status(200).json({ success: true, message: 'QR code deleted' });
  } catch (error) {
    console.error('Delete saved QR code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle QR code features
// @route   POST /api/qr-code/toggle
// @access  Private
exports.toggleQRCodeFeatures = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { generatorEnabled, scannerEnabled } = req.body;
    const existing = user.qrCodeSettings?.toObject?.() || user.qrCodeSettings || {};
    
    user.qrCodeSettings = mergeSettings({
      ...existing,
      qrCodeGeneratorEnabled: generatorEnabled !== undefined ? generatorEnabled : existing.qrCodeGeneratorEnabled,
      qrCodeScannerEnabled: scannerEnabled !== undefined ? scannerEnabled : existing.qrCodeScannerEnabled
    });
    user.markModified('qrCodeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.qrCodeSettings });
  } catch (error) {
    console.error('Toggle QR code features error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset QR code settings to default
// @route   POST /api/qr-code/reset
// @access  Private
exports.resetQRCodeSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.qrCodeSettings = mergeSettings({});
    user.markModified('qrCodeSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.qrCodeSettings });
  } catch (error) {
    console.error('Reset QR code settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
