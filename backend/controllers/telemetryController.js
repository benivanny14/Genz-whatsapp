const CrashReport = require('../models/CrashReport');
const AppEvent = require('../models/AppEvent');
const { sendAlertEmail } = require('../services/alertMailerService');

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

// Email delivery for production alerts (stuck-release / low-engagement).
// Called by the nightly workflow with a shared token (ALERT_WEBHOOK_TOKEN);
// mail is best-effort — the GitHub issue is the source of truth, so an
// unconfigured SMTP or a failed send still returns 200 with { sent: false }.
exports.sendProdAlert = async (req, res) => {
  const expected = process.env.ALERT_WEBHOOK_TOKEN;
  const provided = typeof req.headers['x-alert-token'] === 'string' ? req.headers['x-alert-token'] : '';
  if (!expected || provided !== expected) {
    return res.status(401).json({ success: false, message: 'Invalid alert token' });
  }
  const { subject, message, section } = req.body || {};
  if (typeof subject !== 'string' || !subject || typeof message !== 'string' || !message) {
    return res.status(400).json({ success: false, message: 'subject and message are required' });
  }
  const safeSubject = subject.slice(0, 120);
  const safeMessage = message.slice(0, 4000);
  const text = `${section ? `[${section}]\n\n` : ''}${safeMessage}\n\n— GENZ production alerts`;
  const result = await sendAlertEmail({ subject: safeSubject, text });
  res.status(200).json({ success: true, sent: result.sent, reason: result.reason || null });
};

// This device's OWN update events (GDPR-friendly data access): the caller
// holds the random anonId in localStorage, so passing it returns only the
// events tied to that id — event name, version and timestamp.
exports.getMyUpdateEvents = async (req, res) => {
  const anonId = typeof req.query.anonId === 'string' ? req.query.anonId.slice(0, 64) : '';
  if (!anonId) return res.status(400).json({ success: false, message: 'anonId query param is required' });
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  try {
    const events = await AppEvent.find({ anonId }).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({
      success: true,
      events: events.map((e) => ({
        event: e.event,
        version: e.version || '',
        versionCode: e.versionCode || 0,
        platform: e.platform || 'unknown',
        createdAt: e.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load events' });
  }
};

// Aggregate uptake for one version — public, returns ONLY four integers (no
// anon ids, no timestamps), used by the nightly health check to spot a
// release nobody acted on. sinceHours is clamped to [1, 168].
exports.getUpdateUptake = async (req, res) => {
  const version = typeof req.query.version === 'string' ? req.query.version.slice(0, 20) : '';
  if (!version) return res.status(400).json({ success: false, message: 'version query param is required' });
  const sinceHours = Math.min(168, Math.max(1, Number(req.query.sinceHours) || 48));
  try {
    const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
    const [shown, updated, dismissed] = await Promise.all([
      AppEvent.countDocuments({ version, event: 'update_shown', createdAt: { $gte: since } }),
      AppEvent.countDocuments({ version, event: { $in: ['update_tapped', 'update_reload_tapped'] }, createdAt: { $gte: since } }),
      AppEvent.countDocuments({ version, event: 'update_dismissed', createdAt: { $gte: since } })
    ]);
    res.json({ success: true, version, sinceHours, shown, updated, dismissed });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load uptake' });
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
