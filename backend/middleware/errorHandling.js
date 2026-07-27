const logger = require('../utils/logger');

/**
 * Error edge case handling middleware
 * Handles webhook retry storms, database write failures, partial updates, and network delays
 */

// Track recent webhook processing to prevent retry storms
const recentWebhooks = new Map();
const WEBHOOK_RETRY_WINDOW = 5000; // 5 seconds
const MAX_RETRY_ATTEMPTS = 5;

const getWebhookTransactionId = (req) => (
  req.query.transactionId ||
  req.body.transaction_id ||
  req.body.external_id ||
  req.body.transaction?.transaction_id ||
  req.body.transaction?.external_id ||
  req.body.Body?.stkCallback?.CheckoutRequestID ||
  req.body.Body?.stkCallback?.MerchantRequestID ||
  `${req.path}:${req.ip}`
);

/**
 * Prevent webhook retry storms
 * Tracks recent webhooks and rejects duplicate requests within time window
 */
const preventWebhookRetryStorm = (req, res, next) => {
  const transactionId = getWebhookTransactionId(req);
  const webhookType = req.path.split('/').pop();
  const key = `${webhookType}_${transactionId}`;
  
  const now = Date.now();
  const recent = recentWebhooks.get(key);
  
  if (recent) {
    const timeSinceLast = now - recent.timestamp;
    recent.attempts++;
    
    if (timeSinceLast < WEBHOOK_RETRY_WINDOW && recent.attempts > MAX_RETRY_ATTEMPTS) {
      logger.warn(`Webhook retry storm detected for transaction ${transactionId}`, {
        transactionId,
        attempts: recent.attempts,
        timeSinceLast
      });
      return res.status(429).json({ 
        success: false, 
        message: 'Too many webhook retry attempts',
        retryAfter: WEBHOOK_RETRY_WINDOW
      });
    }
  } else {
    recentWebhooks.set(key, {
      timestamp: now,
      attempts: 1
    });
  }
  
  // Clean up old entries
  const cleanupTimer = setTimeout(() => {
    recentWebhooks.delete(key);
  }, WEBHOOK_RETRY_WINDOW * 2);
  cleanupTimer.unref?.();
  
  next();
};

/**
 * Database transaction wrapper with rollback on failure
 * Ensures partial updates are rolled back if any part fails
 */
const withTransaction = async (operation) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();
  
  try {
    const result = await operation(session);
    await session.commitTransaction();
    session.endSession();
    return { success: true, data: result };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    logger.error('Database transaction failed, rolled back', {
      error: error.message,
      stack: error.stack
    });
    return { success: false, error };
  }
};

/**
 * Safe database write with retry logic
 * Handles temporary database connection issues
 */
const safeDatabaseWrite = async (operation, maxRetries = 3) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return { success: true, data: result };
    } catch (error) {
      lastError = error;
      
      // If error is not a connection error, don't retry
      if (!isRetryableError(error)) {
        logger.error('Non-retryable database error', {
          error: error.message,
          attempt
        });
        return { success: false, error };
      }
      
      logger.warn(`Database write attempt ${attempt} failed, retrying...`, {
        error: error.message,
        attempt,
        maxRetries
      });
      
      // Exponential backoff: 100ms, 200ms, 400ms
      const backoff = Math.pow(2, attempt - 1) * 100;
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
  
  logger.error('Database write failed after all retries', {
    error: lastError.message,
    maxRetries
  });
  return { success: false, error: lastError };
};

/**
 * Check if error is retryable (connection issues, timeouts)
 */
const isRetryableError = (error) => {
  const retryableCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'];
  const retryableMessages = ['connection', 'timeout', 'network', 'temporary'];
  
  const code = error.code || '';
  const message = error.message?.toLowerCase() || '';
  
  return retryableCodes.some(c => code.includes(c)) ||
         retryableMessages.some(m => message.includes(m));
};

/**
 * Handle duplicate request detection
 * Uses request fingerprinting to detect duplicate requests from network delays
 */
const requestFingerprints = new Map();
const REQUEST_FINGERPRINT_WINDOW = 10000; // 10 seconds

const detectDuplicateRequest = (req, res, next) => {
  // Create fingerprint from method, path, body, and user
  const fingerprint = JSON.stringify({
    method: req.method,
    path: req.path,
    body: req.body,
    userId: req.user?.id
  });
  
  const now = Date.now();
  const existing = requestFingerprints.get(fingerprint);
  
  if (existing && (now - existing.timestamp) < REQUEST_FINGERPRINT_WINDOW) {
    logger.warn('Duplicate request detected', {
      fingerprint,
      timeSinceFirst: now - existing.timestamp
    });
    return res.status(409).json({ 
      success: false, 
      message: 'Duplicate request detected',
      originalResponse: existing.response
    });
  }
  
  requestFingerprints.set(fingerprint, {
    timestamp: now,
    response: null
  });
  
  // Clean up old fingerprints
  setTimeout(() => {
    requestFingerprints.delete(fingerprint);
  }, REQUEST_FINGERPRINT_WINDOW * 2);
  
  // Store response for duplicate detection
  const originalJson = res.json.bind(res);
  res.json = (data) => {
    const stored = requestFingerprints.get(fingerprint);
    if (stored) {
      stored.response = data;
    }
    return originalJson(data);
  };
  
  next();
};

/**
 * Graceful error handler for webhook processing
 * Ensures system consistency even when webhook processing fails
 */
const gracefulWebhookHandler = (handler) => {
  return async (req, res, next) => {
    const transactionId = getWebhookTransactionId(req);
    let subscriptionStatus = 'unknown';
    
    try {
      // Get initial subscription status
      if (transactionId) {
        const Subscription = require('../models/Subscription');
        const subscription = await Subscription.findOne({ transactionId });
        if (subscription) {
          subscriptionStatus = subscription.status;
        }
      }
      
      // Execute handler
      await handler(req, res, next);
      
    } catch (error) {
      logger.error('Webhook handler error, attempting graceful recovery', {
        transactionId,
        subscriptionStatus,
        error: error.message,
        stack: error.stack
      });
      
      // If subscription was in pending state, mark as failed to prevent stale pending
      if (subscriptionStatus === 'pending' && transactionId) {
        try {
          const Subscription = require('../models/Subscription');
          await Subscription.findOneAndUpdate(
            { transactionId },
            { 
              status: 'failed',
              paymentStatus: 'failed',
              webhookData: {
                ...req.body,
                error: error.message,
                recovered: true
              }
            }
          );
          logger.info('Marked pending subscription as failed due to webhook error', {
            transactionId
          });
        } catch (updateError) {
          logger.error('Failed to mark subscription as failed', {
            transactionId,
            error: updateError.message
          });
        }
      }
      
      // Return 200 to prevent webhook retries on permanent errors
      // Payment gateway will retry on 5xx, so we return 200 with error info
      return res.status(200).json({ 
        success: false, 
        message: 'Webhook processing failed',
        error: error.message,
        transactionId
      });
    }
  };
};

module.exports = {
  preventWebhookRetryStorm,
  withTransaction,
  safeDatabaseWrite,
  detectDuplicateRequest,
  gracefulWebhookHandler
};
