const mongoose = require('mongoose');

// WINGA — buyer rating + review for a marketplace listing.
const reviewSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userId: { type: String, required: true },
    username: { type: String, default: '' },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '', maxlength: 1000 },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

// One review per user per listing.
reviewSchema.index({ listing: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
