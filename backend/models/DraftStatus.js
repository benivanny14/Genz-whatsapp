const mongoose = require('mongoose');

const draftStatusSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video'],
    default: 'text'
  },
  content: {
    type: String,
    default: ''
  },
  caption: {
    type: String,
    default: ''
  },
  textStatus: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  music: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  privacy: {
    type: String,
    default: 'contacts'
  },
  excludedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  includedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

module.exports = mongoose.model('DraftStatus', draftStatusSchema);
