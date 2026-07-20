// Structured logging utility for production monitoring

const logLevels = {
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DEBUG: 'DEBUG'
};

class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    if (this.isDevelopment) {
      console.log(JSON.stringify(logEntry, null, 2));
    } else {
      console.log(JSON.stringify(logEntry));
    }

    return logEntry;
  }

  info(message, meta = {}) {
    return this.formatLog(logLevels.INFO, message, meta);
  }

  warn(message, meta = {}) {
    return this.formatLog(logLevels.WARN, message, meta);
  }

  error(message, meta = {}) {
    return this.formatLog(logLevels.ERROR, message, meta);
  }

  debug(message, meta = {}) {
    if (this.isDevelopment) {
      return this.formatLog(logLevels.DEBUG, message, meta);
    }
  }

  // Specific logging methods for payment events
  logPaymentInitiated(userId, transactionId, paymentMethod, amount) {
    return this.info('Payment initiated', {
      userId,
      transactionId,
      paymentMethod,
      amount,
      currency: 'TZS',
      event: 'payment_initiated'
    });
  }

  logPaymentSuccess(userId, transactionId, paymentMethod, amount) {
    return this.info('Payment successful', {
      userId,
      transactionId,
      paymentMethod,
      amount,
      currency: 'TZS',
      event: 'payment_success'
    });
  }

  logPaymentFailed(userId, transactionId, paymentMethod, amount, reason) {
    return this.warn('Payment failed', {
      userId,
      transactionId,
      paymentMethod,
      amount,
      currency: 'TZS',
      reason,
      event: 'payment_failed'
    });
  }

  logWebhookReceived(provider, transactionId) {
    return this.info('Webhook received', {
      provider,
      transactionId,
      event: 'webhook_received'
    });
  }

  logWebhookProcessed(provider, transactionId, status) {
    return this.info('Webhook processed', {
      provider,
      transactionId,
      status,
      event: 'webhook_processed'
    });
  }

  logWebhookError(provider, transactionId, error) {
    return this.error('Webhook processing error', {
      provider,
      transactionId,
      error: error.message,
      stack: this.isDevelopment ? error.stack : undefined,
      event: 'webhook_error'
    });
  }

  logSubscriptionActivated(userId, subscriptionId, expiryDate) {
    return this.info('Subscription activated', {
      userId,
      subscriptionId,
      expiryDate,
      event: 'subscription_activated'
    });
  }

  logSubscriptionExpired(userId, subscriptionId) {
    return this.warn('Subscription expired', {
      userId,
      subscriptionId,
      event: 'subscription_expired'
    });
  }

  logSubscriptionRevoked(userId, reason) {
    return this.warn('Subscription revoked', {
      userId,
      reason,
      event: 'subscription_revoked'
    });
  }

  logPremiumAccessDenied(userId, reason) {
    return this.warn('Premium access denied', {
      userId,
      reason,
      event: 'premium_access_denied'
    });
  }

  logAdminAction(adminId, action, targetUserId, details) {
    return this.info('Admin action performed', {
      adminId,
      action,
      targetUserId,
      details,
      event: 'admin_action'
    });
  }
}

const logger = new Logger();

module.exports = logger;
