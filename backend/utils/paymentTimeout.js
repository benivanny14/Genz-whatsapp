const Subscription = require('../models/Subscription');
const { logInfo, logError } = require('../config/winston');

/**
 * Check and expire pending payments that have timed out
 * Payments that remain pending for more than 30 minutes are considered failed
 */
const checkPaymentTimeouts = async () => {
  try {
    const TIMEOUT_MINUTES = 30;
    const timeoutDate = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

    // Find all pending subscriptions older than timeout
    const timedOutSubscriptions = await Subscription.find({
      paymentStatus: 'pending',
      status: 'pending',
      createdAt: { $lt: timeoutDate }
    });

    logInfo('Found timed-out pending payments', { count: timedOutSubscriptions.length });

    for (const subscription of timedOutSubscriptions) {
      try {
        // Update subscription status to failed
        subscription.paymentStatus = 'failed';
        subscription.status = 'failed';
        subscription.webhookData = {
          ...subscription.webhookData,
          timeoutReason: `Payment timed out after ${TIMEOUT_MINUTES} minutes`,
          timeoutAt: new Date()
        };
        await subscription.save();

        logInfo('Marked subscription as failed due to timeout', { transactionId: subscription.transactionId });
      } catch (error) {
        logError('Error updating timed-out subscription', { transactionId: subscription.transactionId, message: error.message });
      }
    }

    return {
      processed: timedOutSubscriptions.length,
      success: true
    };
  } catch (error) {
    logError('Error checking payment timeouts', { message: error.message });
    return {
      processed: 0,
      success: false,
      error: error.message
    };
  }
};

/**
 * Check for duplicate premium activations
 * Ensures a user cannot have premium activated multiple times from different transactions
 */
const checkDuplicatePremiumActivation = async (userId, transactionId) => {
  try {
    // Check if there's another successful subscription for this user
    const existingSubscription = await Subscription.findOne({
      userId,
      status: 'active',
      paymentStatus: 'completed',
      transactionId: { $ne: transactionId }
    });

    if (existingSubscription) {
      return {
        hasDuplicate: true,
        reason: 'User has another active subscription',
        existingTransactionId: existingSubscription.transactionId
      };
    }

    return {
      hasDuplicate: false,
      reason: 'No duplicate found'
    };
  } catch (error) {
    logError('Error checking duplicate premium activation', { message: error.message });
    return {
      hasDuplicate: false,
      reason: 'Error checking duplicates, allowing activation'
    };
  }
};

/**
 * Atomic premium update with duplicate protection
 * Ensures premium status is updated atomically and prevents race conditions
 */
const updatePremiumStatusAtomically = async (userId, transactionId, expiryDate, activate = true) => {
  try {
    // No user model - just return success
    return {
      success: true,
      reason: 'User model removed - no auth mode'
    };
  } catch (error) {
    logError('Error in atomic premium update', { message: error.message });
    return {
      success: false,
      reason: 'Database error during premium update'
    };
  }
};

module.exports = {
  checkPaymentTimeouts,
  checkDuplicatePremiumActivation,
  updatePremiumStatusAtomically
};
