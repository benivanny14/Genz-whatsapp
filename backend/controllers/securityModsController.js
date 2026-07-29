const User = require('../models/User');

const defaultSettings = {
  antiBanProtection: false,
  proxySupport: false,
  ipSpoofing: false,
  deviceSpoofing: false,
  appLockPattern: false,
  appLockPIN: false,
  appLockFingerprint: false,
  antiScreenshot: false,
  screenRecordingDetection: false
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

// @desc    Get security MODs settings
// @route   GET /api/security-mods/settings
// @access  Private
exports.getSecurityModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.securityModsSettings?.toObject?.() || user.securityModsSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get security MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update security MODs settings
// @route   POST /api/security-mods/settings
// @access  Private
exports.updateSecurityModsSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    
    user.securityModsSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('securityModsSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.securityModsSettings });
  } catch (error) {
    console.error('Update security MODs settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Anti-Ban Protection
// @route   POST /api/security-mods/anti-ban
// @access  Private
exports.toggleAntiBan = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.antiBanProtection;
    
    user.securityModsSettings = mergeSettings({ ...existing, antiBanProtection: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, antiBanProtection: newValue });
  } catch (error) {
    console.error('Toggle anti ban error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Proxy Support
// @route   POST /api/security-mods/proxy
// @access  Private
exports.toggleProxy = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.proxySupport;
    
    user.securityModsSettings = mergeSettings({ ...existing, proxySupport: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, proxySupport: newValue });
  } catch (error) {
    console.error('Toggle proxy error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle IP Spoofing
// @route   POST /api/security-mods/ip-spoofing
// @access  Private
exports.toggleIPSpoofing = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.ipSpoofing;
    
    user.securityModsSettings = mergeSettings({ ...existing, ipSpoofing: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, ipSpoofing: newValue });
  } catch (error) {
    console.error('Toggle IP spoofing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Device Spoofing
// @route   POST /api/security-mods/device-spoofing
// @access  Private
exports.toggleDeviceSpoofing = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.deviceSpoofing;
    
    user.securityModsSettings = mergeSettings({ ...existing, deviceSpoofing: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, deviceSpoofing: newValue });
  } catch (error) {
    console.error('Toggle device spoofing error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle App Lock Pattern
// @route   POST /api/security-mods/app-lock-pattern
// @access  Private
exports.toggleAppLockPattern = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.appLockPattern;
    
    user.securityModsSettings = mergeSettings({ ...existing, appLockPattern: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, appLockPattern: newValue });
  } catch (error) {
    console.error('Toggle app lock pattern error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle App Lock PIN
// @route   POST /api/security-mods/app-lock-pin
// @access  Private
exports.toggleAppLockPIN = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.appLockPIN;
    
    user.securityModsSettings = mergeSettings({ ...existing, appLockPIN: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, appLockPIN: newValue });
  } catch (error) {
    console.error('Toggle app lock PIN error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle App Lock Fingerprint
// @route   POST /api/security-mods/app-lock-fingerprint
// @access  Private
exports.toggleAppLockFingerprint = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.appLockFingerprint;
    
    user.securityModsSettings = mergeSettings({ ...existing, appLockFingerprint: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, appLockFingerprint: newValue });
  } catch (error) {
    console.error('Toggle app lock fingerprint error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Anti-Screenshot
// @route   POST /api/security-mods/anti-screenshot
// @access  Private
exports.toggleAntiScreenshot = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.antiScreenshot;
    
    user.securityModsSettings = mergeSettings({ ...existing, antiScreenshot: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, antiScreenshot: newValue });
  } catch (error) {
    console.error('Toggle anti screenshot error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle Screen Recording Detection
// @route   POST /api/security-mods/screen-recording-detection
// @access  Private
exports.toggleScreenRecordingDetection = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.securityModsSettings?.toObject?.() || user.securityModsSettings || {};
    const newValue = !existing.screenRecordingDetection;
    
    user.securityModsSettings = mergeSettings({ ...existing, screenRecordingDetection: newValue });
    user.markModified('securityModsSettings');
    await user.save();

    res.json({ success: true, screenRecordingDetection: newValue });
  } catch (error) {
    console.error('Toggle screen recording detection error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
