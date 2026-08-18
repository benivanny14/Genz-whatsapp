
const { getUser, createSettingsMerger, createSettingsHandlers } = require('../services/userScopedService');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const defaultSettings = {
  businessAccountEnabled: false,
  businessName: '',
  businessCategory: '',
  businessDescription: '',
  businessPhone: '',
  businessAddress: '',
  businessHours: {
    monday: { open: '09:00', close: '17:00', enabled: true },
    tuesday: { open: '09:00', close: '17:00', enabled: true },
    wednesday: { open: '09:00', close: '17:00', enabled: true },
    thursday: { open: '09:00', close: '17:00', enabled: true },
    friday: { open: '09:00', close: '17:00', enabled: true },
    saturday: { open: '09:00', close: '14:00', enabled: false },
    sunday: { open: '09:00', close: '14:00', enabled: false }
  },
  autoReplies: {
    enabled: false,
    message: 'Thank you for your message. We will get back to you soon.'
  },
  quickReplies: [],
  catalogEnabled: false,
  products: [],
  analyticsEnabled: false,
  awayMessage: '',
  awayMode: false
};


const mergeSettings = createSettingsMerger(defaultSettings);

// @desc    Get business account settings
// @route   GET /api/business-account/settings
// @access  Private
const { getSettings: getBusinessAccountSettings, updateSettings: updateBusinessAccountSettings, resetSettings: resetBusinessAccountSettings } = createSettingsHandlers({
  field: 'businessAccountSettings',
  label: 'business account',
  mergeSettings,
});

exports.getBusinessAccountSettings = getBusinessAccountSettings;

// @desc    Update business account settings
// @route   POST /api/business-account/settings
// @access  Private
exports.updateBusinessAccountSettings = updateBusinessAccountSettings;

