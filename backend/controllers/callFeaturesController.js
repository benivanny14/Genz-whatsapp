
const Call = require('../models/CallLog');
const { getUser, createSettingsMerger } = require('../services/userScopedService');

const defaultSettings = {
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


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get call features settings
// @route   GET /api/call-features/settings
// @access  Private
exports.getCallFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get call features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update call features settings
// @route   POST /api/call-features/settings
// @access  Private
exports.updateCallFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Update call features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call recording
// @route   POST /api/call-features/recording
// @access  Private
exports.toggleCallRecording = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled, audioOnly, videoOnly } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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

// @desc    Toggle call blocker
// @route   POST /api/call-features/blocker
// @access  Private
exports.toggleCallBlocker = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callFeaturesSettings?.toObject?.() || user.callFeaturesSettings || {};
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
    
    user.callFeaturesSettings = mergeSettings({
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
exports.resetCallFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.callFeaturesSettings = mergeSettings({});
    user.markModified('callFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callFeaturesSettings });
  } catch (error) {
    console.error('Reset call features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

