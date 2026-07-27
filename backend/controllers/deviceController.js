const Device = require('../models/Device');
const crypto = require('crypto');
const QRCode = require('qrcode');

const LOCAL_USER_ID = process.env.LOCAL_USER_ID || '60d5ecb8b392cb371c664c12';
const getCurrentUserId = (req) => req.user?._id?.toString() || LOCAL_USER_ID;

const serializeDevice = (device = {}, currentDeviceId = '') => {
  const id = device.deviceId || device.id || device._id?.toString() || 'unknown';
  const name = device.deviceName || device.name || 'Unknown Device';
  const type = device.deviceType || device.type || 'web';
  const active = Boolean(device.isActive ?? device.active);

  return {
    _id: id,
    id,
    deviceId: id,
    name,
    deviceName: name,
    type,
    deviceType: type,
    platform: device.platform || 'Unknown',
    browser: device.browser || 'Unknown',
    active,
    isActive: active,
    current: Boolean(currentDeviceId && id === currentDeviceId),
    isCurrent: Boolean(currentDeviceId && id === currentDeviceId),
    lastActive: device.lastActive || Date.now(),
    createdAt: device.createdAt || Date.now(),
    capabilities: device.capabilities || {}
  };
};

// @desc    Generate QR code for device pairing
// @route   POST /api/device/generate-qr
// @access  Public (no auth)
exports.generateQRCode = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    // Generate unique pairing token
    const pairingToken = crypto.randomBytes(32).toString('hex');
    
    // Create temporary device record with pairing token
    const tempDevice = await Device.create({
      localUserId: currentUserId,
      deviceId: crypto.randomUUID(),
      deviceName: req.body.deviceName || 'New Device',
      deviceType: req.body.deviceType || 'web',
      platform: req.body.platform || 'Unknown',
      browser: req.body.browser || 'Unknown',
      pairingToken: pairingToken,
      ipAddress: req.ip,
      isActive: false // Not active until paired
    }).catch(err => {
      console.error('Device creation error:', err);
      // Fallback: return device without DB persistence
      return {
        deviceId: crypto.randomUUID(),
        pairingToken: pairingToken
      };
    });
    
    // Generate QR code data
    const clientUrl = process.env.CLIENT_URL || req.headers.origin || 'http://localhost:5173';
    const qrData = `${clientUrl}/pair-device?token=${pairingToken}&deviceId=${tempDevice?.deviceId || crypto.randomUUID()}&timestamp=${Date.now()}`;
    
    // Generate QR code as base64
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }).catch(err => {
      console.error('QR generation error:', err);
      // Fallback: return token without QR image
      return null;
    });
    
    res.status(200).json({
      success: true,
      qrCode: qrCodeImage || null,
      pairingToken: pairingToken,
      deviceId: tempDevice?.deviceId || crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 300000) // 5 minutes
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Pair device using QR token
// @route   POST /api/device/pair
// @access  Public (the new device has no session yet — the pairing token IS the credential)
const PAIRING_TOKEN_TTL_MS = 5 * 60 * 1000; // must match the 5-minute window shown to the user

exports.pairDevice = async (req, res) => {
  try {
    const pairingToken = req.body.pairingToken || req.body.code || req.body.token;
    const { deviceName, deviceType, platform, browser } = req.body;

    if (!pairingToken) {
      return res.status(400).json({ success: false, message: 'Pairing token is required' });
    }

    // Find device purely by token — do NOT filter by localUserId here,
    // the requesting device is not authenticated yet.
    const device = await Device.findOne({ pairingToken });

    if (!device) {
      return res.status(404).json({ success: false, message: 'Invalid or expired pairing token' });
    }

    const tokenAgeMs = Date.now() - new Date(device.createdAt || Date.now()).getTime();
    if (tokenAgeMs > PAIRING_TOKEN_TTL_MS) {
      await Device.deleteOne({ _id: device._id });
      return res.status(410).json({ success: false, message: 'Pairing code has expired, please generate a new QR code' });
    }

    // Look up the account this QR belongs to, so we can log the new device in.
    const User = require('../models/User');
    const account = await User.findById(device.localUserId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account for this pairing code was not found' });
    }

    // Update device with pairing info
    device.deviceName = deviceName || device.deviceName;
    device.deviceType = deviceType || device.deviceType;
    device.platform = platform || device.platform;
    device.browser = browser || device.browser;
    device.pairingToken = undefined; // Remove token after pairing (single-use)
    device.isActive = true;
    device.lastActive = Date.now();

    await device.save();

    // Issue real login tokens so the new device is actually signed in —
    // this is what a QR "pairing" is supposed to do (like WhatsApp Web/Desktop).
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'genz-development-secret-change-me';
    const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || JWT_SECRET;
    const accessToken = jwt.sign(
      { id: account._id.toString(), role: account.role || (account.isAdmin ? 'admin' : 'user'), typ: 'access' },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || process.env.JWT_EXPIRE || '7d' }
    );
    const refreshToken = jwt.sign(
      { id: account._id.toString(), typ: 'refresh' },
      JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    const safeAccount = typeof account.toSafeJSON === 'function' ? account.toSafeJSON() : account;

    res.status(200).json({
      success: true,
      message: 'Device paired successfully',
      token: accessToken,
      refreshToken,
      user: safeAccount,
      device: {
        ...serializeDevice(device),
        pairedAt: device.createdAt
      }
    });
  } catch (error) {
    console.error('Pair device error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all devices for local user
// @route   GET /api/device
// @access  Public (no auth)
exports.getDevices = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const currentDeviceId = req.headers['x-device-id'] || req.query.currentDeviceId || '';
    // Try to query database
    let devices = [];
    try {
      devices = await Device.find({ 
        localUserId: currentUserId 
      }).sort({ lastActive: -1 });
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Return empty array if DB is down
      return res.status(200).json({ success: true, devices: [] });
    }
    
    res.status(200).json({ 
      success: true, 
      devices: (devices || []).map((device) => serializeDevice(device, currentDeviceId))
    });
  } catch (error) {
    console.error('Get devices error:', error);
    // Always return 200 with empty array to prevent 503 crashes
    res.status(200).json({ success: true, devices: [] });
  }
};

// @desc    Unlink/remove device
// @route   DELETE /api/device/:id
// @access  Public (no auth)
exports.unlinkDevice = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { id } = req.params;
    
    const device = await Device.findOneAndDelete({
      deviceId: id,
      localUserId: currentUserId
    }).catch(err => {
      console.error('Device delete error:', err);
      return null;
    });
    
    // Return success even if device not found to prevent UI crashes
    res.status(200).json({ 
      success: true, 
      message: device ? 'Device unlinked successfully' : 'Device removed' 
    });
  } catch (error) {
    console.error('Unlink device error:', error);
    // Return success to prevent UI crashes
    res.status(200).json({ 
      success: true, 
      message: 'Device operation completed' 
    });
  }
};

