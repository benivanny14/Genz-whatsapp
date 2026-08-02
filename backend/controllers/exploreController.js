const Status = require('../models/Status');
const Channel = require('../models/Channel');
const User = require('../models/User');

// @desc    Get trending / for-you content for Explore
// @route   GET /api/explore
// @access  Private
exports.getExplore = async (req, res) => {
  try {
    const userId = req.user?._id;

    // Trending = public statuses ordered by engagement (views + likes).
    const trendingRaw = await Status.find({
      isDraft: { $ne: true },
      isArchived: { $ne: true },
      privacy: { $in: ['everyone', 'contacts', ''] }
    })
      .populate('user', 'username profilePicture')
      .sort({ viewsCount: -1, likesCount: -1, createdAt: -1 })
      .limit(30);

    const trending = trendingRaw.map((s) => serializeStatus(s));

    // For-you = freshest public statuses.
    const forYouRaw = await Status.find({
      isDraft: { $ne: true },
      isArchived: { $ne: true },
      privacy: { $in: ['everyone', 'contacts', ''] }
    })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(30);

    const forYou = forYouRaw.map((s) => serializeStatus(s));

    // Creators = top public channels by follower count.
    const creatorsRaw = await Channel.find({ isPublic: true })
      .populate('owner', 'username profilePicture')
      .sort({ followersCount: -1 })
      .limit(30);

    const creators = creatorsRaw.map((c) => ({
      id: String(c._id),
      username: c.owner?.username || c.name,
      name: c.name,
      verified: !!c.verified,
      followers: c.followersCount,
      avatar: c.avatar || c.owner?.profilePicture || '',
      description: c.description || ''
    }));

    // Nearby = public statuses with location data.
    const nearbyRaw = await Status.find({
      isDraft: { $ne: true },
      isArchived: { $ne: true },
      privacy: { $in: ['everyone', 'contacts', ''] },
      'locationData.lat': { $exists: true, $ne: null }
    })
      .populate('user', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(30);

    const nearby = nearbyRaw.map((s) => ({
      id: String(s._id),
      type: s.type || 'status',
      location: s.locationData?.address || 'Nearby',
      distance: '',
      lat: s.locationData?.lat || 0,
      lng: s.locationData?.lng || 0,
      user: { username: s.user?.username || s.username || 'Unknown' }
    }));

    res.status(200).json({ success: true, trending, forYou, creators, nearby });
  } catch (error) {
    console.error('Get explore error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Search explore content
// @route   GET /api/explore/search?q=...
// @access  Private
exports.searchExplore = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ success: false, message: 'Search query is required' });
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const [statuses, channels] = await Promise.all([
      Status.find({
        isDraft: { $ne: true },
        isArchived: { $ne: true },
        privacy: { $in: ['everyone', 'contacts', ''] },
        $or: [{ caption: regex }, { content: regex }, { hashtags: q.toLowerCase() }]
      })
        .populate('user', 'username profilePicture')
        .sort({ createdAt: -1 })
        .limit(30),
      Channel.find({ isPublic: true, $or: [{ name: regex }, { description: regex }] })
        .populate('owner', 'username profilePicture')
        .sort({ followersCount: -1 })
        .limit(30)
    ]);

    const content = statuses.map((s) => serializeStatus(s));
    const creators = channels.map((c) => ({
      id: String(c._id),
      username: c.owner?.username || c.name,
      name: c.name,
      verified: !!c.verified,
      followers: c.followersCount,
      avatar: c.avatar || c.owner?.profilePicture || '',
      description: c.description || ''
    }));

    res.status(200).json({ success: true, content, creators });
  } catch (error) {
    console.error('Search explore error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

function serializeStatus(s) {
  return {
    id: String(s._id),
    type: s.type || 'status',
    mediaUrl: s.mediaUrl || '',
    caption: s.caption || s.content || '',
    views: s.viewsCount || 0,
    likes: s.likesCount || 0,
    username: s.user?.username || s.username || 'Unknown',
    userAvatar: s.user?.profilePicture || '',
    verified: false,
    hashtags: s.hashtags || [],
    location: s.locationData?.address || '',
    createdAt: s.createdAt
  };
}
