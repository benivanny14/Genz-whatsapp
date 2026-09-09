const Business = require('../models/Business');
const { logAdminAction } = require('../utils/auditLogger');

const clampInt = (v, d, min, max) => {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return d;
  return Math.min(max, Math.max(min, n));
};

exports.listWingaListings = async (req, res) => {
  try {
    const page = clampInt(req.query.page, 1, 1, 10000);
    const limit = clampInt(req.query.limit, 30, 1, 100);
    const search = String(req.query.search || '').trim();
    const filter = {};
    if (search) filter.$or = [{ title: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }, { description: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') }];
    const [total, listings] = await Promise.all([
      Business.countDocuments(filter),
      Business.find(filter).populate('userId', 'username phoneNumber').sort({ createdAt: -1 }).skip((page-1)*limit).limit(limit).lean()
    ]);
    res.json({ success: true, listings, pagination: { page, limit, total, pages: Math.ceil(total/limit)||1 } });
  } catch (e) { console.error('[AdminWinga] list', e); res.status(500).json({ success:false, message:'Failed to load winga' }); }
};

exports.deleteWingaListing = async (req, res) => {
  try {
    const listing = await Business.findById(req.params.id);
    if (!listing) return res.status(404).json({ success:false, message:'Listing not found' });
    await listing.deleteOne();
    await logAdminAction(req.admin.id, 'admin_deleted_winga', { listingId: req.params.id }, null, null, req);
    try { const io=req.app.get('io'); if(io) io.emit('winga:deleted', { listingId: String(req.params.id) }); } catch {}
    res.json({ success:true, message:'Listing deleted' });
  } catch (e) { res.status(500).json({ success:false, message:'Failed to delete' }); }
};
