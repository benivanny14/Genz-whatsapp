const mongoose = require('mongoose');

const statusTemplateSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    maxlength: 50
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'mixed'],
    default: 'text'
  },
  // Text status template
  textConfig: {
    backgroundColor: { type: String, default: '#128C7E' },
    fontColor: { type: String, default: '#FFFFFF' },
    fontStyle: { type: String, default: 'normal' },
    fontSize: { type: Number, default: 24 },
    textAlign: { type: String, default: 'center' },
    text: { type: String, default: '' }
  },
  // Media template config
  mediaConfig: {
    filter: { type: String, default: 'none' },
    brightness: { type: Number, default: 100 },
    contrast: { type: Number, default: 100 },
    saturation: { type: Number, default: 100 },
    blur: { type: Number, default: 0 }
  },
  // Stickers/overlays
  stickers: [{
    id: { type: String },
    url: { type: String },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    scale: { type: Number, default: 1 },
    rotation: { type: Number, default: 0 }
  }],
  // Drawing paths
  drawings: [{
    color: { type: String, default: '#FFFFFF' },
    width: { type: Number, default: 3 },
    points: [{ x: Number, y: Number }]
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  usageCount: {
    type: Number,
    default: 0
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

statusTemplateSchema.index({ userId: 1, createdAt: -1 });
statusTemplateSchema.index({ isPublic: 1, usageCount: -1 });
statusTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('StatusTemplate', statusTemplateSchema);
