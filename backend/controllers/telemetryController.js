const CrashReport = require('../models/CrashReport');

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
