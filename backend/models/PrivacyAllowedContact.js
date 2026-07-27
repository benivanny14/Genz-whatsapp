const mongoose = require('mongoose');

const privacyAllowedContactSchema = new mongoose.Schema({
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  privacyType: {
    type: String,
    required: true,
    enum: ['status'], // Only Share With is primarily for Status
    index: true
  },
  allowedContactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  allowedContactName: {
    type: String,
    required: true
  },
  allowedContactPhone: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  syncVersion: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
privacyAllowedContactSchema.index({ ownerUserId: 1, privacyType: 1 });
privacyAllowedContactSchema.index({ ownerUserId: 1, allowedContactId: 1 });

// Update sync version on save
privacyAllowedContactSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.syncVersion += 1;
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('PrivacyAllowedContact', privacyAllowedContactSchema);
