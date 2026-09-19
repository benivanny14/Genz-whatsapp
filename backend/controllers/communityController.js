const Community = require('../models/Community');

// @desc    Get communities for the current user (joined + discoverable)
// @route   GET /api/communities
// @access  Private
exports.getCommunities = async (req, res) => {
  try {
    const userId = req.user?._id;

    const [joined, discoverable] = await Promise.all([
      Community.find({ members: userId }).sort({ createdAt: -1 }),
      Community.find({ public: true }).sort({ createdAt: -1 }).limit(50)
    ]);

    const merged = new Map();
    [...joined, ...discoverable].forEach((c) => merged.set(String(c._id), c));
    const all = [...merged.values()].map((c) => serializeCommunity(c, userId));

    res.status(200).json({ success: true, communities: all });
  } catch (error) {
    console.error('Get communities error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a community
// @route   POST /api/communities
// @access  Private
exports.createCommunity = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { name, description, public: isPublic } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: 'Community name is required' });
    }

    const community = await Community.create({
      name: String(name).trim(),
      description: String(description || '').trim(),
      public: isPublic !== false,
      createdBy: userId,
      members: [userId]
    });

    try {
      const Conversation = require('../models/Conversation');
      const announcementGroup = await Conversation.create({
        name: `${community.name} Announcements`,
        isGroup: true,
        groupAdmin: userId,
        participants: [{ user: userId, role: 'admin' }],
        createdBy: userId,
        communityAnnouncement: true
      });
      community.announcementGroup = announcementGroup._id;
      await community.save();
    } catch (e) { /* best-effort announcement group */ }

    try { const io = req.app.get('io'); if (io) { io.to('role:admin').emit('admin:community_created', serializeCommunity(community, userId)); io.to('admin-room').emit('admin:community_created', serializeCommunity(community, userId)); } } catch {}
    res.status(201).json({ success: true, community: serializeCommunity(community, userId), message: 'Community created' });
  } catch (error) {
    console.error('Create community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Join a community
// @route   POST /api/communities/:id/join
// @access  Private
exports.joinCommunity = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (!community.members.some((m) => String(m) === String(userId))) {
      community.members.push(userId);
      await community.save();
    }

    res.status(200).json({ success: true, community: serializeCommunity(community, userId), message: 'Joined community' });
  } catch (error) {
    console.error('Join community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Leave a community
// @route   POST /api/communities/:id/leave
// @access  Private
exports.leaveCommunity = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    community.members = community.members.filter((m) => String(m) !== String(userId));
    await community.save();

    res.status(200).json({ success: true, community: serializeCommunity(community, userId), message: 'Left community' });
  } catch (error) {
    console.error('Leave community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a community (owner only)
// @route   PATCH /api/communities/:id
// @access  Private
exports.updateCommunity = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { name, description, public: isPublic } = req.body;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (String(community.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the creator can edit this community' });
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Community name is required' });
      }
      community.name = String(name).trim();
    }
    if (description !== undefined) {
      community.description = String(description).trim();
    }
    if (isPublic !== undefined) {
      community.public = isPublic !== false;
    }

    await community.save();

    res.status(200).json({ success: true, community: serializeCommunity(community, userId), message: 'Community updated' });
  } catch (error) {
    console.error('Update community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a community (owner only)
// @route   DELETE /api/communities/:id
// @access  Private
exports.deleteCommunity = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (String(community.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the creator can delete this community' });
    }

    await Community.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Community deleted' });
  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function serializeCommunity(community, userId) {
  const joined = community.members.some((m) => String(m) === String(userId));
  return {
    _id: community._id,
    id: String(community._id),
    name: community.name,
    description: community.description,
    public: community.public,
    members: community.members.length,
    groups: community.groups ? community.groups.length : 0,
    groupIds: community.groups ? community.groups.map(String) : [],
    announcementGroup: community.announcementGroup ? String(community.announcementGroup) : null,
    joined,
    createdBy: String(community.createdBy),
    createdAt: community.createdAt
  };
}

// @desc    Add a group to a community (owner only)
// @route   POST /api/communities/:id/groups
// @access  Private
exports.addGroupToCommunity = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;
    const { groupId } = req.body;

    if (!groupId) {
      return res.status(400).json({ success: false, message: 'groupId is required' });
    }

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (String(community.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the creator can manage community groups' });
    }

    const gid = String(groupId);
    if (community.groups.some(g => String(g) === gid)) {
      return res.status(400).json({ success: false, message: 'Group already in this community' });
    }

    community.groups.push(groupId);
    await community.save();

    res.status(200).json({ success: true, community: serializeCommunity(community, userId), message: 'Group added to community' });
  } catch (error) {
    console.error('Add group to community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Remove a group from a community (owner only)
// @route   DELETE /api/communities/:id/groups/:groupId
// @access  Private
exports.removeGroupFromCommunity = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id, groupId } = req.params;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (String(community.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the creator can manage community groups' });
    }

    const before = community.groups.length;
    community.groups = community.groups.filter(g => String(g) !== String(groupId));

    if (community.groups.length === before) {
      return res.status(404).json({ success: false, message: 'Group not found in this community' });
    }

    await community.save();
    res.status(200).json({ success: true, community: serializeCommunity(community, userId), message: 'Group removed from community' });
  } catch (error) {
    console.error('Remove group from community error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create announcement group for a community (owner only)
// @route   POST /api/communities/:id/announcement
// @access  Private
exports.createAnnouncementGroup = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const community = await Community.findById(id);
    if (!community) {
      return res.status(404).json({ success: false, message: 'Community not found' });
    }

    if (String(community.createdBy) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the creator can create announcement groups' });
    }

    if (community.announcementGroup) {
      return res.status(400).json({ success: false, message: 'Announcement group already exists', groupId: String(community.announcementGroup) });
    }

    const Conversation = require('../models/Conversation');
    const announcementGroup = await Conversation.create({
      name: `${community.name} Announcements`,
      isGroup: true,
      groupAdmin: userId,
      participants: community.members.map(m => ({ user: m, role: m.toString() === String(userId) ? 'admin' : 'member' })),
      createdBy: userId,
      communityAnnouncement: true
    });

    community.announcementGroup = announcementGroup._id;
    await community.save();

    res.status(201).json({ success: true, community: serializeCommunity(community, userId), announcementGroupId: String(announcementGroup._id), message: 'Announcement group created' });
  } catch (error) {
    console.error('Create announcement group error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
