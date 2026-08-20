const Business = require('../models/Business');
const Review = require('../models/Review');
const Order = require('../models/Order');
const mongoose = require('mongoose');
const { isEitherUserBlocked } = require('../utils/messageSendHelpers');

// ── WINGA categories ─────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'nguo', label: 'Nguo (Clothes)' },
  { id: 'home-accessories', label: 'Home Accessories' },
  { id: 'simu', label: 'Simu (Phones)' },
  { id: 'speakers', label: 'Speakers' },
  { id: 'laptop', label: 'Laptop' },
  { id: 'viwanja', label: 'Viwanja (Land)' },
  { id: 'dalari', label: 'Dalari (Currency)' },
  { id: 'viatu', label: 'Viatu (Shoes)' },
  { id: 'sandals', label: 'Sandals' },
  { id: 'tv', label: 'TV' },
  { id: 'furniture', label: 'Furniture' },
  { id: 'other', label: 'Nyingine (Other)' }
];

const DAILY_LIMIT = 15;

const getCurrentUserId = (req) => {
  const id = req.user?._id || req.user?.id;
  return id ? String(id) : '';
};

// Strip sensitive arrays before sending a listing to clients.
const toPublicListing = (listing, viewerId) => {
  const l = listing.toObject ? listing.toObject() : listing;
  const userObj = l.user && typeof l.user === 'object' ? l.user : {};
  const viewedByMe = Boolean(viewerId) && (l.views || []).some((v) => String(v.user) === String(viewerId));
  delete l.views;
  delete l.user;
  l.user = {
    _id: String(userObj._id || l.userId || ''),
    username: userObj.username || l.username || 'Unknown',
    profilePicture: userObj.profilePicture || '',
    phoneNumber: userObj.phoneNumber || l.sellerPhone || ''
  };
  l.viewedByMe = viewedByMe;
  l.ratingSummary = l.ratingSummary || { avg: 0, count: 0 };
  return l;
};

