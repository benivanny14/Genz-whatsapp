const CrashReport = require('../models/CrashReport');
const AppEvent = require('../models/AppEvent');

// Allowlist for anonymous update-banner events — the endpoint never accepts
// arbitrary strings, so it cannot be used as a spam/storage vector beyond the
// global /api rate limiter.
const ALLOWED_EVENTS = ['update_shown', 'update_dismissed', 'update_tapped', 'update_reload_tapped'];
const ALLOWED_PLATFORMS = ['web', 'apk', 'unknown'];

// Opt-in frontend crash reporting: the ErrorBoundary POSTs here after a
// render crash when the user has enabled crash reporting. The global /api
// rate limiter applies; bodies are clamped to keep storage small.
exports.reportFrontendCrash = async (req, res) => {
  try {
    const { route, message } = req.body || {};
    await CrashReport.create({
      route: typeof route === 'string' ? route.slice(0, 500) : '/',
      message: typeof message === 'string' ? message.slice(0, 2000) : '',
      userId: req.user?._id || null
    });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to store crash report' });
  }
};

// Anonymous update-banner analytics (public endpoint — the banner shows on
// the login page too, for logged-out users). Only allowlisted event names and
// tiny, clamped fields are stored; see AppEvent.js. Fire-and-forget from the
// frontend; failures never bubble back to the caller.
exports.trackUpdateEvent = async (req, res) => {
  const { event, version, versionCode, platform, anonId } = req.body || {};
  if (!ALLOWED_EVENTS.includes(event)) {
    return res.status(400).json({ success: false, message: 'Unknown event' });
  }
  try {
    await AppEvent.create({
      event,
      version: typeof version === 'string' ? version.slice(0, 20) : '',
      versionCode: Number.isFinite(Number(versionCode)) ? Math.max(0, Number(versionCode)) : 0,
      platform: ALLOWED_PLATFORMS.includes(platform) ? platform : 'unknown',
      anonId: typeof anonId === 'string' ? anonId.slice(0, 64) : ''
    });
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to store event' });
  }
};