// @desc    Enable business account
// @route   POST /api/business-account/enable
// @access  Private
exports.enableBusinessAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { businessName, businessCategory, businessPhone } = req.body;

    if (!businessName || !businessCategory) {
      return res.status(400).json({ success: false, message: 'Business name and category are required' });
    }

    const existing = user.businessAccountSettings?.toObject?.() || user.businessAccountSettings || {};
    
    user.businessAccountSettings = mergeSettings({
      ...existing,
      businessAccountEnabled: true,
      businessName,
      businessCategory,
      businessPhone: businessPhone || existing.businessPhone
    });
    user.markModified('businessAccountSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.businessAccountSettings });
  } catch (error) {
    console.error('Enable business account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Disable business account
// @route   POST /api/business-account/disable
// @access  Private
exports.disableBusinessAccount = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.businessAccountSettings?.toObject?.() || user.businessAccountSettings || {};
    
    user.businessAccountSettings = mergeSettings({
      ...existing,
      businessAccountEnabled: false
    });
    user.markModified('businessAccountSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.businessAccountSettings });
  } catch (error) {
    console.error('Disable business account error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update business hours
// @route   POST /api/business-account/hours
// @access  Private
exports.updateBusinessHours = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { businessHours } = req.body;

    if (!businessHours) {
      return res.status(400).json({ success: false, message: 'Business hours are required' });
    }

    const existing = user.businessAccountSettings?.toObject?.() || user.businessAccountSettings || {};
    
    user.businessAccountSettings = mergeSettings({
      ...existing,
      businessHours
    });
    user.markModified('businessAccountSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.businessAccountSettings });
  } catch (error) {
    console.error('Update business hours error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update auto reply
// @route   POST /api/business-account/auto-reply
// @access  Private
exports.updateAutoReply = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled, message } = req.body;

    const existing = user.businessAccountSettings?.toObject?.() || user.businessAccountSettings || {};
    
    user.businessAccountSettings = mergeSettings({
      ...existing,
      autoReplies: {
        ...existing.autoReplies,
        enabled: enabled !== undefined ? enabled : existing.autoReplies?.enabled,
        message: message !== undefined ? message : existing.autoReplies?.message
      }
    });
    user.markModified('businessAccountSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.businessAccountSettings });
  } catch (error) {
    console.error('Update auto reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add quick reply
// @route   POST /api/business-account/quick-reply
// @access  Private
exports.addQuickReply = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { keyword, message } = req.body;

    if (!keyword || !message) {
      return res.status(400).json({ success: false, message: 'Keyword and message are required' });
    }

    const existing = user.businessAccountSettings?.toObject?.() || user.businessAccountSettings || {};
    
    if (!existing.quickReplies) existing.quickReplies = [];
    
    existing.quickReplies.push({
      _id: new (require('mongoose').Types.ObjectId)(),
      keyword,
      message,
      createdAt: new Date()
    });

    user.businessAccountSettings = mergeSettings({ ...existing });
    user.markModified('businessAccountSettings');
    await user.save();

    res.status(200).json({ success: true, quickReplies: user.businessAccountSettings.quickReplies });
  } catch (error) {
    console.error('Add quick reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete quick reply
// @route   DELETE /api/business-account/quick-reply/:id
// @access  Private
exports.deleteQuickReply = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { id } = req.params;

    const existing = user.businessAccountSettings?.toObject?.() || user.businessAccountSettings || {};
    
    if (!existing.quickReplies) {
      return res.status(404).json({ success: false, message: 'No quick replies found' });
    }

    const index = existing.quickReplies.findIndex(qr => qr._id.toString() === id);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Quick reply not found' });
    }

    existing.quickReplies.splice(index, 1);

    user.businessAccountSettings = mergeSettings({ ...existing });
    user.markModified('businessAccountSettings');
    await user.save();

    res.status(200).json({ success: true, quickReplies: user.businessAccountSettings.quickReplies });
  } catch (error) {
    console.error('Delete quick reply error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle away mode
// @route   POST /api/business-account/away-mode
// @access  Private
exports.toggleAwayMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled, message } = req.body;

    const existing = user.businessAccountSettings?.toObject?.() || user.businessAccountSettings || {};
    
    user.businessAccountSettings = mergeSettings({
      ...existing,
      awayMode: enabled !== undefined ? enabled : !existing.awayMode,
      awayMessage: message !== undefined ? message : existing.awayMessage
    });
    user.markModified('businessAccountSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.businessAccountSettings });
  } catch (error) {
    console.error('Toggle away mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get business analytics (computed from the user's real data)
// @route   GET /api/business-account/analytics
// @access  Private
exports.getBusinessAnalytics = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const existing = user.businessAccountSettings?.toObject?.() || user.businessAccountSettings || {};
    
    if (!existing.analyticsEnabled) {
      return res.status(403).json({ success: false, message: 'Analytics is disabled' });
    }

    const userId = user._id;
    const now = Date.now();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

    // Real totals from the user's own data.
    const [totalMessages, totalConversations, thisWeekMessages, lastWeekMessages, hourlyAgg] = await Promise.all([
      Message.countDocuments({ sender: userId }),
      Conversation.countDocuments({ participants: userId }),
      Message.countDocuments({ sender: userId, createdAt: { $gte: weekAgo } }),
      Message.countDocuments({ sender: userId, createdAt: { $gte: twoWeeksAgo, $lt: weekAgo } }),
      Message.aggregate([
        { $match: { sender: userId } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 3 }
      ])
    ]);

    // Average reply time: gap between an incoming message in a conversation
    // and the user's next message in that same conversation.
    const conversations = await Conversation.find({ participants: userId }).select('_id');
    let responseGaps = [];
    for (const conv of conversations) {
      const msgs = await Message.find({ conversationId: conv._id, createdAt: { $gte: weekAgo } })
        .sort({ createdAt: 1 })
        .select('sender createdAt');
      for (let i = 1; i < msgs.length; i++) {
        const prev = msgs[i - 1];
        if (String(prev.sender) !== String(userId) && String(msgs[i].sender) === String(userId)) {
          const gap = (msgs[i].createdAt - prev.createdAt) / 60000; // minutes
          if (gap >= 0) responseGaps.push(gap);
        }
      }
    }
    const avgResponseMinutes = responseGaps.length
      ? Math.round(responseGaps.reduce((a, b) => a + b, 0) / responseGaps.length)
      : 0;

    const peakHours = hourlyAgg.map(h =>
      `${String(h._id).padStart(2, '0')}:00`
    );

    const weeklyGrowth = lastWeekMessages > 0
      ? Math.round(((thisWeekMessages - lastWeekMessages) / lastWeekMessages) * 100)
      : (thisWeekMessages > 0 ? 100 : 0);

    const analytics = {
      totalMessages,
      totalConversations,
      responseTime: avgResponseMinutes,
      customerSatisfaction: null, // no rating data is collected; honest null
      peakHours,
      topProducts: [],
      weeklyGrowth
    };

    res.status(200).json({ success: true, analytics });
  } catch (error) {
    console.error('Get business analytics error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset business account settings to default
// @route   POST /api/business-account/reset
// @access  Private
exports.resetBusinessAccountSettings = resetBusinessAccountSettings;