// Attach the aggregate star rating to a set of listings (one query).
const attachRatings = async (listings) => {
  const ids = listings.map((l) => l._id);
  if (ids.length === 0) return listings;
  const rows = await Review.aggregate([
    { $match: { listing: { $in: ids } } },
    { $group: { _id: '$listing', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const byId = new Map(rows.map((r) => [String(r._id), { avg: Math.round(r.avg * 10) / 10, count: r.count }]));
  return listings.map((l) => {
    l.ratingSummary = byId.get(String(l._id)) || { avg: 0, count: 0 };
    return l;
  });
};

// POST /api/winga — create a listing (max 15 per 24h)
exports.createBusiness = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { category, title, description, price, priceText, location, media } = req.body;

    const { containsProfanity } = require('../utils/contentFilter');
    if (containsProfanity(`${title || ''} ${description || ''}`)) {
      return res.status(400).json({ success: false, message: 'Listing contains disallowed words. Please change it.' });
    }

    if (!category) return res.status(400).json({ success: false, message: 'Category is required' });
    if (!CATEGORIES.some((c) => c.id === category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }
    const mediaArr = Array.isArray(media) ? media.filter((m) => m && m.url) : [];
    if (mediaArr.length === 0) {
      return res.status(400).json({ success: false, message: 'Add at least one photo or video' });
    }
    if (mediaArr.length > 10) {
      return res.status(400).json({ success: false, message: 'Maximum 10 photos/videos per listing' });
    }

    // ── Daily limit: max 15 listings per 24h ──
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const postedCount = await Business.countDocuments({ userId, createdAt: { $gte: since } });
    if (postedCount >= DAILY_LIMIT) {
      const resetAt = new Date(since.getTime() + 24 * 60 * 60 * 1000);
      return res.status(429).json({
        success: false,
        message: `Daily listing limit of ${DAILY_LIMIT} reached. Try again after 24 hours.`,
        code: 'DAILY_LIMIT_REACHED',
        limit: DAILY_LIMIT,
        postedToday: postedCount,
        resetAt: resetAt.toISOString()
      });
    }

    const user = req.user || {};
    const listing = await Business.create({
      user: userId,
      userId,
      username: user.username || user.name || 'GENZ User',
      sellerPhone: user.phoneNumber || '',
      category,
      title: String(title).trim(),
      description: String(description || '').trim(),
      price: Number.isFinite(Number(price)) ? Number(price) : 0,
      priceText: String(priceText || '').trim(),
      location: String(location || '').trim(),
      media: mediaArr.map((m) => ({ url: m.url, type: m.type === 'video' ? 'video' : 'image' }))
    });

    const populated = await Business.findById(listing._id).populate('user', 'username profilePicture phoneNumber');

    // Notify everyone — the marketplace is public (jiji.com style).
    const io = req.app.get('io');
    if (io) {
      io.emit('winga:created', toPublicListing(populated, ''));
    }

    res.status(201).json({ success: true, listing: toPublicListing(populated, userId), postedToday: postedCount + 1, limit: DAILY_LIMIT });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/winga — all listings grouped by category with unseen counts
exports.getBusinesses = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);

    const listings = await Business.find({ expiresAt: { $gt: new Date() } })
      .populate('user', 'username profilePicture phoneNumber')
      .sort({ createdAt: -1 });

    // Privacy: skip listings from users who are blocked (either direction).
    const visible = [];
    for (const l of listings) {
      const ownerId = String(l.userId || l.user?._id || '');
      if (!ownerId) continue;
      if (ownerId !== userId && (await isEitherUserBlocked(userId, ownerId))) continue;
      visible.push(l);
    }

    const categories = CATEGORIES.map((c) => {
      const catListings = visible.filter((l) => l.category === c.id);
      const unseen = catListings.filter((l) => {
        if (String(l.userId) === userId) return false;
        return !(l.views || []).some((v) => String(v.user) === userId);
      }).length;
      return {
        id: c.id,
        label: c.label,
        count: catListings.length,
        unseen,
        listings: catListings.map((l) => toPublicListing(l, userId))
      };
    });

    const myListings = visible
      .filter((l) => String(l.userId) === userId)
      .map((l) => toPublicListing(l, userId));

    // Aggregate star ratings for every visible listing in one query.
    await attachRatings(visible);
    for (const cat of categories) {
      for (const l of cat.listings) l.ratingSummary = visible.find((v) => String(v._id) === String(l._id))?.ratingSummary || { avg: 0, count: 0 };
    }
    for (const l of myListings) l.ratingSummary = visible.find((v) => String(v._id) === String(l._id))?.ratingSummary || { avg: 0, count: 0 };

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const postedToday = await Business.countDocuments({ userId, createdAt: { $gte: since } });

    res.json({
      success: true,
      categories,
      totalUnseen: categories.reduce((sum, c) => sum + c.unseen, 0),
      myListings,
      postedToday,
      limit: DAILY_LIMIT
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/winga/:id/view — mark a listing as seen by the current user
exports.viewBusiness = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(200).json({ success: true, message: 'Invalid ID' });
    }

    const listing = await Business.findById(id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });

    if (String(listing.userId) !== userId) {
      const already = (listing.views || []).some((v) => String(v.user) === userId);
      if (!already) {
        listing.views.push({ user: userId, viewedAt: new Date() });
        listing.viewsCount = listing.views.length;
        await listing.save();
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/winga/upload — upload photo/video for a listing
exports.uploadBusinessMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    // Prefer a cloudinary-style location; otherwise build a servable URL path
    // (multer's req.file.path is an absolute filesystem path, which the
    // browser cannot load).
    const mediaUrl = req.file.location || `/uploads/winga/${req.file.filename}`;
    const type = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    res.json({ success: true, fileUrl: mediaUrl, mediaType: type });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/winga/:id/rate — buyer rates a listing (1–5 stars) + optional comment
exports.rateBusiness = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { id } = req.params;
    const rating = Math.round(Number(req.body.rating));
    const comment = String(req.body.comment || '').trim().slice(0, 1000);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID' });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5 stars' });
    }

    const listing = await Business.findById(id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (String(listing.userId) === userId) {
      return res.status(400).json({ success: false, message: 'You cannot rate your own listing' });
    }

    const user = req.user || {};
    await Review.findOneAndUpdate(
      { listing: listing._id, user: userId },
      { userId, username: user.username || user.name || 'GENZ User', rating, comment },
      { upsert: true, new: true }
    );

    const rows = await Review.aggregate([
      { $match: { listing: listing._id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const summary = rows[0]
      ? { avg: Math.round(rows[0].avg * 10) / 10, count: rows[0].count }
      : { avg: 0, count: 0 };

    res.json({ success: true, ratingSummary: summary, myRating: rating });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(200).json({ success: true, message: 'Rating updated' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/winga/:id/reviews — all reviews for a listing (newest first)
exports.getReviews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID' });
    }
    const reviews = await Review.find({ listing: id })
      .sort({ createdAt: -1 })
      .limit(100);
    const myUserId = getCurrentUserId(req);
    res.json({
      success: true,
      reviews: reviews.map((r) => ({
        _id: r._id,
        userId: r.userId,
        username: r.username || 'GENZ User',
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        mine: String(r.userId) === myUserId
      }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/winga/:id/order — buyer places an order/booking request on a listing
exports.placeOrder = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { id } = req.params;
    const quantity = Math.max(1, Math.min(100, Math.round(Number(req.body.quantity) || 1)));
    const message = String(req.body.message || '').trim().slice(0, 1000);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID' });
    }

    const listing = await Business.findById(id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (String(listing.userId) === userId) {
      return res.status(400).json({ success: false, message: 'You cannot purchase your own listing' });
    }
    if (listing.isSold) {
      return res.status(400).json({ success: false, message: 'This listing is already sold' });
    }

    const user = req.user || {};
    const order = await Order.create({
      listing: listing._id,
      listingTitle: listing.title,
      listingPrice: listing.price || 0,
      listingPriceText: listing.priceText || '',
      listingImage: listing.media?.[0]?.url || '',
      category: listing.category,
      buyer: userId,
      buyerId: userId,
      buyerUsername: user.username || user.name || 'GENZ User',
      seller: listing.user || listing.userId,
      sellerId: String(listing.userId || listing.user?._id || ''),
      sellerUsername: listing.username || 'GENZ User',
      quantity,
      message,
      status: 'pending'
    });

    const io = req.app.get('io');
    if (io) {
      const payload = order.toObject ? order.toObject() : order;
      io.emit('winga:order', payload);
    }

    res.status(201).json({ success: true, order: order.toObject ? order.toObject() : order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/winga/orders — orders where I am buyer or seller (newest first)
exports.getMyOrders = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const orders = await Order.find({
      $or: [{ buyerId: userId }, { sellerId: userId }]
    }).sort({ createdAt: -1 }).limit(200);
    res.json({
      success: true,
      orders: orders.map((o) => {
        const obj = o.toObject ? o.toObject() : o;
        obj.isBuyer = String(obj.buyerId) === userId;
        obj.isSeller = String(obj.sellerId) === userId;
        return obj;
      })
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/winga/orders/:orderId/status — seller confirms/declines, buyer cancels
exports.updateOrderStatus = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { orderId } = req.params;
    const { status } = req.body;
    const valid = ['pending', 'confirmed', 'completed', 'declined', 'cancelled'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isBuyer = String(order.buyerId) === userId;
    const isSeller = String(order.sellerId) === userId;
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ success: false, message: 'Not your order' });
    }

    if (status === 'confirmed' || status === 'declined') {
      if (!isSeller) return res.status(403).json({ success: false, message: 'Only the seller can confirm or decline' });
    }
    if (status === 'completed') {
      if (!isBuyer) return res.status(403).json({ success: false, message: 'Only the buyer can mark an order as received' });
      if (order.status !== 'confirmed') {
        return res.status(400).json({ success: false, message: 'Order must be confirmed before it can be completed' });
      }
    }
    if (status === 'cancelled') {
      if (!isBuyer) return res.status(403).json({ success: false, message: 'Only the buyer can cancel' });
    }

    order.status = status;
    if (status === 'completed') order.completedAt = new Date();
    if (status === 'pending') order.completedAt = null;
    await order.save();

    // Confirming an order marks the listing sold (jiji.com style).
    if (status === 'confirmed') {
      const listing = await Business.findById(order.listing);
      if (listing && !listing.isSold) {
        listing.isSold = true;
        listing.soldAt = new Date();
        await listing.save();
      }
    }

    const io = req.app.get('io');
    if (io) {
      const payload = order.toObject ? order.toObject() : order;
      payload.isBuyer = isBuyer;
      payload.isSeller = isSeller;
      io.emit('winga:order-updated', payload);
    }

    res.json({ success: true, order: order.toObject ? order.toObject() : order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/winga/stats — seller analytics: views, ratings, orders per listing
exports.getWingaStats = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const listings = await Business.find({
      userId,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    const ids = listings.map((l) => l._id);
    let orderRows = [];
    let reviewRows = [];
    if (ids.length > 0) {
      orderRows = await Order.aggregate([
        { $match: { listing: { $in: ids } } },
        {
          $group: {
            _id: '$listing',
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
            confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            declined: { $sum: { $cond: [{ $eq: ['$status', 'declined'] }, 1, 0] } },
            cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } }
          }
        }
      ]);
      reviewRows = await Review.aggregate([
        { $match: { listing: { $in: ids } } },
        { $group: { _id: '$listing', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]);
    }

    const orderByListing = new Map(orderRows.map((r) => [String(r._id), r]));
    const reviewByListing = new Map(reviewRows.map((r) => [String(r._id), r]));

    const rows = listings.map((l) => {
      const o = orderByListing.get(String(l._id)) || { total: 0, pending: 0, confirmed: 0, completed: 0, declined: 0, cancelled: 0 };
      const r = reviewByListing.get(String(l._id)) || { avg: 0, count: 0 };
      return {
        listing: toPublicListing(l, userId),
        viewsCount: l.viewsCount || l.views?.length || 0,
        orders: { total: o.total, pending: o.pending, confirmed: o.confirmed, completed: o.completed, declined: o.declined, cancelled: o.cancelled },
        ratingSummary: { avg: Math.round(r.avg * 10) / 10, count: r.count }
      };
    });

    res.json({
      success: true,
      stats: rows,
      totals: {
        listings: rows.length,
        views: rows.reduce((s, r) => s + r.viewsCount, 0),
        orders: rows.reduce((s, r) => s + r.orders.total, 0),
        pendingOrders: rows.reduce((s, r) => s + r.orders.pending, 0),
        avgRating: (() => {
          const rated = rows.filter((r) => r.ratingSummary.count > 0);
          if (!rated.length) return 0;
          return Math.round((rated.reduce((s, r) => s + r.ratingSummary.avg * r.ratingSummary.count, 0) / rated.reduce((s, r) => s + r.ratingSummary.count, 0)) * 10) / 10;
        })()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/winga/:id/sold — owner marks the listing as sold (or re-lists it)
exports.toggleSold = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID' });
    }
    const listing = await Business.findById(id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (String(listing.userId) !== userId) {
      return res.status(403).json({ success: false, message: 'You can only update your own listings' });
    }
    listing.isSold = !listing.isSold;
    listing.soldAt = listing.isSold ? new Date() : null;
    await listing.save();
    res.json({ success: true, listing: toPublicListing(listing, userId) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/winga/:id — owner removes a listing
exports.deleteBusiness = async (req, res) => {
  try {
    const userId = getCurrentUserId(req);
    const { id } = req.params;
    const listing = await Business.findById(id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    if (String(listing.userId) !== userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own listings' });
    }
    await listing.deleteOne();
    res.json({ success: true, message: 'Listing deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.CATEGORIES = CATEGORIES;
exports.DAILY_LIMIT = DAILY_LIMIT;
exports.attachRatings = attachRatings;
