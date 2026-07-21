const ProfileView = require('../models/ProfileView');
const User = require('../models/User');

/**
 * Record that req.user viewed `viewedUserId`'s profile.
 * Respects both sides of privacy:
 *  - If the viewer has `hideViewStatus` ON in their GENZ Mods, we don't log the view (anonymous).
 *  - If the viewed user hasn't enabled `whoViewedProfileEnabled`, we still store it (so it's ready
 *    the moment they turn the feature on) but the viewed user simply won't see the feed unless enabled.
 */
exports.recordProfileView = async (req, res) => {
  try {
    const viewerId = req.user?._id;
    const { userId: viewedUserId } = req.params;

    if (!viewerId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!viewedUserId || viewedUserId === viewerId.toString()) {
      // Don't log self-views
      return res.status(200).json({ success: true, logged: false });
    }

    const viewer = await User.findById(viewerId).select('genzMods');
    const hideViewStatus = Boolean(viewer?.genzMods?.hideViewStatus);

    if (hideViewStatus) {
      return res.status(200).json({ success: true, logged: false, reason: 'hidden_by_viewer' });
    }

    await ProfileView.findOneAndUpdate(
      { viewer: viewerId, viewedUser: viewedUserId },
      { viewedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, logged: true });
  } catch (error) {
    console.error('recordProfileView error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Returns the list of people who viewed the current user's profile,
 * most recent first. Only available if the user has whoViewedProfileEnabled ON.
 */
exports.getMyProfileViewers = async (req, res) => {
  try {
    const user = await User.findById(req.user?._id).select('genzMods');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    if (!user.genzMods?.whoViewedProfileEnabled) {
      return res.status(200).json({
        success: true,
        enabled: false,
        viewers: [],
        message: 'Washa "Who Viewed My Profile" kwenye GENZ Mods ili kuona orodha hii'
      });
    }

    const views = await ProfileView.find({ viewedUser: req.user._id })
      .sort({ viewedAt: -1 })
      .limit(200)
      .populate('viewer', 'name username profilePicture');

    res.status(200).json({
      success: true,
      enabled: true,
      viewers: views.map(v => ({
        user: v.viewer,
        viewedAt: v.viewedAt
      }))
    });
  } catch (error) {
    console.error('getMyProfileViewers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.clearProfileViews = async (req, res) => {
  try {
    await ProfileView.deleteMany({ viewedUser: req.user._id });
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('clearProfileViews error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
