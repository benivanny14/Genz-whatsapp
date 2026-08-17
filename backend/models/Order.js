const mongoose = require('mongoose');

// WINGA — a buyer's order/booking request on a marketplace listing.
// The seller confirms or declines; the buyer can cancel while pending.
const orderSchema = new mongoose.Schema(
  {
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    listingTitle: { type: String, default: '' },
    listingPrice: { type: Number, default: 0 },
    listingPriceText: { type: String, default: '' },
    listingImage: { type: String, default: '' },
    category: { type: String, default: '' },

    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    buyerId: { type: String, required: true },
    buyerUsername: { type: String, default: '' },

    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerId: { type: String, required: true },
    sellerUsername: { type: String, default: '' },

    quantity: { type: Number, default: 1, min: 1, max: 100 },
    message: { type: String, default: '', maxlength: 1000 },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'completed', 'declined', 'cancelled'],
      default: 'pending'
    },
    completedAt: { type: Date },
    statusNote: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

// Fast lookups: orders for a listing (sold badge), per-user inbox.
orderSchema.index({ sellerId: 1, status: 1, createdAt: -1 });
orderSchema.index({ buyerId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
