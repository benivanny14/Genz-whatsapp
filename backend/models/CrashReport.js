const mongoose = require('mongoose');

// Server-side frontend crash telemetry (opt-in). The ErrorBoundary POSTs a
// small { route, message } record per crash; admins query the aggregate via
// the admin API. `expires` creates a TTL index so old reports are dropped
// automatically after 90 days.
const crashReportSchema = new mongoose.Schema({
  route: { type: String, default: '/' },
  message: { type: String, default: '' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 90 * 24 * 60 * 60 // seconds — 90 days
  }
});

crashReportSchema.index({ createdAt: -1 });

module.exports = mongoose.model('CrashReport', crashReportSchema);
