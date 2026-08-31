const mongoose = require('mongoose');

const updateSchema = new mongoose.Schema({
  version: { type: String, required: true, unique: true },
  versionCode: { type: Number, required: true },
  changelog: { type: String, required: true },
  downloadUrl: { type: String, required: true },
  bundleUrl: { type: String },
  mandatory: { type: Boolean, default: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

updateSchema.index({ versionCode: -1 });

module.exports = mongoose.model('Update', updateSchema);
