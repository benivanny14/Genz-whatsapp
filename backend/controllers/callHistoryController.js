const User = require('../models/User');
const Call = require('../models/Call');

const defaultSettings = {
  callHistoryEnabled: true,
  maxHistoryDays: 30,
  saveMissedCalls: true,
  saveIncomingCalls: true,
  saveOutgoingCalls: true,
  autoDeleteOldCalls: false,
  exportHistory: true,
  syncWithContacts: true,
  includeCallDuration: true,
  includeCallRecording: false
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

// @desc    Get call history settings
// @route   GET /api/call-history/settings
// @access  Private
exports.getCallHistorySettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.callHistorySettings?.toObject?.() || user.callHistorySettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get call history settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update call history settings
// @route   POST /api/call-history/settings
// @access  Private
exports.updateCallHistorySettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.callHistorySettings?.toObject?.() || user.callHistorySettings || {};
    
    user.callHistorySettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('callHistorySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callHistorySettings });
  } catch (error) {
    console.error('Update call history settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get call history
// @route   GET /api/call-history
// @access  Private
exports.getCallHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { limit = 50, offset = 0, type, startDate, endDate } = req.query;

    const settings = mergeSettings(user.callHistorySettings?.toObject?.() || user.callHistorySettings);
    
    if (!settings.callHistoryEnabled) {
      return res.status(403).json({ success: false, message: 'Call history is disabled' });
    }

    const filter = {
      $or: [
        { caller: user._id },
        { receiver: user._id }
      ]
    };

    if (type) {
      filter.callType = type;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const calls = await Call.find(filter)
      .populate('caller', 'username profilePicture')
      .populate('receiver', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await Call.countDocuments(filter);

    res.status(200).json({
      success: true,
      calls,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get call statistics
// @route   GET /api/call-history/stats
// @access  Private
exports.getCallStats = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.callHistorySettings?.toObject?.() || user.callHistorySettings);
    
    const maxHistoryDate = new Date(Date.now() - settings.maxHistoryDays * 24 * 60 * 60 * 1000);

    const calls = await Call.find({
      $or: [
        { caller: user._id },
        { receiver: user._id }
      ],
      createdAt: { $gte: maxHistoryDate }
    });

    const stats = {
      totalCalls: calls.length,
      incoming: calls.filter(c => c.receiver.toString() === user._id.toString()).length,
      outgoing: calls.filter(c => c.caller.toString() === user._id.toString()).length,
      missed: calls.filter(c => c.status === 'missed').length,
      byType: {
        voice: calls.filter(c => c.callType === 'voice').length,
        video: calls.filter(c => c.callType === 'video').length
      },
      totalDuration: calls.reduce((sum, c) => sum + (c.duration || 0), 0),
      averageDuration: calls.length > 0 ? calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length : 0
    };

    res.status(200).json({ success: true, stats });
  } catch (error) {
    console.error('Get call stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete call history entry
// @route   DELETE /api/call-history/:id
// @access  Private
exports.deleteCallHistoryEntry = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const call = await Call.findById(id);
    if (!call) {
      return res.status(404).json({ success: false, message: 'Call not found' });
    }

    if (call.caller.toString() !== user._id.toString() && call.receiver.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to delete this call record' });
    }

    await Call.findByIdAndDelete(id);

    res.status(200).json({ success: true, message: 'Call history entry deleted' });
  } catch (error) {
    console.error('Delete call history entry error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all call history
// @route   DELETE /api/call-history/clear-all
// @access  Private
exports.clearAllCallHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const deleteResult = await Call.deleteMany({
      $or: [
        { caller: user._id },
        { receiver: user._id }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Call history cleared',
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('Clear all call history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export call history
// @route   POST /api/call-history/export
// @access  Private
exports.exportCallHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { format } = req.body;

    const settings = mergeSettings(user.callHistorySettings?.toObject?.() || user.callHistorySettings);
    
    if (!settings.exportHistory) {
      return res.status(403).json({ success: false, message: 'Call history export is disabled' });
    }

    const maxHistoryDate = new Date(Date.now() - settings.maxHistoryDays * 24 * 60 * 60 * 1000);

    const calls = await Call.find({
      $or: [
        { caller: user._id },
        { receiver: user._id }
      ],
      createdAt: { $gte: maxHistoryDate }
    })
      .populate('caller', 'username')
      .populate('receiver', 'username')
      .sort({ createdAt: 1 });

    let exportData = '';

    if (format === 'csv') {
      exportData = 'Date,Type,Direction,Caller,Receiver,Duration,Status\n';
      calls.forEach(call => {
        const direction = call.caller.toString() === user._id.toString() ? 'outgoing' : 'incoming';
        const date = new Date(call.createdAt).toISOString();
        exportData += `${date},${call.callType},${direction},${call.caller?.username || 'Unknown'},${call.receiver?.username || 'Unknown'},${call.duration || 0},${call.status}\n`;
      });
    } else if (format === 'json') {
      exportData = JSON.stringify({
        exportedAt: new Date().toISOString(),
        totalCalls: calls.length,
        calls: calls.map(call => ({
          date: call.createdAt,
          type: call.callType,
          direction: call.caller.toString() === user._id.toString() ? 'outgoing' : 'incoming',
          caller: call.caller?.username,
          receiver: call.receiver?.username,
          duration: call.duration,
          status: call.status
        }))
      }, null, 2);
    }

    res.status(200).json({
      success: true,
      format,
      data: exportData,
      callCount: calls.length
    });
  } catch (error) {
    console.error('Export call history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle call history
// @route   POST /api/call-history/toggle
// @access  Private
exports.toggleCallHistory = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.callHistorySettings?.toObject?.() || user.callHistorySettings || {};
    
    user.callHistorySettings = mergeSettings({
      ...existing,
      callHistoryEnabled: enabled !== undefined ? enabled : !existing.callHistoryEnabled
    });
    user.markModified('callHistorySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callHistorySettings });
  } catch (error) {
    console.error('Toggle call history error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset call history settings to default
// @route   POST /api/call-history/reset
// @access  Private
exports.resetCallHistorySettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.callHistorySettings = mergeSettings({});
    user.markModified('callHistorySettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.callHistorySettings });
  } catch (error) {
    console.error('Reset call history settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
