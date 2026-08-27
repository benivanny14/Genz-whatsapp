const mongoose = require('mongoose');

const storyHighlightSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  color: {
    type: String,
    default: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'
  },
  coverUrl: {
    type: String,
    default: ''
  },
  statuses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Status'
  }]
}, { timestamps: true });

module.exports = mongoose.model('StoryHighlight', storyHighlightSchema);
