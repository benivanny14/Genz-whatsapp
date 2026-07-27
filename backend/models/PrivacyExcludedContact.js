const mongoose = require('mongoose');

const privacyExcludedContactSchema = new mongoose.Schema({
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  privacyType: {
    type: String,
    required: true,
    enum: ['last_seen', 'profile_photo', 'about', 'status', 'groups', 'calls'],
    index: true
  },
  excludedContactId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  excludedContactName: {
    type: String,
    required: true
  },
  excludedContactPhone: {
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
privacyExcludedContactSchema.index({ ownerUserId: 1, privacyType: 1 });
privacyExcludedContactSchema.index({ ownerUserId: 1, excludedContactId: 1 });

// Update sync version on save
privacyExcludedContactSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.syncVersion += 1;
    this.updatedAt = Date.now();
  }
  next();
});

module.exports = mongoose.model('PrivacyExcludedContact', privacyExcludedContactSchema);
