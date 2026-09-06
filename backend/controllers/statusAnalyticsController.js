const StatusAnalytics = require('../models/StatusAnalytics');
const Status = require('../models/Status');

// @desc    Get analytics for a status
// @route   GET /api/status-analytics/:statusId
// @access  Private
exports.getStatusAnalytics = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user._id;

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Only owner can view analytics
    if (String(status.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    let analytics = await StatusAnalytics.findOne({ statusId });

    // If analytics doesn't exist, create it from status data
    if (!analytics) {
      analytics = await StatusAnalytics.create({
        statusId,
        userId,
        views: status.views?.length || 0,
        uniqueViews: status.views?.length || 0,
        replies: status.replies?.length || 0,
        reactions: status.reactions?.length || 0,
        screenshots: 0,
        peakTime: status.createdAt
      });
    }

    // Get detailed breakdown
    const statusWithDetails = await Status.findById(statusId)
      .populate('views.userId', 'username profilePicture')
      .populate('views.user', 'username profilePicture')
      .populate('reactions.userId', 'username profilePicture')
      .populate('reactions.user', 'username profilePicture')
      .populate('replies.senderId', 'username profilePicture');

    const reactionBreakdown = {};
    statusWithDetails.reactions?.forEach(r => {
      reactionBreakdown[r.emoji] = (reactionBreakdown[r.emoji] || 0) + 1;
    });

    const viewsOverTime = {};
    statusWithDetails.views?.forEach(v => {
      const hour = new Date(v.viewedAt).getHours();
      viewsOverTime[hour] = (viewsOverTime[hour] || 0) + 1;
    });

    res.json({
      success: true,
      analytics: {
        ...analytics.toObject(),
        reactionBreakdown,
        viewsOverTime,
        totalViews: statusWithDetails.views?.length || 0,
        totalReplies: statusWithDetails.replies?.length || 0,
        totalReactions: statusWithDetails.reactions?.length || 0
      }
    });
  } catch (error) {
    console.error('Get status analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
};

// @desc    Get analytics summary for all user's statuses
// @route   GET /api/status-analytics/summary
// @access  Private
exports.getAnalyticsSummary = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const statuses = await Status.find({ 
      userId,
      ...dateFilter
    }).select('_id views reactions replies createdAt');

    let totalViews = 0;
    let totalReactions = 0;
    let totalReplies = 0;
    const statusStats = [];

    for (const status of statuses) {
      const views = status.views?.length || 0;
      const reactions = status.reactions?.length || 0;
      const replies = status.replies?.length || 0;

      totalViews += views;
      totalReactions += reactions;
      totalReplies += replies;

      statusStats.push({
        statusId: status._id,
        views,
        reactions,
        replies,
        createdAt: status.createdAt
      });
    }

    const avgViews = statuses.length > 0 ? totalViews / statuses.length : 0;
    const avgReactions = statuses.length > 0 ? totalReactions / statuses.length : 0;
    const avgReplies = statuses.length > 0 ? totalReplies / statuses.length : 0;

    res.json({
      success: true,
      summary: {
        totalStatuses: statuses.length,
        totalViews,
        totalReactions,
        totalReplies,
        avgViews: Math.round(avgViews * 100) / 100,
        avgReactions: Math.round(avgReactions * 100) / 100,
        avgReplies: Math.round(avgReplies * 100) / 100,
        statusStats
      }
    });
  } catch (error) {
    console.error('Get analytics summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
};

// @desc    Update analytics (internal use)
// @route   POST /api/status-analytics/:statusId/update
// @access  Private
exports.updateAnalytics = async (req, res) => {
  try {
    const { statusId } = req.params;
    const { type } = req.body; // 'view', 'reply', 'reaction', 'screenshot'

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    const updateData = {};
    switch (type) {
      case 'view':
        updateData.$inc = { views: 1, uniqueViews: 1 };
        break;
      case 'reply':
        updateData.$inc = { replies: 1 };
        break;
      case 'reaction':
        updateData.$inc = { reactions: 1 };
        break;
      case 'screenshot':
        updateData.$inc = { screenshots: 1 };
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid update type' });
    }

    const analytics = await StatusAnalytics.findOneAndUpdate(
      { statusId },
      updateData,
      { upsert: true, new: true }
    );

    // Update peak time if this is the highest activity
    if (analytics) {
      const totalActivity = analytics.views + analytics.replies + analytics.reactions;
      if (totalActivity > (analytics.peakActivity || 0)) {
        analytics.peakActivity = totalActivity;
        analytics.peakTime = new Date();
        await analytics.save();
      }
    }

    res.json({ success: true, analytics });
  } catch (error) {
    console.error('Update analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to update analytics' });
  }
};

// @desc    Delete analytics for a status
// @route   DELETE /api/status-analytics/:statusId
// @access  Private
exports.deleteAnalytics = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user._id;

    const status = await Status.findById(statusId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Status not found' });
    }

    // Only owner can delete analytics
    if (String(status.userId) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await StatusAnalytics.findOneAndDelete({ statusId });

    res.json({ success: true, message: 'Analytics deleted' });
  } catch (error) {
    console.error('Delete analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete analytics' });
  }
};
