const mongoose = require("mongoose");

const statusAnalyticsSchema = new mongoose.Schema(
  {
    statusId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Status",
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    uniqueViews: {
      type: Number,
      default: 0,
    },
    replies: {
      type: Number,
      default: 0,
    },
    reactions: {
      type: Number,
      default: 0,
    },
    screenshots: {
      type: Number,
      default: 0,
    },
    peakTime: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("StatusAnalytics", statusAnalyticsSchema);
