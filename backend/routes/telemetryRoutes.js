const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { reportFrontendCrash } = require('../controllers/telemetryController');

// Opt-in frontend crash reports from the ErrorBoundary (authenticated).
router.post('/crashes', protect, reportFrontendCrash);

module.exports = router;
