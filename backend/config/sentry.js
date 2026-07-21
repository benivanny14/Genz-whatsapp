const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Sentry Configuration
 * Error tracking and performance monitoring
 */

const initSentry = () => {
  if (!process.env.SENTRY_DSN) {
    console.log('[Sentry] SENTRY_DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      new ProfilingIntegration(),
    ],
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE) || 0.1,
    beforeSend(event, hint) {
      // Filter out sensitive data
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    }
  });

  console.log('[Sentry] Initialized successfully');
};

const captureException = (error, context = {}) => {
  Sentry.captureException(error, { extra: context });
};

const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.captureMessage(message, { level, extra: context });
};

module.exports = {
  initSentry,
  captureException,
  captureMessage,
  Sentry
};
