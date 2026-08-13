const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { reportFrontendCrash, trackUpdateEvent, getUpdateUptake } = require('../controllers/telemetryController');

// Opt-in frontend crash reports from the ErrorBoundary (authenticated).
router.post('/crashes', protect, reportFrontendCrash);

// Anonymous update-banner analytics. Public on purpose: the update banner
// shows on the login page for logged-out users too. The global /api rate
// limiter applies and the controller only accepts allowlisted event names
// with clamped values (see telemetryController.trackUpdateEvent).
router.post('/events', trackUpdateEvent);

// Public per-version uptake counts (shown/dismissed/updated over a window) —
// used by the nightly health check to alert when a release is stuck.
router.get('/events/uptake', getUpdateUptake);

module.exports = router;
