const Call = require('../models/CallLog');
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');

const callBlockerDefaultSettings = {
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

const mergeCallBlockerSettings = createSettingsMerger(callBlockerDefaultSettings);

const callFeaturesDefaultSettings = {
  callRecording: false,
  callWaiting: true,
  callHold: true,
  callTransfer: false,
  callScreenShare: true,
  callVideoToggle: true,
  callMute: true,
  callBlocker: false,
  callHistory: true,
  callLink: true,
  hideCallButton: false,
  dndModeForCalls: false,
  disableVoiceCalls: false,
  disableVideoCalls: false,
  autoAnswerCalls: false,
  callTimeout: 60, // seconds
  maxCallDuration: 3600, // seconds (1 hour)
  recordAudioOnly: false,
  recordVideoOnly: false
};

const mergeCallFeaturesSettings = createSettingsMerger(callFeaturesDefaultSettings);

// ============================================================================
// Call blocker (from callBlockerController)
// ============================================================================

// @desc    Get call blocker settings
// @route   GET /api/call-blocker/settings
// @access  Private
const { getSettings: getCallBlockerSettings, updateSettings: updateCallBlockerSettings, resetSettings: resetCallBlockerSettings } = createSettingsHandlers({
  field: 'callBlockerSettings',
  label: 'call blocker',
  mergeSettings: mergeCallBlockerSettings,
});

exports.getCallBlockerSettings = getCallBlockerSettings;

// @desc    Update call blocker settings
// @route   POST /api/call-blocker/settings
// @access  Private
exports.updateCallBlockerSettings = updateCallBlockerSettings;

// @desc    Toggle call blocker
// @route   POST /api/call-blocker/toggle
// @access  Private
exports.toggleCallBlocker = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callBlockerSettings?.toObject?.() || user.callBlockerSettings || {};
    
    user.callBlockerSettings = mergeCallBlockerSettings({
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
    
    user.callBlockerSettings = mergeCallBlockerSettings({ ...existing });
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
    
    user.callBlockerSettings = mergeCallBlockerSettings({ ...existing });
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

    const settings = mergeCallBlockerSettings(user.callBlockerSettings?.toObject?.() || user.callBlockerSettings);
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
    
    user.callBlockerSettings = mergeCallBlockerSettings({ ...existing });
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
    
    user.callBlockerSettings = mergeCallBlockerSettings({ ...existing });
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

    const settings = mergeCallBlockerSettings(user.callBlockerSettings?.toObject?.() || user.callBlockerSettings);
    
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
exports.resetCallBlockerSettings = resetCallBlockerSettings;

// ============================================================================
// Call features (from callFeaturesController)
// ============================================================================

// @desc    Get call features settings
// @route   GET /api/call-features/settings
// @access  Private
const { getSettings: getCallFeaturesSettings, updateSettings: updateCallFeaturesSettings, resetSettings: resetCallFeaturesSettings } = createSettingsHandlers({
  field: 'callFeaturesSettings',
  label: 'call features',
  mergeSettings: mergeCallFeaturesSettings,
});

exports.getCallFeaturesSettings = getCallFeaturesSettings;

// @desc    Update call features settings
// @route   POST /api/call-features/settings
// @access  Private
exports.updateCallFeaturesSettings = updateCallFeaturesSettings;

// @desc    Toggle call recording
// @route   POST /api/call-features/recording
// @access  Private
exports.toggleCallRecording = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled, audioOnly, videoOnly } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callRecording: enabled !== undefined ? enabled : !existing.callRecording,
      recordAudioOnly: audioOnly !== undefined ? audioOnly : existing.recordAudioOnly,
      recordVideoOnly: videoOnly !== undefined ? videoOnly : existing.recordVideoOnly
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call recording error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call waiting
// @route   POST /api/call-features/waiting
// @access  Private
exports.toggleCallWaiting = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callWaiting: enabled !== undefined ? enabled : !existing.callWaiting
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call waiting error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call hold
// @route   POST /api/call-features/hold
// @access  Private
exports.toggleCallHold = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callHold: enabled !== undefined ? enabled : !existing.callHold
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call hold error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call transfer
// @route   POST /api/call-features/transfer
// @access  Private
exports.toggleCallTransfer = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callTransfer: enabled !== undefined ? enabled : !existing.callTransfer
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call transfer error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call screen share
// @route   POST /api/call-features/screen-share
// @access  Private
exports.toggleCallScreenShare = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callScreenShare: enabled !== undefined ? enabled : !existing.callScreenShare
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call screen share error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call video toggle
// @route   POST /api/call-features/video-toggle
// @access  Private
exports.toggleCallVideoToggle = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callVideoToggle: enabled !== undefined ? enabled : !existing.callVideoToggle
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call video toggle error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call mute
// @route   POST /api/call-features/mute
// @access  Private
exports.toggleCallMute = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callMute: enabled !== undefined ? enabled : !existing.callMute
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call mute error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call blocker (call features setting)
// @route   POST /api/call-features/blocker
// @access  Private
exports.toggleCallFeaturesBlocker = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callBlocker: enabled !== undefined ? enabled : !existing.callBlocker
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call blocker error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call history
// @route   POST /api/call-features/history
// @access  Private
exports.toggleCallHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callHistory: enabled !== undefined ? enabled : !existing.callHistory
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call link
// @route   POST /api/call-features/link
// @access  Private
exports.toggleCallLink = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callLink: enabled !== undefined ? enabled : !existing.callLink
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle call link error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle hide call button
// @route   POST /api/call-features/hide-button
// @access  Private
exports.toggleHideCallButton = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      hideCallButton: enabled !== undefined ? enabled : !existing.hideCallButton
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle hide call button error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle DND mode for calls
// @route   POST /api/call-features/dnd
// @access  Private
exports.toggleDNDModeForCalls = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      dndModeForCalls: enabled !== undefined ? enabled : !existing.dndModeForCalls
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle DND mode for calls error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle disable voice calls
// @route   POST /api/call-features/disable-voice
// @access  Private
exports.toggleDisableVoiceCalls = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      disableVoiceCalls: enabled !== undefined ? enabled : !existing.disableVoiceCalls
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle disable voice calls error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle disable video calls
// @route   POST /api/call-features/disable-video
// @access  Private
exports.toggleDisableVideoCalls = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      disableVideoCalls: enabled !== undefined ? enabled : !existing.disableVideoCalls
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Toggle disable video calls error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update call timeout
// @route   POST /api/call-features/timeout
// @access  Private
exports.updateCallTimeout = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { timeout } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      callTimeout: timeout !== undefined ? timeout : existing.callTimeout
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Update call timeout error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update max call duration
// @route   POST /api/call-features/max-duration
// @access  Private
exports.updateMaxCallDuration = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { duration } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeCallFeaturesSettings({
      ...existing,
      maxCallDuration: duration !== undefined ? duration : existing.maxCallDuration
    });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Update max call duration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset call features settings to default
// @route   POST /api/call-features/reset
// @access  Private
exports.resetCallFeaturesSettings = resetCallFeaturesSettings;
