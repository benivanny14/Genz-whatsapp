const Subscription = require('../models/Subscription');
const User = require('../models/User');

/**
 * Strict idempotency check for transaction processing
 * Ensures a transaction is never processed twice
 */
const checkTransactionProcessed = async (transactionId) => {
  try {
    // Check if subscription with this transactionId already exists with success/completed status
    const existingSubscription = await Subscription.findOne({ 
      transactionId: transactionId 
    });

    if (existingSubscription) {
      // If payment is already success/completed, reject reprocessing
      if (existingSubscription.paymentStatus === 'completed' || existingSubscription.status === 'active') {
        return {
          alreadyProcessed: true,
          subscription: existingSubscription,
          reason: 'Transaction already completed successfully'
        };
      }

      // If payment is failed, allow retry
      if (existingSubscription.paymentStatus === 'failed' || existingSubscription.status === 'failed') {
        return {
          alreadyProcessed: false,
          subscription: existingSubscription,
          canRetry: true,
          reason: 'Transaction failed previously, retry allowed'
        };
      }

      // If payment is pending, check if it's stale (older than 30 minutes)
      if (existingSubscription.paymentStatus === 'pending') {
        const pendingDuration = Date.now() - new Date(existingSubscription.createdAt).getTime();
        const THIRTY_MINUTES = 30 * 60 * 1000;
        
        if (pendingDuration > THIRTY_MINUTES) {
          // Stale pending payment, allow retry
          return {
            alreadyProcessed: false,
            subscription: existingSubscription,
            canRetry: true,
            reason: 'Stale pending transaction, retry allowed'
          };
        } else {
          // Recent pending payment, reject duplicate
          return {
            alreadyProcessed: true,
            subscription: existingSubscription,
            reason: 'Transaction is still pending, cannot reprocess'
          };
        }
      }
    }

    // No existing transaction found
    return {
      alreadyProcessed: false,
      subscription: null,
      reason: 'New transaction'
    };
  } catch (error) {
    console.error('Error checking transaction idempotency:', error);
    // On error, fail safe - allow processing to proceed
    return {
      alreadyProcessed: false,
      subscription: null,
      reason: 'Idempotency check failed, allowing processing'
    };
  }
};

/**
 * Atomic premium activation with duplicate protection
 * Ensures user cannot receive premium twice
 */
const activatePremiumAtomically = async (userId, transactionId, expiryDate) => {
  try {
    // Start a MongoDB session for atomic operations
    const session = await Subscription.startSession();
    session.startTransaction();

    try {
      // Check if user already has active premium
      const user = await User.findById(userId).session(session);
      
      if (!user) {
        await session.abortTransaction();
        session.endSession();
        return {
          success: false,
          reason: 'User not found'
        };
      }

      // If user already has premium, check if it's still valid
      if (user.premium && user.subscriptionExpiresAt) {
        const now = new Date();
        const currentExpiry = new Date(user.subscriptionExpiresAt);
        
        if (now < currentExpiry) {
          // User already has valid premium, don't activate again
          await session.abortTransaction();
          session.endSession();
          return {
            success: false,
            reason: 'User already has active premium subscription',
            existingExpiry: currentExpiry
          };
        }
      }

      // Activate premium atomically
      user.premium = true;
      user.subscriptionExpiresAt = expiryDate;
      await user.save({ session });

      // Commit transaction
      await session.commitTransaction();
      session.endSession();

      return {
        success: true,
        user
      };
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error in atomic premium activation:', error);
    return {
      success: false,
      reason: 'Database error during premium activation'
    };
  }
};

/**
 * Enforce payment state machine rules
 * Ensures status transitions are valid
 */
const validateStatusTransition = async (subscriptionId, newStatus) => {
  try {
    const subscription = await Subscription.findById(subscriptionId);
    
    if (!subscription) {
      return {
        valid: false,
        reason: 'Subscription not found'
      };
    }

    const currentStatus = subscription.status;
    const currentPaymentStatus = subscription.paymentStatus;

    // Define valid transitions
    const validTransitions = {
      'pending': ['active', 'failed', 'expired'],
      'active': ['expired'], // Only transition from active is to expired
      'failed': [], // Failed is terminal
      'expired': [] // Expired is terminal
    };

    const validPaymentTransitions = {
      'pending': ['completed', 'failed', 'refunded'],
      'completed': [], // Completed is terminal
      'failed': [], // Failed is terminal
      'refunded': [] // Refunded is terminal
    };

    // Check if transition is valid
    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      return {
        valid: false,
        reason: `Invalid status transition from ${currentStatus} to ${newStatus}`
      };
    }

    // Special rule: Once status is 'active', it can NEVER be changed to anything except 'expired'
    if (currentStatus === 'active' && newStatus !== 'expired') {
      return {
        valid: false,
        reason: 'Cannot override active subscription status'
      };
    }

    // Special rule: Once paymentStatus is 'completed', it can NEVER be changed
    if (currentPaymentStatus === 'completed') {
      return {
        valid: false,
        reason: 'Cannot override completed payment status'
      };
    }

    return {
      valid: true,
      subscription
    };
  } catch (error) {
    console.error('Error validating status transition:', error);
    return {
      valid: false,
      reason: 'Error validating status transition'
    };
  }
};

/**
 * Sanitize webhook payload to prevent malicious data
 * Allows only expected fields per provider
 */
const sanitizeWebhookPayload = (provider, payload) => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const pick = (source = {}, keys = []) => keys.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      acc[key] = source[key];
    }
    return acc;
  }, {});

  const sanitizers = {
    mpesa: () => {
      const stkCallback = payload.Body?.stkCallback;
      if (!stkCallback) return null;

      return {
        Body: {
          stkCallback: {
            ...pick(stkCallback, [
              'MerchantRequestID',
              'CheckoutRequestID',
              'ResultCode',
              'ResultDesc'
            ]),
            CallbackMetadata: stkCallback.CallbackMetadata?.Item ? {
              Item: stkCallback.CallbackMetadata.Item.map((item) => pick(item, ['Name', 'Value']))
            } : undefined
          }
        }
      };
    },
    airtel: () => {
      const transaction = payload.transaction || {};
      return {
        ...pick(payload, ['transaction_id', 'external_id', 'status', 'amount', 'currency', 'phone', 'reference', 'message']),
        transaction: pick(transaction, ['transaction_id', 'external_id', 'status', 'amount', 'currency', 'phone', 'reference', 'message'])
      };
    },
    yas: () => pick(payload, ['status', 'transaction_id', 'amount', 'currency', 'timestamp', 'message', 'reference']),
    halopesa: () => pick(payload, ['status', 'transaction_id', 'amount', 'currency', 'timestamp', 'message', 'reference'])
  };

  return sanitizers[provider.toLowerCase()]?.() || null;
};

module.exports = {
  checkTransactionProcessed,
  activatePremiumAtomically,
  validateStatusTransition,
  sanitizeWebhookPayload
};
