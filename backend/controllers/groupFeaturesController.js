const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

const defaultSettings = {
  groupAdminControl: true,
  groupMemberLimit: 1024,
  groupDescription: true,
  groupAvatar: true,
  groupInviteLink: true,
  groupMute: true,
  groupNotifications: true,
  groupQRCode: true,
  restrictMessaging: false,
  antiDeleteGroupMessages: true,
  groupPolls: true,
  groupAnnouncements: false,
  groupEvents: true,
  groupMediaSharing: true,
  groupDocumentSharing: true,
  groupVoiceCalls: true,
  groupVideoCalls: true,
  groupScreenShare: true,
  groupLocationSharing: true,
  adminOnlyAdd: false,
  adminOnlyRemove: false,
  adminOnlyPromote: false,
  groupCreationEnabled: true,
  maxGroupsPerUser: 50
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

// @desc    Get group features settings
// @route   GET /api/group-features/settings
// @access  Private
exports.getGroupFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const settings = mergeSettings(user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings);
    res.status(200).json({ success: true, settings });
  } catch (error) {
    console.error('Get group features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update group features settings
// @route   POST /api/group-features/settings
// @access  Private
exports.updateGroupFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const incoming = req.body.settings || req.body;
    const existing = user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings || {};
    
    user.groupFeaturesSettings = mergeSettings({ ...existing, ...incoming });
    user.markModified('groupFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupFeaturesSettings });
  } catch (error) {
    console.error('Update group features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update group member limit
// @route   POST /api/group-features/member-limit
// @access  Private
exports.updateGroupMemberLimit = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { limit } = req.body;
    if (limit && (limit < 1 || limit > 5000)) {
      return res.status(400).json({ success: false, message: 'Limit must be between 1 and 5000' });
    }

    const existing = user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings || {};
    user.groupFeaturesSettings = mergeSettings({
      ...existing,
      groupMemberLimit: limit !== undefined ? limit : existing.groupMemberLimit
    });
    user.markModified('groupFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupFeaturesSettings });
  } catch (error) {
    console.error('Update group member limit error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle group admin control
// @route   POST /api/group-features/admin-control
// @access  Private
exports.toggleGroupAdminControl = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings || {};
    
    user.groupFeaturesSettings = mergeSettings({
      ...existing,
      groupAdminControl: enabled !== undefined ? enabled : !existing.groupAdminControl
    });
    user.markModified('groupFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupFeaturesSettings });
  } catch (error) {
    console.error('Toggle group admin control error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle group polls
// @route   POST /api/group-features/polls
// @access  Private
exports.toggleGroupPolls = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings || {};
    
    user.groupFeaturesSettings = mergeSettings({
      ...existing,
      groupPolls: enabled !== undefined ? enabled : !existing.groupPolls
    });
    user.markModified('groupFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupFeaturesSettings });
  } catch (error) {
    console.error('Toggle group polls error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create group poll
// @route   POST /api/group-features/poll/create
// @access  Private
exports.createGroupPoll = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, question, options, duration } = req.body;

    if (!conversationId || !question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'Conversation ID, question, and at least 2 options are required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group conversation not found' });
    }

    const poll = {
      _id: new (require('mongoose').Types.ObjectId)(),
      question,
      options: options.map(opt => ({ text: opt, votes: 0, voters: [] })),
      createdBy: user._id,
      createdAt: new Date(),
      expiresAt: duration ? new Date(Date.now() + duration * 60 * 1000) : null,
      active: true
    };

    if (!conversation.polls) conversation.polls = [];
    conversation.polls.push(poll);
    await conversation.save();

    res.status(200).json({ success: true, poll });
  } catch (error) {
    console.error('Create group poll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Vote in group poll
// @route   POST /api/group-features/poll/vote
// @access  Private
exports.voteGroupPoll = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, pollId, optionIndex } = req.body;

    if (!conversationId || !pollId || optionIndex === undefined) {
      return res.status(400).json({ success: false, message: 'Conversation ID, poll ID, and option index are required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.polls) {
      return res.status(404).json({ success: false, message: 'Poll not found' });
    }

    const poll = conversation.polls.id(pollId);
    if (!poll || !poll.active) {
      return res.status(404).json({ success: false, message: 'Poll not found or expired' });
    }

    if (poll.expiresAt && new Date() > poll.expiresAt) {
      poll.active = false;
      await conversation.save();
      return res.status(400).json({ success: false, message: 'Poll has expired' });
    }

    // Check if user already voted
    const hasVoted = poll.options.some(opt => opt.voters.includes(user._id.toString()));
    if (hasVoted) {
      return res.status(400).json({ success: false, message: 'You have already voted in this poll' });
    }

    if (optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid option index' });
    }

    poll.options[optionIndex].votes += 1;
    poll.options[optionIndex].voters.push(user._id.toString());
    await conversation.save();

    res.status(200).json({ success: true, poll });
  } catch (error) {
    console.error('Vote group poll error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle group announcements
// @route   POST /api/group-features/announcements
// @access  Private
exports.toggleGroupAnnouncements = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings || {};
    
    user.groupFeaturesSettings = mergeSettings({
      ...existing,
      groupAnnouncements: enabled !== undefined ? enabled : !existing.groupAnnouncements
    });
    user.markModified('groupFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupFeaturesSettings });
  } catch (error) {
    console.error('Toggle group announcements error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Set group announcements mode
// @route   POST /api/group-features/announcements-mode
// @access  Private
exports.setGroupAnnouncementsMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, enabled } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group conversation not found' });
    }

    // Check if user is admin
    if (!conversation.admins || !conversation.admins.some(a => String(a) === String(user._id))) {
      return res.status(403).json({ success: false, message: 'Only admins can change announcements mode' });
    }

    conversation.announcementsOnly = enabled;
    await conversation.save();

    res.status(200).json({ success: true, announcementsOnly: conversation.announcementsOnly });
  } catch (error) {
    console.error('Set group announcements mode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle group events
// @route   POST /api/group-features/events
// @access  Private
exports.toggleGroupEvents = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings || {};
    
    user.groupFeaturesSettings = mergeSettings({
      ...existing,
      groupEvents: enabled !== undefined ? enabled : !existing.groupEvents
    });
    user.markModified('groupFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupFeaturesSettings });
  } catch (error) {
    console.error('Toggle group events error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create group event
// @route   POST /api/group-features/event/create
// @access  Private
exports.createGroupEvent = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, title, description, date, time, location } = req.body;

    if (!conversationId || !title || !date) {
      return res.status(400).json({ success: false, message: 'Conversation ID, title, and date are required' });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group conversation not found' });
    }

    const event = {
      _id: new (require('mongoose').Types.ObjectId)(),
      title,
      description,
      date: new Date(date),
      time,
      location,
      createdBy: user._id,
      createdAt: new Date(),
      attendees: [user._id.toString()]
    };

    if (!conversation.events) conversation.events = [];
    conversation.events.push(event);
    await conversation.save();

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error('Create group event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    RSVP to group event
// @route   POST /api/group-features/event/rsvp
// @access  Private
exports.rsvpGroupEvent = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, eventId, attending } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.events) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const event = conversation.events.id(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (attending) {
      if (!event.attendees.includes(user._id.toString())) {
        event.attendees.push(user._id.toString());
      }
    } else {
      event.attendees = event.attendees.filter(id => id !== user._id.toString());
    }

    await conversation.save();

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error('RSVP group event error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle anti-delete group messages
// @route   POST /api/group-features/anti-delete
// @access  Private
exports.toggleAntiDeleteGroupMessages = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { enabled } = req.body;
    const existing = user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings || {};
    
    user.groupFeaturesSettings = mergeSettings({
      ...existing,
      antiDeleteGroupMessages: enabled !== undefined ? enabled : !existing.antiDeleteGroupMessages
    });
    user.markModified('groupFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupFeaturesSettings });
  } catch (error) {
    console.error('Toggle anti-delete group messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset group features settings to default
// @route   POST /api/group-features/reset
// @access  Private
exports.resetGroupFeaturesSettings = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    user.groupFeaturesSettings = mergeSettings({});
    user.markModified('groupFeaturesSettings');
    await user.save();

    res.status(200).json({ success: true, settings: user.groupFeaturesSettings });
  } catch (error) {
    console.error('Reset group features settings error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
