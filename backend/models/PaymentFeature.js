const mongoose = require('mongoose');

const PaymentFeatureSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Jina la feature lazima lipatikane'],
      trim: true,
      maxlength: [100, 'Jina linaweza kuwa hadi 100 alama'],
    },
    description: {
      type: String,
      required: [true, 'Maelezo ya feature lazima yapatikane'],
      maxlength: [500, 'Maelezo yanaweza kuwa hadi 500 alama'],
    },
    price: {
      type: Number,
      required: [true, 'Bei lazima ipatikane'],
      min: [0, 'Bei haiwezi kuwa chini ya 0'],
    },
    location: {
      type: String,
      required: [true, 'Sehemu lazima ipatikane'],
      trim: true,
      maxlength: [200, 'Sehemu inaweza kuwa hadi 200 alama'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [50, 'Kategoria inaweza kuwa hadi 50 alama'],
      default: 'undefined',
    },
    images: [{
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
      alt: {
        type: String,
        default: '',
      },
    }],
    videos: [{
      url: {
        type: String,
        required: true,
      },
      publicId: {
        type: String,
        required: true,
      },
      title: {
        type: String,
        default: '',
      },
    }],
    maxPrice: {
      type: Number,
      required: true,
      min: [0, 'Maximum bei haiwezi kuwa chini ya 0'],
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'pending', 'featured'],
      default: 'pending',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvalDate: {
      type: Date,
    },
    views: {
      type: Number,
      default: 0,
    },
    inquiries: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    contactInfo: {
      phone: {
        type: String,
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
      },
    },
    tags: [{
      type: String,
      trim: true,
    }],
    specifications: {
      type: mongoose.Schema.Types.Mixed,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
PaymentFeatureSchema.index({ status: 1 });
PaymentFeatureSchema.index({ createdBy: 1 });
PaymentFeatureSchema.index({ featured: 1, createdAt: -1 });
PaymentFeatureSchema.index({ location: 'text', name: 'text', description: 'text' });
PaymentFeatureSchema.index({ 'contactInfo.email': 1 });

// Virtual for price range display
PaymentFeatureSchema.virtual('priceRange').get(function() {
  return `ZAR ${this.price.toLocaleString()} - ZAR ${this.maxPrice.toLocaleString()}`;
});

// Virtual for formatted location
PaymentFeatureSchema.virtual('formattedLocation').get(function() {
  return this.location.split(',')[0] || this.location;
});

// Virtual for image URLs
PaymentFeatureSchema.virtual('primaryImage').get(function() {
  return this.images && this.images.length > 0 ? this.images[0].url : null;
});

// Virtual for main video
PaymentFeatureSchema.virtual('mainVideo').get(function() {
  return this.videos && this.videos.length > 0 ? this.videos[0].url : null;
});

// Instance method to increment views
PaymentFeatureSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

// Instance method to increment inquiries
PaymentFeatureSchema.methods.incrementInquiry = function() {
  this.inquiries += 1;
  return this.save();
};

// Static method to get featured items
PaymentFeatureSchema.statics.getFeaturedItems = function(limit = 10) {
  return this.find({ featured: true, status: 'active' })
    .populate('createdBy', 'username profilePicture')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// Static method to search items
PaymentFeatureSchema.statics.searchItems = function(query, filters = {}) {
  const searchCriteria = { status: 'active' };
  
  if (query) {
    searchCriteria.$or = [
      { name: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { location: { $regex: query, $options: 'i' } },
      { 'contactInfo.email': { $regex: query, $options: 'i' } },
    ];
  }
  
  if (filters.category) {
    searchCriteria.category = filters.category;
  }
  
  if (filters.location) {
    searchCriteria.location = { $regex: filters.location, $options: 'i' };
  }
  
  if (filters.maxPrice) {
    searchCriteria.maxPrice = { $lte: filters.maxPrice };
  }
  
  if (filters.minPrice) {
    searchCriteria.price = { $gte: filters.minPrice };
  }
  
  if (filters.featured) {
    searchCriteria.featured = true;
  }
  
  return this.find(searchCriteria)
    .populate('createdBy', 'username profilePicture')
    .sort({ featured: -1, createdAt: -1 });
};

module.exports = mongoose.model('PaymentFeature', PaymentFeatureSchema);
