const Community = require('../models/Community');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

const getCurrentUserId = (req) => req.user?._id?.toString();

// Create a new community
exports.createCommunity = async (req, res) => {
  try {
    const { name, description, icon, isPublic } = req.body;
    const creatorId = getCurrentUserId(req);

    if (!name) {
      return res.status(400).json({ success: false, message: 'Community name is required' });
    }

    const community = await Community.create({
      name,
      description: description || '',
      icon: icon || '',
      createdBy: creatorId,
      admins: [creatorId],
      members: [creatorId],
      isPublic: isPublic || false
    });

    res.status(201).json({ success: true, community });
  } catch (error) {
    console.error('Create community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all communities user is a member of
exports.getUserCommunities = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const communities = await Community.find({
      members: userId
    })
      .populate('createdBy', 'username profilePicture')
      .populate('admins', 'username profilePicture')
      .populate('groups', 'groupName groupPhoto')
      .sort({ updatedAt: -1 });

    res.json({ success: true, communities });
  } catch (error) {
    console.error('Get communities error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get community by ID
exports.getCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = getCurrentUserId(req);

    const community = await Community.findById(communityId)
      .populate('createdBy', 'username profilePicture')
      .populate('admins', 'username profilePicture')
      .populate('members', 'username profilePicture')
      .populate('groups', 'groupName groupPhoto participants');

    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Check if user is a member
    if (!community.members.some(m => m._id.toString() === userId)) {
      return res.status(403).json({ success: false, message: 'Not a member of this community' });
    }

    res.json({ success: true, community });
  } catch (error) {
    console.error('Get community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add group to community
exports.addGroupToCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { groupId } = req.body;
    const userId = getCurrentUserId(req);

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Check if user is admin
    if (!community.admins.some(a => a.toString() === userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can add groups' });
    }

    const group = await Conversation.findById(groupId);
    if (!group || !group.isGroup) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    // Check if group already in community
    if (community.groups.includes(groupId)) {
      return res.status(400).json({ success: false, message: 'Group already in community' });
    }

    community.groups.push(groupId);
    await community.save();

    res.json({ success: true, community });
  } catch (error) {
    console.error('Add group to community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove group from community
exports.removeGroupFromCommunity = async (req, res) => {
  try {
    const { communityId, groupId } = req.params;
    const userId = getCurrentUserId(req);

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Check if user is admin
    if (!community.admins.some(a => a.toString() === userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can remove groups' });
    }

    community.groups = community.groups.filter(g => g.toString() !== groupId);
    await community.save();

    res.json({ success: true, community });
  } catch (error) {
    console.error('Remove group from community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add member to community
exports.addMemberToCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { userId } = req.body;
    const requesterId = getCurrentUserId(req);

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Check if user is admin
    if (!community.admins.some(a => a.toString() === requesterId)) {
      return res.status(403).json({ success: false, message: 'Only admins can add members' });
    }

    // Check if user already a member
    if (community.members.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User already a member' });
    }

    community.members.push(userId);
    await community.save();

    res.json({ success: true, community });
  } catch (error) {
    console.error('Add member to community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update community info
exports.updateCommunity = async (req, res) => {
  try {
    const { communityId } = req.params;
    const { name, description, icon, isPublic } = req.body;
    const userId = getCurrentUserId(req);

    const community = await Community.findById(communityId);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    // Check if user is admin
    if (!community.admins.some(a => a.toString() === userId)) {
      return res.status(403).json({ success: false, message: 'Only admins can update community' });
    }

    if (name) community.name = name;
    if (description !== undefined) community.description = description;
    if (icon !== undefined) community.icon = icon;
    if (isPublic !== undefined) community.isPublic = isPublic;

    community.updatedAt = new Date();
    await community.save();

    res.json({ success: true, community });
  } catch (error) {
    console.error('Update community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
