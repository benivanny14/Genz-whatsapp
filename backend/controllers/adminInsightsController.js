const User = require('../models/User');
const Message = require('../models/Message');
const ManualPayment = require('../models/ManualPayment');

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

// ===========================================================================
// REPORTS & ANALYTICS
// ===========================================================================
exports.getGrowthReport = async (req, res) => {
  try {
    const since = daysAgo(30);
    const [userGrowth, messageGrowth, revenueGrowth] = await Promise.all([
      User.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Message.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      ManualPayment.aggregate([
        { $match: { status: 'Approved', approvedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$approvedAt' } }, total: { $sum: '$amount' } } },
        { $sort: { _id: 1 } }
      ])
    ]);
    res.json({ success: true, report: { userGrowth, messageGrowth, revenueGrowth } });
  } catch (error) {
    console.error('[AdminReports] getGrowthReport error:', error);
    res.status(500).json({ success: false, message: 'Failed to build report' });
  }
};

exports.getEngagementReport = async (req, res) => {
  try {
    const since = daysAgo(7);
    const [dau, topSenders] = await Promise.all([
      User.countDocuments({ lastSeen: { $gte: daysAgo(1) } }),
      Message.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$sender', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: { count: 1, 'user.username': 1 } }
      ])
    ]);
    res.json({ success: true, report: { dailyActiveUsers: dau, topSenders } });
  } catch (error) {
    console.error('[AdminReports] getEngagementReport error:', error);
    res.status(500).json({ success: false, message: 'Failed to build engagement report' });
  }
};

// ===========================================================================
// FRAUD DETECTION
// (Duplicate PAYMENT transaction IDs are already covered by the dedicated
// "Duplicate Payment Detection" section. This section focuses on account-
// level fraud signals.)
// ===========================================================================
exports.getFraudSignals = async (req, res) => {
  try {
    // Multiple accounts sharing the same IP address inside activeSessions
    const sharedIps = await User.aggregate([
      { $unwind: '$activeSessions' },
      { $match: { 'activeSessions.ip': { $nin: [null, '', '127.0.0.1'] } } },
      { $group: { _id: '$activeSessions.ip', users: { $addToSet: { id: '$_id', username: '$username' } } } },
      { $project: { userCount: { $size: '$users' }, users: 1 } },
      { $match: { userCount: { $gt: 2 } } },
      { $sort: { userCount: -1 } },
      { $limit: 20 }
    ]);

    // Accounts locked or repeatedly failing login — possible credential
    // stuffing / brute force targets
    const bruteForceTargets = await User.find({ failedLoginAttempts: { $gte: 3 } })
      .select('username phoneNumber failedLoginAttempts lockUntil')
      .sort({ failedLoginAttempts: -1 })
      .limit(20)
      .lean();

    // Accounts created in rapid bursts from the same rough time window
    // (possible bot / mass-registration activity)
    const signupBursts = await User.aggregate([
      { $match: { createdAt: { $gte: daysAgo(14) } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d %H', date: '$createdAt' } },
        count: { $sum: 1 }
      } },
      { $match: { count: { $gte: 10 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      signals: { sharedIps, bruteForceTargets, signupBursts }
    });
  } catch (error) {
    console.error('[AdminFraud] getFraudSignals error:', error);
    res.status(500).json({ success: false, message: 'Failed to compute fraud signals' });
  }
};
