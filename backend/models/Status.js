const mongoose = require('mongoose');

const statusSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio'],
    default: 'text'
  },
  content: {
    type: String,
    required: true
  },
  mediaUrl: {
    type: String,
    default: ''
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'text', 'audio'],
    default: 'image'
  },
  caption: {
    type: String,
    default: ''
  },
  backgroundColor: {
    type: String,
    default: '#00a884'
  },
  textColor: {
    type: String,
    default: '#ffffff'
  },
  font: {
    type: String,
    default: 'sans-serif'
  },
  privacy: {
    type: String,
    enum: ['contacts', 'everyone', 'only_me'],
    default: 'contacts'
  },
  likes: [{
    type: String
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  saves: [{
    type: String
  }],
  savesCount: {
    type: Number,
    default: 0
  },
  shares: [{
    type: String
  }],
  sharesCount: {
    type: Number,
    default: 0
  },
  reshares: [{
    userId: String,
    username: String,
    originalStatusId: String,
    resharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replies: [{
    userId: String,
    username: String,
    content: String,
    type: {
      type: String,
      enum: ['text', 'voice', 'emoji'],
      default: 'text'
    },
    mediaUrl: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: [{
    user: {
      type: String
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  viewsCount: {
    type: Number,
    default: 0
  },
  collabUserId: {
    type: String,
    default: ''
  },
  collabUsername: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Status', statusSchema);
