const CallLog = require('../models/CallLog');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (val, def, min, max) => {
  const n = parseInt(val, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
};

exports.listCalls = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const filter = {};
    if (req.query.callType) filter.callType = req.query.callType;
    if (req.query.status) filter.status = req.query.status;

    const [total, calls] = await Promise.all([
      CallLog.countDocuments(filter),
      CallLog.find(filter)
        .populate('callerId', 'username phoneNumber')
        .populate('calleeId', 'username phoneNumber')
        .sort({ startedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);
    res.json({ success: true, calls, pagination: { page, limit, total, pages: Math.ceil(total / limit) || 1 } });
  } catch (error) {
    console.error('[AdminCalls] listCalls error:', error);
    res.status(500).json({ success: false, message: 'Failed to load calls' });
  }
};

exports.getCallStats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [totals, byType, byStatus, avgDuration] = await Promise.all([
      CallLog.countDocuments({}),
      CallLog.aggregate([{ $group: { _id: '$callType', count: { $sum: 1 } } }]),
      CallLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      CallLog.aggregate([
        { $match: { status: 'completed', startedAt: { $gte: since } } },
        { $group: { _id: null, avg: { $avg: '$duration' } } }
      ])
    ]);
    res.json({
      success: true,
      stats: {
        totalCalls: totals,
        byType: Object.fromEntries(byType.map((b) => [b._id, b.count])),
        byStatus: Object.fromEntries(byStatus.map((b) => [b._id, b.count])),
        avgDurationSeconds: Math.round(avgDuration[0]?.avg || 0)
      }
    });
  } catch (error) {
    console.error('[AdminCalls] getCallStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to load call stats' });
  }
};

exports.deleteCallLog = async (req, res) => {
  try {
    const call = await CallLog.findById(req.params.id);
    if (!call) return res.status(404).json({ success: false, message: 'Call log not found' });
    await call.deleteOne();
    await logAdminAction(req.admin.id, 'admin_deleted_call_log', { callId: req.params.id }, null, null, req);
    res.json({ success: true, message: 'Call log deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete call log' });
  }
};
