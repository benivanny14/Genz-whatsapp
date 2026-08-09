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
    joined,
    createdBy: String(community.createdBy),
    createdAt: community.createdAt
  };
}
