const mongoose = require('mongoose');

const statusHighlightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 50
  },
  coverStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  },
  statusIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  }],
  color: {
    type: String,
    default: '#00a884'
  },
  icon: {
    type: String,
    default: ''
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

statusHighlightSchema.index({ userId: 1, createdAt: -1 });
statusHighlightSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('StatusHighlight', statusHighlightSchema);
