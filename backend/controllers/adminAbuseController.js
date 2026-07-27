const AbuseReport = require('../models/AbuseReport');
const User = require('../models/User');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (val, def, min, max) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

// List all abuse reports with filtering and pagination
exports.listAbuseReports = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const filter = {};
    
    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filter by category
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Filter by priority
    if (req.query.priority) {
      filter.priority = req.query.priority;
    }
    
    // Filter by content type
    if (req.query.contentType) {
      filter.contentType = req.query.contentType;
    }
    
    const [total, reports] = await Promise.all([
      AbuseReport.countDocuments(filter),
      AbuseReport.find(filter)
        .populate('reporterId', 'username phoneNumber')
        .populate('reportedUserId', 'username phoneNumber')
        .populate('resolvedBy', 'username')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);
    
    res.json({ 
      success: true, 
      reports, 
      pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } 
    });
  } catch (error) {
    console.error('[AdminAbuse] listAbuseReports error:', error);
    res.status(500).json({ success: false, message: 'Failed to load abuse reports' });
  }
};

// Get a single abuse report with full details
exports.getAbuseReport = async (req, res) => {
  try {
    const report = await AbuseReport.findById(req.params.id)
      .populate('reporterId', 'username phoneNumber email')
      .populate('reportedUserId', 'username phoneNumber email isBlocked')
      .populate('resolvedBy', 'username')
      .lean();
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    res.json({ success: true, report });
  } catch (error) {
    console.error('[AdminAbuse] getAbuseReport error:', error);
    res.status(500).json({ success: false, message: 'Failed to load report' });
  }
};

// Update report status and add admin notes
exports.updateAbuseReportStatus = async (req, res) => {
  try {
    const { status, adminNotes, actionTaken } = req.body || {};
    
    if (!['pending', 'under_review', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    if (actionTaken && !['none', 'warning_sent', 'content_removed', 'user_suspended', 'user_banned', 'other'].includes(actionTaken)) {
      return res.status(400).json({ success: false, message: 'Invalid action taken' });
    }
    
    const updateData = { status };
    
    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes;
    }
    
    if (actionTaken !== undefined) {
      updateData.actionTaken = actionTaken;
    }
    
    if (status === 'resolved' || status === 'dismissed') {
      updateData.resolvedBy = req.admin.id;
      updateData.resolvedAt = new Date();
    }
    
    const report = await AbuseReport.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('reporterId', 'username')
     .populate('reportedUserId', 'username');
    
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    await logAdminAction(
      req.admin.id, 
      'admin_updated_abuse_report', 
      { reportId: req.params.id, status, actionTaken }, 
      report.reportedUserId, 
      null, 
      req
    );
    
    res.json({ success: true, report });
  } catch (error) {
    console.error('[AdminAbuse] updateAbuseReportStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};

// Delete an abuse report
exports.deleteAbuseReport = async (req, res) => {
  try {
    const report = await AbuseReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    
    await report.deleteOne();
    
    await logAdminAction(
      req.admin.id, 
      'admin_deleted_abuse_report', 
      { reportId: req.params.id }, 
      report.reportedUserId, 
      null, 
      req
    );
    
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    console.error('[AdminAbuse] deleteAbuseReport error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
};

// Get abuse report statistics
exports.getAbuseReportStats = async (req, res) => {
  try {
    const [
      totalReports,
      pendingReports,
      underReviewReports,
      resolvedReports,
      dismissedReports,
      reportsByCategory,
      reportsByPriority,
      reportsByContentType,
      recentReports
    ] = await Promise.all([
      AbuseReport.countDocuments(),
      AbuseReport.countDocuments({ status: 'pending' }),
      AbuseReport.countDocuments({ status: 'under_review' }),
      AbuseReport.countDocuments({ status: 'resolved' }),
      AbuseReport.countDocuments({ status: 'dismissed' }),
      AbuseReport.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AbuseReport.aggregate([
        { $group: { _id: '$priority', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AbuseReport.aggregate([
        { $group: { _id: '$contentType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AbuseReport.find()
        .populate('reporterId', 'username')
        .populate('reportedUserId', 'username')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);
    
    res.json({
      success: true,
      stats: {
        total: totalReports,
        pending: pendingReports,
        underReview: underReviewReports,
        resolved: resolvedReports,
        dismissed: dismissedReports,
        byCategory: Object.fromEntries(reportsByCategory.map(r => [r._id, r.count])),
        byPriority: Object.fromEntries(reportsByPriority.map(r => [r._id, r.count])),
        byContentType: Object.fromEntries(reportsByContentType.map(r => [r._id, r.count]))
      },
      recentReports
    });
  } catch (error) {
    console.error('[AdminAbuse] getAbuseReportStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load statistics' });
  }
};
