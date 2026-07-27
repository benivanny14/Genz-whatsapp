const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const ChannelPost = require('../models/ChannelPost');
const Status = require('../models/Status');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (val, def, min, max) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

// ===========================================================================
// CHAT MANAGEMENT
// ===========================================================================
exports.listConversations = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const filter = req.query.isGroup === 'true' ? { isGroup: true }
      : req.query.isGroup === 'false' ? { isGroup: false } : {};

    const [total, conversations] = await Promise.all([
      Conversation.countDocuments(filter),
      Conversation.find(filter)
        .populate('participants', 'username phoneNumber')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const withCounts = await Promise.all(conversations.map(async (c) => ({
      ...c,
      messageCount: await Message.countDocuments({ conversationId: c._id })
    })));

    res.json({ success: true, conversations: withCounts, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    console.error('[AdminContent] listConversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to load conversations' });
  }
};

exports.getConversationMessages = async (req, res) => {
  try {
    const limit = clampInt(req.query.limit, 50, 1, 200);
    const messages = await Message.find({ conversationId: req.params.id })
      .populate('sender', 'username')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, messages });
  } catch (error) {
    console.error('[AdminContent] getConversationMessages error:', error);
    res.status(500).json({ success: false, message: 'Failed to load messages' });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) return res.status(404).json({ success: false, message: 'Conversation not found' });

    await Message.deleteMany({ conversationId: conversation._id });
    await conversation.deleteOne();

    await logAdminAction(req.admin.id, 'admin_deleted_conversation', { conversationId: req.params.id }, null, null, req);
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    console.error('[AdminContent] deleteConversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete conversation' });
  }
};

// ===========================================================================
// GROUP MANAGEMENT (Conversation with isGroup: true)
// ===========================================================================
exports.listGroups = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const search = String(req.query.search || '').trim();
    const filter = { isGroup: true };
    if (search) filter.groupName = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [total, groups] = await Promise.all([
      Conversation.countDocuments(filter),
      Conversation.find(filter)
        .select('groupName groupPhoto groupDescription participants admins createdBy createdAt updatedAt')
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const withCounts = groups.map((g) => ({ ...g, memberCount: g.participants?.length || 0 }));
    res.json({ success: true, groups: withCounts, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    console.error('[AdminContent] listGroups error:', error);
    res.status(500).json({ success: false, message: 'Failed to load groups' });
  }
};

exports.getGroupMembers = async (req, res) => {
  try {
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true })
      .populate('participants', 'username phoneNumber isBlocked')
      .populate('admins', 'username')
      .lean();
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load group' });
  }
};

exports.removeGroupMember = async (req, res) => {
  try {
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    group.participants = group.participants.filter((p) => p.toString() !== req.params.userId);
    group.admins = group.admins.filter((a) => a.toString() !== req.params.userId);
    await group.save();

    await logAdminAction(req.admin.id, 'admin_removed_group_member', { groupId: req.params.id, userId: req.params.userId }, req.params.userId, null, req);
    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const group = await Conversation.findOne({ _id: req.params.id, isGroup: true });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    await Message.deleteMany({ conversationId: group._id });
    await group.deleteOne();

    await logAdminAction(req.admin.id, 'admin_deleted_group', { groupId: req.params.id }, null, null, req);
    res.json({ success: true, message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete group' });
  }
};

// ===========================================================================
// CHANNEL MANAGEMENT
// ===========================================================================
exports.listChannels = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const [total, channels] = await Promise.all([
      Channel.countDocuments(),
      Channel.find()
        .populate('owner', 'username phoneNumber')
        .sort({ followersCount: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);
    res.json({ success: true, channels, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load channels' });
  }
};

exports.toggleChannelVerified = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    channel.verified = !channel.verified;
    await channel.save();
    await logAdminAction(req.admin.id, 'admin_toggled_channel_verified', { channelId: channel._id, verified: channel.verified }, null, null, req);
    res.json({ success: true, channel });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update channel' });
  }
};

exports.deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id);
    if (!channel) return res.status(404).json({ success: false, message: 'Channel not found' });
    await ChannelPost.deleteMany({ channel: channel._id });
    await channel.deleteOne();
    await logAdminAction(req.admin.id, 'admin_deleted_channel', { channelId: req.params.id }, null, null, req);
    res.json({ success: true, message: 'Channel deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete channel' });
  }
};

exports.listChannelPosts = async (req, res) => {
  try {
    const posts = await ChannelPost.find({ channel: req.params.id, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, posts });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load posts' });
  }
};

exports.deleteChannelPost = async (req, res) => {
  try {
    const post = await ChannelPost.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    post.deletedAt = new Date();
    await post.save();
    await logAdminAction(req.admin.id, 'admin_deleted_channel_post', { postId: post._id }, null, null, req);
    res.json({ success: true, message: 'Post removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
};

// ===========================================================================
// STATUS / STORIES MANAGEMENT
// (WhatsApp "Status" and "Stories" are the same underlying feature here —
// this section additionally groups them per-user as "story highlights".)
// ===========================================================================
exports.listStatuses = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const now = new Date();
    const filter = req.query.active === 'true' ? { expiresAt: { $gt: now } } : {};

    const [total, statuses] = await Promise.all([
      Status.countDocuments(filter),
      Status.find(filter)
        .populate('user', 'username phoneNumber')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);
    res.json({ success: true, statuses, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load statuses' });
  }
};

exports.listStoryHighlights = async (req, res) => {
  try {
    const highlights = await Status.aggregate([
      { $group: {
        _id: '$user',
        count: { $sum: 1 },
        lastPostedAt: { $max: '$createdAt' },
        totalViews: { $sum: { $size: { $ifNull: ['$views', []] } } }
      } },
      { $sort: { lastPostedAt: -1 } },
      { $limit: 50 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: { count: 1, lastPostedAt: 1, totalViews: 1, 'user.username': 1, 'user.phoneNumber': 1 } }
    ]);
    res.json({ success: true, highlights });
  } catch (error) {
    console.error('[AdminContent] listStoryHighlights error:', error);
    res.status(500).json({ success: false, message: 'Failed to load story highlights' });
  }
};

exports.deleteStatus = async (req, res) => {
  try {
    const status = await Status.findById(req.params.id);
    if (!status) return res.status(404).json({ success: false, message: 'Status not found' });
    await status.deleteOne();
    await logAdminAction(req.admin.id, 'admin_deleted_status', { statusId: req.params.id }, null, null, req);
    res.json({ success: true, message: 'Status deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete status' });
  }
};
