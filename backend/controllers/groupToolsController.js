/**
 * groupToolsController.js
 * -----------------------
 * Consolidated controller for group features + group MODs
 * (REFACTOR_PLAN.md step 5 — merges groupFeaturesController.js +
 * groupModsController.js).
 *
 * Both controllers share getUser/mergeSettings scaffolding; the MODs
 * half had 8 near-identical toggle handlers. This file keeps every
 * exported handler name and route path intact — only the internal
 * wiring is shared now.
 *
 *   /api/group-features/...  →  settings, polls, announcements, events handlers
 *   /api/group-mods/...      →  settings + toggle* MODs handlers
 */

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { getUser, createSettingsMerger, createSettingsHandlers, createToggleHandler } = require('../services/userScopedService');

// ── Shared helper ────────────────────────────────────────────────────────────

const isGroupParticipant = (conversation, userId) => {
  const uid = String(userId);
  return Boolean(
    conversation &&
    conversation.participants &&
    conversation.participants.some((p) => String(p) === uid)
  );
};

// ── Group FEATURES (route prefix /api/group-features) ───────────────────────

const FEATURES_DEFAULTS = {
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
  groupLocationSharing: true,
  adminOnlyAdd: false,
  adminOnlyRemove: false,
  adminOnlyPromote: false,
  groupCreationEnabled: true,
  maxGroupsPerUser: 50
};

const mergeFeaturesSettings = createSettingsMerger(FEATURES_DEFAULTS);

const { getSettings: getGroupFeaturesSettings, updateSettings: updateGroupFeaturesSettings, resetSettings: resetGroupFeaturesSettings } = createSettingsHandlers({
  field: 'groupFeaturesSettings',
  label: 'group features',
  mergeSettings: mergeFeaturesSettings,
});

exports.getGroupFeaturesSettings = getGroupFeaturesSettings;

exports.updateGroupFeaturesSettings = updateGroupFeaturesSettings;

exports.updateGroupMemberLimit = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { limit } = req.body;
    if (limit && (limit < 1 || limit > 5000)) {
      return res.status(400).json({ success: false, message: 'Limit must be between 1 and 5000' });
    }

    const existing = user.groupFeaturesSettings?.toObject?.() || user.groupFeaturesSettings || {};
    user.groupFeaturesSettings = mergeFeaturesSettings({
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

// Generic toggle for a boolean feature setting (accepts optional { enabled }).
const toggleFeaturesField = createToggleHandler({
  settingsField: 'groupFeaturesSettings',
  merge: mergeFeaturesSettings,
  acceptEnabled: true,
});

exports.toggleGroupAdminControl = (req, res) => toggleFeaturesField(req, res, 'groupAdminControl', 'Toggle group admin control');
exports.toggleGroupPolls = (req, res) => toggleFeaturesField(req, res, 'groupPolls', 'Toggle group polls');
exports.toggleGroupAnnouncements = (req, res) => toggleFeaturesField(req, res, 'groupAnnouncements', 'Toggle group announcements');
exports.toggleGroupEvents = (req, res) => toggleFeaturesField(req, res, 'groupEvents', 'Toggle group events');
exports.toggleAntiDeleteGroupMessages = (req, res) => toggleFeaturesField(req, res, 'antiDeleteGroupMessages', 'Toggle anti-delete group messages');

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

    if (!isGroupParticipant(conversation, user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
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

    if (!isGroupParticipant(conversation, user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
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

exports.setGroupAnnouncementsMode = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, enabled } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.isGroup) {
      return res.status(404).json({ success: false, message: 'Group conversation not found' });
    }

    if (!isGroupParticipant(conversation, user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
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

    if (!isGroupParticipant(conversation, user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
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

exports.rsvpGroupEvent = async (req, res) => {
  try {
    const user = await getUser(req, res);
    if (!user) return;

    const { conversationId, eventId, attending } = req.body;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation || !conversation.events) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!isGroupParticipant(conversation, user._id)) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group' });
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

exports.resetGroupFeaturesSettings = resetGroupFeaturesSettings;

// ── Group MODs (route prefix /api/group-mods) ───────────────────────────────

const MODS_DEFAULTS = {
  groupAdminTools: false,
  groupMemberLimitIncrease: false,
  groupDescriptionLength: false,
  groupLinkCustomization: false,
  groupJoinRequestsApproval: false,
  groupAnnouncements: false,
  groupPolls: false,
  groupEvents: false
};

const mergeModsSettings = createSettingsMerger(MODS_DEFAULTS);

// Generic single-field toggle — every group-mods toggle is identical apart
// from the field name and log label.
const toggleModsField = createToggleHandler({
  settingsField: 'groupModsSettings',
  merge: mergeModsSettings,
});

const { getSettings: getGroupModsSettings, updateSettings: updateGroupModsSettings } = createSettingsHandlers({
  field: 'groupModsSettings',
  label: 'group MODs',
  mergeSettings: mergeModsSettings,
});

exports.getGroupModsSettings = getGroupModsSettings;

exports.updateGroupModsSettings = updateGroupModsSettings;

exports.toggleAdminTools = (req, res) => toggleModsField(req, res, 'groupAdminTools', 'Toggle admin tools');
exports.toggleMemberLimit = (req, res) => toggleModsField(req, res, 'groupMemberLimitIncrease', 'Toggle member limit');
exports.toggleDescriptionLength = (req, res) => toggleModsField(req, res, 'groupDescriptionLength', 'Toggle description length');
exports.toggleLinkCustomization = (req, res) => toggleModsField(req, res, 'groupLinkCustomization', 'Toggle link customization');
exports.toggleJoinApproval = (req, res) => toggleModsField(req, res, 'groupJoinRequestsApproval', 'Toggle join approval');
exports.toggleAnnouncements = (req, res) => toggleModsField(req, res, 'groupAnnouncements', 'Toggle announcements');
exports.togglePolls = (req, res) => toggleModsField(req, res, 'groupPolls', 'Toggle polls');
exports.toggleEvents = (req, res) => toggleModsField(req, res, 'groupEvents', 'Toggle events');
