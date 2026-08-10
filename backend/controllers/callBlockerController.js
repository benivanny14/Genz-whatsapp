
const Call = require('../models/CallLog');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
  callBlockerEnabled: true,
  blockUnknownNumbers: false,
  blockPrivateNumbers: false,
  blockSpamCalls: true,
  blockInternationalCalls: false,
  allowedNumbers: [],
  blockedNumbers: [],
  blockDuringDND: false,
  sendBlockedToVoicemail: true,
  notifyOnBlockedCall: true,
  autoBlockAfterReject: false,
  rejectCountThreshold: 3
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get call blocker settings
// @route   GET /api/call-blocker/settings
// @access  Private
exports.getCallBlockerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.callBlockerSettings?.toObject?.() || user.callBlockerSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get call blocker settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update call blocker settings
// @route   POST /api/call-blocker/settings
// @access  Private
exports.updateCallBlockerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.callBlockerSettings?.toObject?.() || user.callBlockerSettings || {};
    
    user.callBlockerSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('callBlockerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callBlockerSettings });
  } catch (error) {
    console.error('Update call blocker settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call blocker
// @route   POST /api/call-blocker/toggle
// @access  Private
exports.toggleCallBlocker = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callBlockerSettings?.toObject?.() || user.callBlockerSettings || {};
    
    user.callBlockerSettings = mergeSettings({
      ...existing,
      callBlockerEnabled: enabled !== undefined ? enabled : !existing.callBlockerEnabled
    });
    user.markModified('callBlockerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callBlockerSettings });
  } catch (error) {
    console.error('Toggle call blocker error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Block number
// @route   POST /api/call-blocker/block
// @access  Private
exports.blockNumber = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { phoneNumber, name, reason } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const existing = user.callBlockerSettings?.toObject?.() || user.callBlockerSettings || {};
    
    if (!existing.blockedNumbers) existing.blockedNumbers = [];
    
    if (existing.blockedNumbers.includes(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Number already blocked' });
    }

    existing.blockedNumbers.push(phoneNumber);
    
    user.callBlockerSettings = mergeSettings({ ...existing });
    user.markModified('callBlockerSettings');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Number blocked successfully',
      blockedNumbers: user.callBlockerSettings.blockedNumbers
    });
  } catch (error) {
    console.error('Block number error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unblock number
// @route   POST /api/call-blocker/unblock
// @access  Private
exports.unblockNumber = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const existing = user.callBlockerSettings?.toObject?.() || user.callBlockerSettings || {};
    
    if (!existing.blockedNumbers) {
      return res.status(404).json({ success: false, message: 'No blocked numbers found' });
    }

    const index = existing.blockedNumbers.indexOf(phoneNumber);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Number not found in blocked list' });
    }

    existing.blockedNumbers.splice(index, 1);
    
    user.callBlockerSettings = mergeSettings({ ...existing });
    user.markModified('callBlockerSettings');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Number unblocked successfully',
      blockedNumbers: user.callBlockerSettings.blockedNumbers
    });
  } catch (error) {
    console.error('Unblock number error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get blocked numbers
// @route   GET /api/call-blocker/blocked
// @access  Private
exports.getBlockedNumbers = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.callBlockerSettings?.toObject?.() || user.callBlockerSettings);
    res.status(200).json({ success: true, blockedNumbers: settings.blockedNumbers || [] });
  } catch (error) {
    console.error('Get blocked numbers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add to allowed numbers
// @route   POST /api/call-blocker/allow
// @access  Private
exports.addAllowedNumber = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { phoneNumber, name } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const existing = user.callBlockerSettings?.toObject?.() || user.callBlockerSettings || {};
    
    if (!existing.allowedNumbers) existing.allowedNumbers = [];
    
    if (existing.allowedNumbers.includes(phoneNumber)) {
      return res.status(400).json({ success: false, message: 'Number already in allowed list' });
    }

    existing.allowedNumbers.push(phoneNumber);
    
    user.callBlockerSettings = mergeSettings({ ...existing });
    user.markModified('callBlockerSettings');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Number added to allowed list',
      allowedNumbers: user.callBlockerSettings.allowedNumbers
    });
  } catch (error) {
    console.error('Add allowed number error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove from allowed numbers
// @route   DELETE /api/call-blocker/allow/:phoneNumber
// @access  Private
exports.removeAllowedNumber = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { phoneNumber } = req.params;

    const existing = user.callBlockerSettings?.toObject?.() || user.callBlockerSettings || {};
    
    if (!existing.allowedNumbers) {
      return res.status(404).json({ success: false, message: 'No allowed numbers found' });
    }

    const index = existing.allowedNumbers.indexOf(phoneNumber);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Number not found in allowed list' });
    }

    existing.allowedNumbers.splice(index, 1);
    
    user.callBlockerSettings = mergeSettings({ ...existing });
    user.markModified('callBlockerSettings');
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Number removed from allowed list',
      allowedNumbers: user.callBlockerSettings.allowedNumbers
    });
  } catch (error) {
    console.error('Remove allowed number error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check if call should be blocked
// @route   POST /api/call-blocker/check
// @access  Private
exports.checkCallBlock = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { phoneNumber, isPrivate, isInternational } = req.body;

    const settings = mergeSettings(user.callBlockerSettings?.toObject?.() || user.callBlockerSettings);
    
    if (!settings.callBlockerEnabled) {
      return res.status(200).json({ success: true, shouldBlock: false, reason: 'Call blocker disabled' });
    }

    let shouldBlock = false;
    let reason = '';

    // Check blocked numbers
    if (settings.blockedNumbers && settings.blockedNumbers.includes(phoneNumber)) {
      shouldBlock = true;
      reason = 'Number is in blocked list';
    }

    // Check private numbers
    if (!shouldBlock && settings.blockPrivateNumbers && isPrivate) {
      shouldBlock = true;
      reason = 'Private/unknown number blocked';
    }

    // Check international calls
    if (!shouldBlock && settings.blockInternationalCalls && isInternational) {
      shouldBlock = true;
      reason = 'International call blocked';
    }

    // Check if number is in allowed list (override block)
    if (shouldBlock && settings.allowedNumbers && settings.allowedNumbers.includes(phoneNumber)) {
      shouldBlock = false;
      reason = 'Number is in allowed list';
    }

    res.status(200).json({
      success: true,
      shouldBlock,
      reason: reason || 'Call allowed',
      settings: {
        sendToVoicemail: settings.sendBlockedToVoicemail,
        notifyOnBlock: settings.notifyOnBlockedCall
      }
    });
  } catch (error) {
    console.error('Check call block error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get call block history
// @route   GET /api/call-blocker/history
// @access  Private
exports.getCallBlockHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const history = user.blockedCallHistory || [];
    res.status(200).json({ success: true, history });
  } catch (error) {
    console.error('Get call block history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset call blocker settings to default
// @route   POST /api/call-blocker/reset
// @access  Private
exports.resetCallBlockerSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.callBlockerSettings = mergeSettings({});
    user.markModified('callBlockerSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callBlockerSettings });
  } catch (error) {
    console.error('Reset call blocker settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

