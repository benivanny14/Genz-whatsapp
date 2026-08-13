const mongoose = require('mongoose');

// Anonymous update-banner analytics (see frontend/src/utils/updateAnalytics.js).
// No PII: only a per-device random id (anonId), the event name, and the app
// version involved. The frontend POSTs fire-and-forget; the admin API
// aggregates counts (see getAppEventSummary). `createdAt` carries a TTL
// index so old events drop automatically after 180 days.
const appEventSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
    // Keep this allowlist in sync with frontend/src/utils/updateAnalytics.js
    enum: ['update_shown', 'update_dismissed', 'update_tapped', 'update_reload_tapped']
  },
  version: { type: String, default: '' }, // e.g. "1.1.4"
  versionCode: { type: Number, default: 0 },
  platform: { type: String, enum: ['web', 'apk', 'unknown'], default: 'unknown' },
  anonId: { type: String, default: '' },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 180 * 24 * 60 * 60 // seconds — 180 days
  }
});

appEventSchema.index({ event: 1, createdAt: -1 });
appEventSchema.index({ versionCode: 1, createdAt: -1 });

module.exports = mongoose.model('AppEvent', appEventSchema);