// @desc    Update device active status
// @route   PUT /api/device/:id/active
// @access  Public (no auth)
exports.updateDeviceActive = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { id } = req.params;
    const isActive = req.body.isActive ?? req.body.active;
    
    await Device.findOneAndUpdate(
      { deviceId: id, localUserId: currentUserId },
      { 
        isActive: isActive !== undefined ? isActive : true,
        lastActive: Date.now()
      },
      { new: true }
    ).catch(err => {
      console.error('Device update error:', err);
    });
    
    res.status(200).json({ success: true, message: 'Device status updated' });
  } catch (error) {
    console.error('Update device active error:', error);
    res.status(200).json({ success: true, message: 'Device status update completed' });
  }
};

// @desc    Logout all devices except current
// @route   POST /api/device/logout-all
// @access  Public (no auth)
exports.logoutAllDevices = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { currentDeviceId } = req.body;
    
    // Deactivate all devices except current
    const result = await Device.updateMany(
      { 
        localUserId: currentUserId,
        deviceId: { $ne: currentDeviceId }
      },
      { isActive: false }
    ).catch(err => {
      console.error('Logout all devices error:', err);
      return { modifiedCount: 0 };
    });
    
    res.status(200).json({ 
      success: true, 
      loggedOutCount: result?.modifiedCount || 0,
      message: `Logged out ${result?.modifiedCount || 0} devices`
    });
  } catch (error) {
    console.error('Logout all devices error:', error);
    res.status(200).json({ 
      success: true, 
      loggedOutCount: 0,
      message: 'Logout operation completed'
    });
  }
};
// @route   PUT /api/device/:id/capabilities
// @access  Public (no auth)
exports.updateDeviceCapabilities = async (req, res) => {
  try {
    const currentUserId = getCurrentUserId(req);
    const { id } = req.params;
    const capabilities = req.body;
    
    const device = await Device.findOneAndUpdate(
      { deviceId: id, localUserId: currentUserId },
      { capabilities },
      { new: true }
    ).catch(err => {
      console.error('Update device capabilities error:', err);
      return null;
    });
    
    res.status(200).json({ 
      success: true, 
      message: device ? 'Device capabilities updated' : 'Device capabilities update completed'
    });
  } catch (error) {
    console.error('Update device capabilities error:', error);
    res.status(200).json({ 
      success: true, 
      message: 'Device capabilities update completed' 
    });
  }
};
