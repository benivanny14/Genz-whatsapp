const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const defaultSettings = {
  spamFilterEnabled: true,
  autoBlock: true,
  sensitivity: 'medium', // low, medium, high
  filterKeywords: true,
  filterLinks: true,
  filterNumbers: true,
  filterRepeatedMessages: true,
  filterUnknownContacts: false,
  filterGroups: false,
  customKeywords: [],
  whitelistNumbers: [],
  whitelistContacts: [],
  notifyOnBlock: true,
  moveToSpamFolder: true,
  autoDeleteSpam: false,
  logBlockedMessages: true
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

// Spam detection keywords
const defaultSpamKeywords = [
  'winner', 'lottery', 'prize', 'free', 'congratulations',
  'urgent', 'act now', 'limited time', 'exclusive offer',
  'click here', 'subscribe', 'unsubscribe', 'opt-out',
  'password', 'account suspended', 'verify', 'confirm',
  'investment', 'crypto', 'bitcoin', 'forex', 'trading',
  'weight loss', 'diet pill', 'enhancement', 'miracle'
];

// @desc    Get spam filter settings
// @route   GET /api/spam-filter/settings
// @access  Private
exports.getSpamFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.spamFilterSettings?.toObject?.() || user.spamFilterSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get spam filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update spam filter settings
// @route   POST /api/spam-filter/settings
// @access  Private
exports.updateSpamFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.spamFilterSettings?.toObject?.() || user.spamFilterSettings || {};
    
    user.spamFilterSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('spamFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.spamFilterSettings });
  } catch (error) {
    console.error('Update spam filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Check if message is spam
// @route   POST /api/spam-filter/check
// @access  Private
exports.checkMessageForSpam = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { content, senderId, conversationId } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content is required' });
    }

    const settings = mergeSettings(user.spamFilterSettings?.toObject?.() || user.spamFilterSettings);
    
    if (!settings.spamFilterEnabled) {
      return res.status(200).json({ success: true, isSpam: false, reason: 'Spam filter disabled' });
    }

    const spamCheck = {
      isSpam: false,
      reasons: [],
      confidence: 0
    };

    const contentLower = content.toLowerCase();

    // Check for spam keywords
    if (settings.filterKeywords) {
      const keywords = [...defaultSpamKeywords, ...(settings.customKeywords || [])];
      const foundKeywords = keywords.filter(keyword => contentLower.includes(keyword.toLowerCase()));
      
      if (foundKeywords.length > 0) {
        spamCheck.isSpam = true;
        spamCheck.reasons.push(`Contains spam keywords: ${foundKeywords.join(', ')}`);
        spamCheck.confidence += foundKeywords.length * 10;
      }
    }

    // Check for links
    if (settings.filterLinks) {
      const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
      const links = content.match(linkRegex);
      
      if (links && links.length > 3) {
        spamCheck.isSpam = true;
        spamCheck.reasons.push(`Too many links (${links.length})`);
        spamCheck.confidence += links.length * 5;
      }
    }

    // Check for phone numbers
    if (settings.filterNumbers) {
      const phoneRegex = /\b\d{10,}\b/g;
      const numbers = content.match(phoneRegex);
      
      if (numbers && numbers.length > 2) {
        spamCheck.isSpam = true;
        spamCheck.reasons.push(`Too many phone numbers (${numbers.length})`);
        spamCheck.confidence += numbers.length * 5;
      }
    }

    // Check for repeated messages
    if (settings.filterRepeatedMessages) {
      if (!user.messageHistory) user.messageHistory = [];
      
      const recentMessages = user.messageHistory.slice(-20);
      const duplicateCount = recentMessages.filter(m => m.content === content).length;
      
      if (duplicateCount > 2) {
        spamCheck.isSpam = true;
        spamCheck.reasons.push(`Repeated message (${duplicateCount} times)`);
        spamCheck.confidence += duplicateCount * 15;
      }
    }

    // Check sender if unknown contacts filtering is enabled
    if (settings.filterUnknownContacts && senderId) {
      const isContact = user.contacts?.some(c => c.userId.toString() === senderId.toString());
      if (!isContact && !settings.whitelistContacts.includes(senderId.toString())) {
        spamCheck.isSpam = true;
        spamCheck.reasons.push('Message from unknown contact');
        spamCheck.confidence += 20;
      }
    }

    // Apply sensitivity threshold
    const sensitivityThresholds = {
      low: 50,
      medium: 30,
      high: 15
    };
    
    const threshold = sensitivityThresholds[settings.sensitivity] || 30;
    spamCheck.isSpam = spamCheck.confidence >= threshold;

    res.status(200).json({ success: true, ...spamCheck });
  } catch (error) {
    console.error('Check message for spam error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Block spam message
// @route   POST /api/spam-filter/block
// @access  Private
exports.blockSpamMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId, senderId, conversationId, reason } = req.body;

    if (!messageId) {
      return res.status(400).json({ success: false, message: 'Message ID is required' });
    }

    const settings = mergeSettings(user.spamFilterSettings?.toObject?.() || user.spamFilterSettings);
    
    // Add to blocked messages
    if (!user.blockedSpamMessages) user.blockedSpamMessages = [];
    
    const blockedMessage = {
      messageId,
      senderId,
      conversationId,
      reason: reason || 'Spam detected',
      blockedAt: new Date()
    };
    
    user.blockedSpamMessages.push(blockedMessage);

    // Auto-block sender if enabled
    if (settings.autoBlock && senderId) {
      if (!user.blockedUsers) user.blockedUsers = [];
      if (!user.blockedUsers.includes(senderId)) {
        user.blockedUsers.push(senderId);
      }
    }

    // Log blocked message if enabled
    if (settings.logBlockedMessages) {
      if (!user.spamFilterLog) user.spamFilterLog = [];
      user.spamFilterLog.push({
        messageId,
        senderId,
        conversationId,
        reason,
        timestamp: new Date()
      });
    }

    await user.save();

    // Notify user if enabled
    if (settings.notifyOnBlock) {
      // Send notification (mock)
      console.log('Spam notification sent to user');
    }

    res.status(200).json({ success: true, blockedMessage });
  } catch (error) {
    console.error('Block spam message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get blocked spam messages
// @route   GET /api/spam-filter/blocked
// @access  Private
exports.getBlockedSpamMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const blockedMessages = user.blockedSpamMessages || [];
    const { limit } = req.query;
    
    const messageLimit = parseInt(limit) || 50;
    const recentBlocked = blockedMessages.slice(-messageLimit);

    res.status(200).json({ success: true, blockedMessages: recentBlocked });
  } catch (error) {
    console.error('Get blocked spam messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Unblock message
// @route   DELETE /api/spam-filter/blocked/:messageId
// @access  Private
exports.unblockMessage = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { messageId } = req.params;

    const blockedMessages = user.blockedSpamMessages || [];
    const index = blockedMessages.findIndex(m => m.messageId === messageId);
    
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Blocked message not found' });
    }

    blockedMessages.splice(index, 1);
    user.blockedSpamMessages = blockedMessages;
    await user.save();

    res.status(200).json({ success: true, message: 'Message unblocked' });
  } catch (error) {
    console.error('Unblock message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear all blocked spam messages
// @route   DELETE /api/spam-filter/blocked
// @access  Private
exports.clearBlockedMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.blockedSpamMessages = [];
    await user.save();

    res.status(200).json({ success: true, message: 'All blocked messages cleared' });
  } catch (error) {
    console.error('Clear blocked messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add custom keyword
// @route   POST /api/spam-filter/keyword
// @access  Private
exports.addCustomKeyword = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { keyword } = req.body;

    if (!keyword) {
      return res.status(400).json({ success: false, message: 'Keyword is required' });
    }

    const existing = user.spamFilterSettings?.toObject?.() || user.spamFilterSettings || {};
    
    if (!existing.customKeywords) existing.customKeywords = [];
    
    if (!existing.customKeywords.includes(keyword)) {
      existing.customKeywords.push(keyword);
    }

    user.spamFilterSettings = mergeSettings({ ...existing });
    user.markModified('spamFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.spamFilterSettings });
  } catch (error) {
    console.error('Add custom keyword error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove custom keyword
// @route   DELETE /api/spam-filter/keyword/:keyword
// @access  Private
exports.removeCustomKeyword = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { keyword } = req.params;

    const existing = user.spamFilterSettings?.toObject?.() || user.spamFilterSettings || {};
    
    if (existing.customKeywords) {
      existing.customKeywords = existing.customKeywords.filter(k => k !== keyword);
    }

    user.spamFilterSettings = mergeSettings({ ...existing });
    user.markModified('spamFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.spamFilterSettings });
  } catch (error) {
    console.error('Remove custom keyword error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add number to whitelist
// @route   POST /api/spam-filter/whitelist
// @access  Private
exports.addToWhitelist = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { number, contactId } = req.body;

    if (!number && !contactId) {
      return res.status(400).json({ success: false, message: 'Number or contact ID is required' });
    }

    const existing = user.spamFilterSettings?.toObject?.() || user.spamFilterSettings || {};
    
    if (number) {
      if (!existing.whitelistNumbers) existing.whitelistNumbers = [];
      if (!existing.whitelistNumbers.includes(number)) {
        existing.whitelistNumbers.push(number);
      }
    }
    
    if (contactId) {
      if (!existing.whitelistContacts) existing.whitelistContacts = [];
      if (!existing.whitelistContacts.includes(contactId)) {
        existing.whitelistContacts.push(contactId);
      }
    }

    user.spamFilterSettings = mergeSettings({ ...existing });
    user.markModified('spamFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.spamFilterSettings });
  } catch (error) {
    console.error('Add to whitelist error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove from whitelist
// @route   DELETE /api/spam-filter/whitelist/:type/:value
// @access  Private
exports.removeFromWhitelist = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { type, value } = req.params;

    const existing = user.spamFilterSettings?.toObject?.() || user.spamFilterSettings || {};
    
    if (type === 'number' && existing.whitelistNumbers) {
      existing.whitelistNumbers = existing.whitelistNumbers.filter(n => n !== value);
    } else if (type === 'contact' && existing.whitelistContacts) {
      existing.whitelistContacts = existing.whitelistContacts.filter(c => c !== value);
    }

    user.spamFilterSettings = mergeSettings({ ...existing });
    user.markModified('spamFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.spamFilterSettings });
  } catch (error) {
    console.error('Remove from whitelist error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get spam filter log
// @route   GET /api/spam-filter/log
// @access  Private
exports.getSpamFilterLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const log = user.spamFilterLog || [];
    const { limit } = req.query;
    
    const logLimit = parseInt(limit) || 100;
    const recentLog = log.slice(-logLimit);

    res.status(200).json({ success: true, log: recentLog });
  } catch (error) {
    console.error('Get spam filter log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Clear spam filter log
// @route   DELETE /api/spam-filter/log
// @access  Private
exports.clearSpamFilterLog = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.spamFilterLog = [];
    await user.save();

    res.status(200).json({ success: true, message: 'Spam filter log cleared' });
  } catch (error) {
    console.error('Clear spam filter log error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle spam filter
// @route   POST /api/spam-filter/toggle
// @access  Private
exports.toggleSpamFilter = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.spamFilterSettings?.toObject?.() || user.spamFilterSettings || {};
    
    user.spamFilterSettings = mergeSettings({
      ...existing,
      spamFilterEnabled: enabled !== undefined ? enabled : !existing.spamFilterEnabled
    });
    user.markModified('spamFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.spamFilterSettings });
  } catch (error) {
    console.error('Toggle spam filter error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset spam filter settings to default
// @route   POST /api/spam-filter/reset
// @access  Private
exports.resetSpamFilterSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.spamFilterSettings = mergeSettings({});
    user.markModified('spamFilterSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.spamFilterSettings });
  } catch (error) {
    console.error('Reset spam filter settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
