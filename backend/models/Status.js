const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const viewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  viewedAt: { type: Date, default: Date.now }
});

const replySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  content: { type: String, required: true },
  type: { type: String, default: 'text' },
  mediaUrl: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const collaboratorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  userId: { type: String, default: '' },
  username: { type: String, default: '' },
  role: { type: String, enum: ['viewer', 'editor'], default: 'viewer' },
  joinedAt: { type: Date, default: Date.now }
});

const statusSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  userId: { type: String },
  username: { type: String },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'voice', 'audio', 'gif', 'link', 'music', 'quiz', 'question', 'countdown', 'location', 'collage', 'boomerang', 'livePhoto', 'dualCamera', 'timer'],
    required: true
  },
  content: { type: String, default: '' },
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, default: '' },
  duration: { type: Number, default: 0 },
  caption: { type: String, default: '' },
  backgroundColor: { type: String, default: '#075E54' },
  textColor: { type: String, default: '#ffffff' },
  fontStyle: { type: String, default: 'sans' },
  font: { type: String, default: 'sans-serif' },
  privacy: { type: String, default: 'contacts' },
  // FEATURE ADD: "hide status from..." (My Contacts Except...) and "share
  // only with..." need to remember exactly which people were picked, not
  // just a privacy mode string.
  excludedViewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  includedViewers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  collabUserId: { type: String, default: '' },
  collabUsername: { type: String, default: '' },
  collaborators: [collaboratorSchema],
  collabMode: { type: String, default: 'view' },
  allowComments: { type: Boolean, default: true },
  allowEdits: { type: Boolean, default: false },
  expiryDate: { type: String, default: '' },
  maxCollaborators: { type: Number, default: 10 },
  storyId: { type: String, default: '' },
  isContribution: { type: Boolean, default: false },
  viewsCount: { type: Number, default: 0 },
  views: [viewSchema],
  reactions: [reactionSchema],
  replies: [replySchema],
  clientStatusId: { type: String },
  
  // New status type fields
  linkUrl: { type: String, default: '' },
  quizQuestion: { type: String, default: '' },
  quizOptions: [{ type: String }],
  quizCorrectAnswer: { type: Number, default: 0 },
  questionText: { type: String, default: '' },
  countdownDate: { type: String, default: '' },
  countdownTime: { type: String, default: '' },
  locationData: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String },
    placeName: { type: String }
  },
  collageImages: [{ type: String }],
  timerSeconds: { type: Number, default: 5 },
  // Editor data (text effects, stickers, subtitles, audio) attached at creation
  textEffects: { type: mongoose.Schema.Types.Mixed, default: null },
  sticker: { type: mongoose.Schema.Types.Mixed, default: null },
  subtitles: { type: mongoose.Schema.Types.Mixed, default: null },
  audio: { type: mongoose.Schema.Types.Mixed, default: null },
  
  // Advanced status features
  voiceEffects: {
    effect: { type: String, default: 'none' },
    pitch: { type: Number, default: 1 },
    speed: { type: Number, default: 1 },
    echo: { type: Boolean, default: false }
  },
  isCollaborative: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  reminder: {
    enabled: { type: Boolean, default: false },
    time: { type: Date },
    note: { type: String }
  },
  poll: {
    question: { type: String },
    options: [{
      id: { type: Number },
      text: { type: String },
      votes: { type: Number, default: 0 }
    }],
    allowMultiple: { type: Boolean, default: false },
    expiresAt: { type: Date },
    totalVotes: { type: Number, default: 0 },
    voters: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      optionIds: [Number],
      votedAt: { type: Date }
    }]
  },
  scheduledFor: { type: Date },
  isScheduled: { type: Boolean, default: false },
  isRestored: { type: Boolean, default: false },
  restoredAt: { type: Date },
  mentions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String },
    mentionedAt: { type: Date }
  }],
  hashtags: [{ type: String }],
  editedAt: { type: Date },
  isDuplicate: { type: Boolean, default: false },
  originalStatusId: { type: mongoose.Schema.Types.ObjectId },
  duplicatedAt: { type: Date },
  isPinned: { type: Boolean, default: false },
  pinnedAt: { type: Date },
  reports: [{
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String },
    description: { type: String },
    reportedAt: { type: Date }
  }],
  isTemplate: { type: Boolean, default: false },
  templateName: { type: String },
  isDraft: { type: Boolean, default: false },
  draftSavedAt: { type: Date },
  likes: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    likedAt: { type: Date }
  }],
  likesCount: { type: Number, default: 0 },
  saves: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    savedAt: { type: Date }
  }],
  savesCount: { type: Number, default: 0 },
  reshares: [{
    userId: { type: String },
    username: { type: String },
    originalStatusId: { type: mongoose.Schema.Types.ObjectId },
    resharedAt: { type: Date }
  }],
  favoritedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    favoritedAt: { type: Date }
  }],
  shares: [{
    sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    platform: { type: String },
    message: { type: String },
    sharedAt: { type: Date }
  }],
  shareCount: { type: Number, default: 0 },
  downloads: [{
    downloadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    quality: { type: String },
    format: { type: String },
    downloadedAt: { type: Date }
  }],
  forwards: [{
    forwardedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    contacts: [{ type: mongoose.Schema.Types.ObjectId }],
    groups: [{ type: mongoose.Schema.Types.ObjectId }],
    message: { type: String },
    forwardedAt: { type: Date }
  }],
  forwardCount: { type: Number, default: 0 },
  analytics: {
    totalViews: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
    engagementRate: { type: Number, default: 0 },
    shareCount: { type: Number, default: 0 },
    saveCount: { type: Number, default: 0 },
    peakTime: { type: String, default: '' },
    topDay: { type: String, default: '' },
    demographics: {
      age: [{ range: { type: String }, percentage: { type: Number } }],
      gender: [{ gender: { type: String }, percentage: { type: Number } }]
    },
    viewsByTime: [{ time: { type: String }, views: { type: Number } }],
    viewsByDevice: [{ device: { type: String }, views: { type: Number }, percentage: { type: Number } }],
    viewsByLocation: [{ location: { type: String }, views: { type: Number } }],
    dropOffPoints: [{ step: { type: String }, percentage: { type: Number } }]
  },
  
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // saa 24
  },
  createdAt: { type: Date, default: Date.now },
  timestamp: { type: Date, default: Date.now }
});

// Auto-delete baada ya saa 24
statusSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Indexes for efficient user queries
statusSchema.index({ userId: 1, expiresAt: -1 });
statusSchema.index({ userId: 1, createdAt: -1 });

statusSchema.pre('save', function syncUserFields(next) {
  if (this.user && !this.userId) {
    this.userId = String(this.user);
  } else if (this.userId && !this.user && mongoose.Types.ObjectId.isValid(this.userId)) {
    this.user = this.userId;
  }
  next();
});

module.exports = mongoose.model('Status', statusSchema);
