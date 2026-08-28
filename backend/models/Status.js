const mongoose = require("mongoose");

const viewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  // Legacy advanced-status paths stored the viewer under `user`.
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  viewedAt: { type: Date, default: Date.now },
});

const reactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  emoji: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const replySchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  username: { type: String, default: "" },
  message: { type: String, default: "" },
  content: { type: String, default: "" },
  type: { type: String, default: "text" },
  mediaUrl: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const musicSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    file: { type: String, default: "" },
    startTime: { type: Number, default: 0 },
    endTime: { type: Number, default: 15 },
    volume: { type: Number, default: 0.5 },
  },
  { _id: false },
);

const statusSchema = new mongoose.Schema({
  // `user` is kept for legacy controllers/tests; new status APIs use `userId`.
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  type: {
    type: String,
    // Note: core status types used in frontend UI are 'text', 'image', 'video', 'voice', 'audio'.
    // UNUSED: 'quiz', 'question', 'countdown', 'location', 'collage', 'boomerang', 'livePhoto', 'dualCamera', 'timer', 'link' have no active frontend UI creation/rendering as of Aug 2026.
    enum: [
      "text",
      "image",
      "video",
      "voice",
      "audio",
      "gif",
      "link",
      "music",
      "quiz",
      "question",
      "countdown",
      "location",
      "collage",
      "boomerang",
      "livePhoto",
      "dualCamera",
      "timer",
    ],
    required: true,
  },
  username: { type: String, default: "" },
  content: {
    type: String,
    default: "",
  },
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "" },
  caption: {
    type: String,
    default: "",
    maxlength: 500,
  },
  backgroundColor: { type: String, default: "#00a884" },
  textColor: { type: String, default: "#ffffff" },
  font: { type: String, default: "sans-serif" },
  // Text status styling
  textStatus: {
    text: { type: String, default: "" },
    backgroundColor: { type: String, default: "#128C7E" },
    fontColor: { type: String, default: "#FFFFFF" },
    fontStyle: { type: String, default: "normal" },
  },
  // Music attached to status
  music: musicSchema,
  // Privacy settings
  privacy: {
    type: String,
    enum: [
      "contacts",
      "contacts_except",
      "only_share_with",
      "nobody",
      "only_me",
      "everyone",
    ],
    default: "contacts",
  },
  excludedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  includedUsers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  excludedViewers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  includedViewers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  collabUserId: { type: String, default: "" },
  collabUsername: { type: String, default: "" },
  storyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Status",
    default: null,
  },
  linkUrl: { type: String, default: "" },
  quizQuestion: { type: String, default: "" },
  quizOptions: { type: mongoose.Schema.Types.Mixed, default: [] },
  quizCorrectAnswer: { type: mongoose.Schema.Types.Mixed, default: 0 },
  questionText: { type: String, default: "" },
  countdownDate: { type: String, default: "" },
  countdownTime: { type: String, default: "" },
  locationData: { type: mongoose.Schema.Types.Mixed, default: null },
  collageImages: { type: mongoose.Schema.Types.Mixed, default: [] },
  timerSeconds: { type: Number, default: 5 },
  imageFilter: { type: String, default: 'none' },
  // Muted by
  mutedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  // Archive status
  // Archive & Revoke status
  archived: {
    type: Boolean,
    default: false,
  },
  isRevoked: {
    type: Boolean,
    default: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  revokedAt: {
    type: Date,
    default: null,
  },
  mentions: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: { type: String, default: "" },
      notified: { type: Boolean, default: false },
    },
  ],
  replySettings: {
    type: String,
    enum: ["everyone", "contacts", "nobody"],
    default: "everyone",
  },
  quality: {
    type: String,
    enum: ["hd", "standard", "saver"],
    default: "standard",
  },
  maxDuration: {
    type: Number,
    default: 60,
  },
  statusDuration: {
    type: Number,
    default: 24,
  },
  parentStatusId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Status",
    default: null,
  },
  addYoursPrompt: {
    type: String,
    default: "",
  },
  addYoursCount: {
    type: Number,
    default: 0,
  },
  locationSticker: {
    name: { type: String, default: "" },
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  linkPreview: {
    url: { type: String, default: "" },
    title: { type: String, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    domain: { type: String, default: "" },
  },
  // Views & engagement
  viewCount: { type: Number, default: 0 },
  viewsCount: { type: Number, default: 0 },
  views: [viewSchema],
  reactions: [reactionSchema],
  // UNUSED: likes, saves, shares, reshares are schema fields kept for backward-compatibility; main reactions use reactions array.
  likes: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      likedAt: { type: Date, default: Date.now },
    },
  ],
  likesCount: { type: Number, default: 0 },
  saves: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      savedAt: { type: Date, default: Date.now },
    },
  ],
  savesCount: { type: Number, default: 0 },
  shares: [
    {
      sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      platform: { type: String, default: "status" },
      sharedAt: { type: Date, default: Date.now },
    },
  ],
  shareCount: { type: Number, default: 0 },
  reshares: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      username: { type: String, default: "" },
      originalStatusId: { type: mongoose.Schema.Types.ObjectId, ref: "Status" },
      resharedAt: { type: Date, default: Date.now },
    },
  ],
  // Replies
  replies: [replySchema],
  // Poll support
  poll: {
    question: { type: String },
    options: [
      {
        id: { type: Number },
        text: { type: String },
        votes: { type: Number, default: 0 },
      },
    ],
    allowMultiple: { type: Boolean, default: false },
    expiresAt: { type: Date },
    totalVotes: { type: Number, default: 0 },
    voters: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        optionIds: [Number],
        votedAt: { type: Date },
      },
    ],
  },
  // Forward support
  forwards: [
    {
      forwardedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      contacts: [{ type: mongoose.Schema.Types.ObjectId }],
      groups: [{ type: mongoose.Schema.Types.ObjectId }],
      message: { type: String },
      forwardedAt: { type: Date },
    },
  ],
  forwardCount: { type: Number, default: 0 },
  // Duration in seconds (for video)
  duration: { type: Number, default: 0 },
  // Expiry (auto-delete after 24h)
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 },
  },
  // Scheduling
  scheduledAt: { type: Date, default: null },
  isScheduled: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: true },
  timestamp: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
});

// Indexes
statusSchema.pre("validate", function setLegacyAliases(next) {
  if (!this.user && this.userId) this.user = this.userId;
  if (!this.userId && this.user) this.userId = this.user;
  next();
});

statusSchema.index({ userId: 1, createdAt: -1 });
statusSchema.index({ userId: 1, expiresAt: -1 });
statusSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Status", statusSchema);
