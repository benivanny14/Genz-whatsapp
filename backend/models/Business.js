const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' }
  },
  { _id: false }
);

const viewSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    viewedAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

// WINGA — marketplace listing (jiji.com style). Users post their businesses
// here instead of Status; buyers browse by category and chat with the seller.
const businessSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userId: { type: String, required: true },
  username: { type: String, default: '' },
  sellerPhone: { type: String, default: '' },
  category: {
    type: String,
    enum: [
      'nguo',
      'home-accessories',
      'simu',
      'speakers',
      'laptop',
      'viwanja',
      'dalari',
      'viatu',
      'sandals',
      'tv',
      'furniture',
      'other'
    ],
    required: true
  },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 2000 },
  price: { type: Number, default: 0 },
  priceText: { type: String, default: '' },
  location: { type: String, default: '' },
  media: { type: [mediaSchema], default: [] },
  views: { type: [viewSchema], default: [] },
  viewsCount: { type: Number, default: 0 },
  isSold: { type: Boolean, default: false },
  soldAt: { type: Date },
  // jiji.com-style lifetime: listings auto-expire after 30 days.
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  },
  createdAt: { type: Date, default: Date.now }
});

// Efficient queries: list per category, my listings, daily limit count
businessSchema.index({ category: 1, createdAt: -1 });
businessSchema.index({ userId: 1, createdAt: -1 });
// Auto-delete expired listings (runs every ~60s; the feed also filters them).
businessSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

businessSchema.pre('save', function syncUserId(next) {
  if (this.user && !this.userId) {
    this.userId = String(this.user);
  }
  next();
});

module.exports = mongoose.model('Business', businessSchema);
