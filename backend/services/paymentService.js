const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { 
  initiateSTKPush, 
  querySTKPushStatus,
  formatPhoneNumber: formatMpesaPhone,
  parseCallback: parseMpesaCallback
} = require('../config/mpesa');
const { 
  initiatePayment,
  queryTransactionStatus,
  formatPhoneNumber: formatAirtelPhone,
  parseCallback: parseAirtelCallback
} = require('../config/airtel');

/**
 * Payment Service
 * Handles all payment operations for M-Pesa, Airtel, and other providers
 */

const SUBSCRIPTION_DAYS = 60;
const MUTABLE_TRANSACTION_STATUSES = ['pending', 'processing'];

const getProviderPaymentMethod = (provider) => (provider === 'airtel' ? 'airtel-money' : provider);

const getSubscriptionWindow = (user) => {
  const now = new Date();
  const currentExpiry = user?.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt) : null;
  const startDate = currentExpiry && currentExpiry > now ? currentExpiry : now;
  const expiryDate = new Date(startDate);
  expiryDate.setDate(expiryDate.getDate() + SUBSCRIPTION_DAYS);

  return { now, startDate, expiryDate };
};

const getWebhookHash = (payload) => (
  crypto.createHash('sha256').update(JSON.stringify(payload || {})).digest('hex')
);

const getWebhookAuditUpdate = (payload, status, reason) => {
  const payloadHash = getWebhookHash(payload);

  return {
    payloadHash,
    set: {
      callbackData: payload,
      lastWebhookHash: payloadHash,
      updatedAt: new Date()
    },
    push: {
      webhookEvents: {
        $each: [{
          payloadHash,
          status,
          reason,
          receivedAt: new Date()
        }],
        $slice: -20
      }
    }
  };
};

const recordDuplicateWebhook = async (transaction, payload, reason = 'duplicate_or_terminal_state') => {
  const audit = getWebhookAuditUpdate(payload, 'duplicate', reason);
  await Transaction.updateOne(
    { _id: transaction._id },
    {
      $set: audit.set,
      $push: audit.push
    }
  );
};

const parseMpesaTransactionDate = (value) => {
  const raw = String(value || '');
  if (!/^\d{14}$/.test(raw)) return value || new Date();

  return new Date(
    Number(raw.slice(0, 4)),
    Number(raw.slice(4, 6)) - 1,
    Number(raw.slice(6, 8)),
    Number(raw.slice(8, 10)),
    Number(raw.slice(10, 12)),
    Number(raw.slice(12, 14))
  );
};

const buildMpesaCallbackLookup = (parsed = {}) => {
  const candidateFields = [
    ['checkoutRequestID', parsed.checkoutRequestID],
    ['merchantRequestID', parsed.merchantRequestID],
    ['transactionId', parsed.checkoutRequestID],
    ['providerTransactionId', parsed.mpesaReceiptNumber],
    ['receiptNumber', parsed.mpesaReceiptNumber]
  ];

  const identifiers = candidateFields
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .map(([field, value]) => ({ [field]: String(value) }));

  return identifiers.length ? { provider: 'mpesa', $or: identifiers } : null;
};

/**
 * Initiate M-Pesa STK Push payment
 * @param {string} userId - User ID
 * @param {number} amount - Amount to charge
 * @param {string} phoneNumber - Phone number
 * @param {string} reference - Transaction reference
 * @param {string} description - Transaction description
 * @returns {Promise<Object>} Payment result
 */
const initiateMpesaPayment = async (userId, amount, phoneNumber, reference, description) => {
  try {
    // Format phone number
    const formattedPhone = formatMpesaPhone(phoneNumber);
    
    // Generate unique transaction ID
    const transactionId = `MPESA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      provider: 'mpesa',
      type: 'subscription',
      amount,
      phoneNumber: formattedPhone,
      reference,
      description,
      transactionId,
      status: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    // Initiate STK Push
    const result = await initiateSTKPush(formattedPhone, amount, reference, description);
    
    // Update transaction with provider data
    if (result.data && result.data.CheckoutRequestID) {
      transaction.checkoutRequestID = result.data.CheckoutRequestID;
      transaction.merchantRequestID = result.data.MerchantRequestID;
      transaction.status = 'processing';
      await transaction.save();
    }
    
    return {
      success: true,
      transactionId: transaction.transactionId,
      checkoutRequestID: transaction.checkoutRequestID,
      message: 'STK Push initiated. Please check your phone to complete the payment.'
    };
  } catch (error) {
    console.error('[PaymentService] M-Pesa payment failed:', error);
    
    // Update transaction status to failed if it was created
    if (error.transactionId) {
      await Transaction.findOneAndUpdate(
        { transactionId: error.transactionId },
        { status: 'failed', description: error.message }
      );
    }
    
    throw error;
  }
};

/**
 * Initiate Airtel Money payment
 * @param {string} userId - User ID
 * @param {number} amount - Amount to charge
 * @param {string} phoneNumber - Phone number
 * @param {string} reference - Transaction reference
 * @param {string} description - Transaction description
 * @returns {Promise<Object>} Payment result
 */
const initiateAirtelPayment = async (userId, amount, phoneNumber, reference, description) => {
  try {
    // Format phone number
    const formattedPhone = formatAirtelPhone(phoneNumber);
    
    // Generate unique transaction ID
    const transactionId = `AIRTEL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create transaction record
    const transaction = await Transaction.create({
      userId,
      provider: 'airtel',
      type: 'subscription',
      amount,
      phoneNumber: formattedPhone,
      reference,
      description,
      transactionId,
      status: 'pending',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    });
    
    // Initiate payment
    const result = await initiatePayment(formattedPhone, amount, reference, transactionId);
    
    // Update transaction with provider data
    if (result.data && result.data.transaction_id) {
      transaction.providerTransactionId = result.data.transaction_id;
      transaction.status = 'processing';
      await transaction.save();
    }
    
    return {
      success: true,
      transactionId: transaction.transactionId,
      message: 'Payment initiated. Please check your phone to complete the payment.'
    };
  } catch (error) {
    console.error('[PaymentService] Airtel payment failed:', error);
    
    // Update transaction status to failed if it was created
    if (error.transactionId) {
      await Transaction.findOneAndUpdate(
        { transactionId: error.transactionId },
        { status: 'failed', description: error.message }
      );
    }
    
    throw error;
  }
};

/**
 * Query payment status
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Query result
 */
const queryPaymentStatus = async (transactionId) => {
  try {
    const transaction = await Transaction.findOne({ transactionId });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // Check if already completed
    if (transaction.status === 'completed') {
      return {
        success: true,
        status: 'completed',
        transaction
      };
    }
    
    // Check if expired
    if (transaction.isExpired()) {
      transaction.markFailed('Transaction expired');
      await transaction.save();
      return {
        success: false,
        status: 'expired',
        message: 'Transaction has expired'
      };
    }
    
    // Query based on provider
    let result;
    if (transaction.provider === 'mpesa' && transaction.checkoutRequestID) {
      result = await querySTKPushStatus(transaction.checkoutRequestID);
    } else if (transaction.provider === 'airtel' && transaction.providerTransactionId) {
      result = await queryTransactionStatus(transaction.providerTransactionId);
    }
    
    // Update transaction status based on result
    if (result && result.data) {
      if (transaction.provider === 'mpesa') {
        const resultCode = result.data.ResultCode;
        if (resultCode === '0') {
          // Success
          const metadata = result.data.CallbackMetadata?.Item || [];
          const amount = metadata.find(i => i.Name === 'Amount')?.Value;
          const receipt = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
          const date = metadata.find(i => i.Name === 'TransactionDate')?.Value;
          
          transaction.markCompleted(
            result.data.MerchantRequestID,
            receipt,
            date
          );
          
          // Update user subscription
          await updateUserSubscription(transaction.userId, transaction.amount, transaction, result.data);
        } else if (resultCode === '1032') {
          // Cancelled by user
          transaction.markFailed('Payment cancelled by user');
        } else if (resultCode === '1037') {
          // Timeout
          transaction.markFailed('Payment timeout');
        } else {
          transaction.markFailed(result.data.ResultDesc || 'Payment failed');
        }
      } else if (transaction.provider === 'airtel') {
        const status = result.data.status;
        if (status === 'SUCCESS') {
          transaction.markCompleted(
            result.data.transaction_id,
            result.data.transaction_id,
            new Date().toISOString()
          );
          
          // Update user subscription
          await updateUserSubscription(transaction.userId, transaction.amount, transaction, result.data);
        } else if (status === 'FAILED') {
          transaction.markFailed(result.data.message || 'Payment failed');
        }
      }
      
      await transaction.save();
    }
    
    return {
      success: true,
      status: transaction.status,
      transaction
    };
  } catch (error) {
    console.error('[PaymentService] Query payment status failed:', error);
    throw error;
  }
};

/**
 * Handle M-Pesa callback
 * @param {Object} callbackData - Callback data from M-Pesa
 * @returns {Promise<Object>} Callback result
 */
const handleMpesaCallback = async (callbackData) => {
  try {
    const parsed = parseMpesaCallback(callbackData);
    
    // Find transaction by any stable identifier the provider supplied.
    const lookup = buildMpesaCallbackLookup(parsed);
    const transaction = lookup ? await Transaction.findOne(lookup) : null;
    
    if (!transaction) {
      console.warn('[PaymentService] Transaction not found for callback:', {
        checkoutRequestID: parsed.checkoutRequestID,
        merchantRequestID: parsed.merchantRequestID,
        receiptNumber: parsed.mpesaReceiptNumber
      });
      return { success: false, message: 'Transaction not found' };
    }

    if (transaction.status === 'completed') {
      await recordDuplicateWebhook(transaction, callbackData, 'transaction_already_completed');
      return { success: true, message: 'Callback already processed' };
    }
    
    // Update transaction based on result code
    if (parsed.resultCode === '0') {
      const audit = getWebhookAuditUpdate(callbackData, 'completed');
      const completedTransaction = await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: MUTABLE_TRANSACTION_STATUSES } },
        {
          $set: {
            ...audit.set,
            status: 'completed',
            providerTransactionId: parsed.merchantRequestID,
            merchantRequestID: parsed.merchantRequestID,
            receiptNumber: parsed.mpesaReceiptNumber,
            transactionDate: parseMpesaTransactionDate(parsed.transactionDate)
          },
          $push: audit.push
        },
        { new: true }
      );

      if (!completedTransaction) {
        await recordDuplicateWebhook(transaction, callbackData, `terminal_state_${transaction.status}`);
        return { success: true, message: 'Callback already processed or transaction is terminal' };
      }

      await updateUserSubscription(completedTransaction.userId, completedTransaction.amount, completedTransaction, callbackData);
    } else if (parsed.resultCode === '1032') {
      const audit = getWebhookAuditUpdate(callbackData, 'failed', 'Payment cancelled by user');
      await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: MUTABLE_TRANSACTION_STATUSES } },
        {
          $set: {
            ...audit.set,
            status: 'failed',
            description: 'Payment cancelled by user'
          },
          $push: audit.push
        }
      );
    } else if (parsed.resultCode === '1037') {
      const audit = getWebhookAuditUpdate(callbackData, 'failed', 'Payment timeout');
      await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: MUTABLE_TRANSACTION_STATUSES } },
        {
          $set: {
            ...audit.set,
            status: 'failed',
            description: 'Payment timeout'
          },
          $push: audit.push
        }
      );
    } else {
      const reason = parsed.resultDesc || 'Payment failed';
      const audit = getWebhookAuditUpdate(callbackData, 'failed', reason);
      await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: MUTABLE_TRANSACTION_STATUSES } },
        {
          $set: {
            ...audit.set,
            status: 'failed',
            description: reason
          },
          $push: audit.push
        }
      );
    }
    
    return { success: true, message: 'Callback processed successfully' };
  } catch (error) {
    console.error('[PaymentService] M-Pesa callback failed:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Handle Airtel callback
 * @param {Object} callbackData - Callback data from Airtel
 * @returns {Promise<Object>} Callback result
 */
const handleAirtelCallback = async (callbackData) => {
  try {
    const parsed = parseAirtelCallback(callbackData);
    
    // Find transaction by external ID
    const transaction = await Transaction.findOne({
      transactionId: parsed.externalId
    });
    
    if (!transaction) {
      console.warn('[PaymentService] Transaction not found for callback:', parsed.externalId);
      return { success: false, message: 'Transaction not found' };
    }

    if (transaction.status === 'completed') {
      await recordDuplicateWebhook(transaction, callbackData, 'transaction_already_completed');
      return { success: true, message: 'Callback already processed' };
    }
    
    // Update transaction based on status
    if (parsed.status === 'SUCCESS') {
      const audit = getWebhookAuditUpdate(callbackData, 'completed');
      const completedTransaction = await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: MUTABLE_TRANSACTION_STATUSES } },
        {
          $set: {
            ...audit.set,
            status: 'completed',
            providerTransactionId: parsed.transactionId,
            receiptNumber: parsed.transactionId,
            transactionDate: new Date()
          },
          $push: audit.push
        },
        { new: true }
      );

      if (!completedTransaction) {
        await recordDuplicateWebhook(transaction, callbackData, `terminal_state_${transaction.status}`);
        return { success: true, message: 'Callback already processed or transaction is terminal' };
      }

      await updateUserSubscription(completedTransaction.userId, completedTransaction.amount, completedTransaction, callbackData);
    } else if (parsed.status === 'FAILED') {
      const reason = parsed.message || 'Payment failed';
      const audit = getWebhookAuditUpdate(callbackData, 'failed', reason);
      await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: MUTABLE_TRANSACTION_STATUSES } },
        {
          $set: {
            ...audit.set,
            status: 'failed',
            description: reason
          },
          $push: audit.push
        }
      );
    }
    
    return { success: true, message: 'Callback processed successfully' };
  } catch (error) {
    console.error('[PaymentService] Airtel callback failed:', error);
    return { success: false, message: error.message };
  }
};

const normalizeProviderWebhookStatus = (status = '') => String(status).trim().toUpperCase();

/**
 * Handle simple status webhooks from providers that return transaction_id/status.
 * The transaction update is atomic so duplicate callbacks cannot activate twice.
 */
const handleProviderStatusCallback = async (provider, callbackData) => {
  try {
    const transactionId = callbackData.transaction_id || callbackData.external_id || callbackData.reference;
    const status = normalizeProviderWebhookStatus(callbackData.status);

    if (!transactionId || !status) {
      return { success: false, message: 'Missing transaction_id or status' };
    }

    const transaction = await Transaction.findOne({
      provider,
      $or: [
        { transactionId },
        { providerTransactionId: transactionId }
      ]
    });

    if (!transaction) {
      console.warn(`[PaymentService] ${provider} transaction not found for webhook:`, transactionId);
      return { success: false, message: 'Transaction not found' };
    }

    if (transaction.status === 'completed') {
      await recordDuplicateWebhook(transaction, callbackData, 'transaction_already_completed');
      return { success: true, message: 'Callback already processed' };
    }

    const successStatuses = ['SUCCESS', 'COMPLETED', 'PAID', 'APPROVED'];
    const failedStatuses = ['FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'EXPIRED', 'TIMEOUT', 'DECLINED'];

    if (successStatuses.includes(status)) {
      const audit = getWebhookAuditUpdate(callbackData, 'completed');
      const completedTransaction = await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: MUTABLE_TRANSACTION_STATUSES } },
        {
          $set: {
            ...audit.set,
            status: 'completed',
            providerTransactionId: transactionId,
            receiptNumber: callbackData.receipt_number || callbackData.receipt || transactionId,
            transactionDate: callbackData.timestamp ? new Date(callbackData.timestamp) : new Date()
          },
          $push: audit.push
        },
        { new: true }
      );

      if (!completedTransaction) {
        await recordDuplicateWebhook(transaction, callbackData, `terminal_state_${transaction.status}`);
        return { success: true, message: 'Callback already processed or transaction is terminal' };
      }

      await updateUserSubscription(completedTransaction.userId, completedTransaction.amount, completedTransaction, callbackData);
      return { success: true, message: 'Callback processed successfully' };
    }

    if (failedStatuses.includes(status)) {
      const reason = callbackData.message || `Payment ${status.toLowerCase()}`;
      const audit = getWebhookAuditUpdate(callbackData, 'failed', reason);
      await Transaction.findOneAndUpdate(
        { _id: transaction._id, status: { $in: MUTABLE_TRANSACTION_STATUSES } },
        {
          $set: {
            ...audit.set,
            status: 'failed',
            description: reason
          },
          $push: audit.push
        }
      );

      return { success: true, message: 'Callback processed successfully' };
    }

    const audit = getWebhookAuditUpdate(callbackData, 'received', `unhandled_status_${status}`);
    await Transaction.updateOne(
      { _id: transaction._id },
      {
        $set: audit.set,
        $push: audit.push
      }
    );

    return { success: true, message: 'Webhook recorded; status not terminal' };
  } catch (error) {
    console.error(`[PaymentService] ${provider} callback failed:`, error);
    return { success: false, message: error.message };
  }
};

/**
 * Update user subscription after successful payment
 * @param {string} userId - User ID
 * @param {number} amount - Payment amount
 * @returns {Promise<void>}
 */
const updateUserSubscription = async (userId, amount, transaction = null, gatewayResponse = null) => {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      console.error('[PaymentService] User not found for subscription update:', userId);
      return;
    }
    
    const { now, startDate, expiryDate } = getSubscriptionWindow(user);

    if (transaction?.transactionId) {
      let activationResult;

      try {
        // processedTransactionIds is the idempotency gate: duplicate webhooks for
        // the same provider transaction must not extend the user's subscription twice.
        activationResult = await Subscription.updateOne(
          {
            userId: userId.toString(),
            processedTransactionIds: { $ne: transaction.transactionId }
          },
          {
            $set: {
              status: 'active',
              paymentStatus: 'completed',
              paymentDate: now,
              startDate,
              expiryDate,
              amount,
              paymentMethod: getProviderPaymentMethod(transaction.provider),
              phoneNumber: transaction.phoneNumber || user.phoneNumber || 'not-provided',
              transactionId: transaction.transactionId,
              paymentGatewayResponse: gatewayResponse,
              webhookReceived: Boolean(gatewayResponse),
              webhookData: gatewayResponse,
              autoLocked: false,
              lockReason: null,
              updatedAt: now
            },
            $addToSet: {
              processedTransactionIds: transaction.transactionId
            },
            $push: {
              paymentHistory: {
                transactionId: transaction.transactionId,
                amount,
                paymentMethod: getProviderPaymentMethod(transaction.provider),
                status: 'completed',
                paymentDate: now,
                expiryDate
              }
            },
            $setOnInsert: { createdAt: now }
          },
          { upsert: true, setDefaultsOnInsert: true }
        );
      } catch (error) {
        if (error.code === 11000) {
          console.warn('[PaymentService] Duplicate subscription activation skipped:', transaction.transactionId);
          return;
        }
        throw error;
      }

      if (!activationResult.modifiedCount && !activationResult.upsertedCount) {
        console.warn('[PaymentService] Subscription activation already processed:', transaction.transactionId);
        return;
      }
    }

    // Update the user only after the subscription idempotency gate succeeds.
    user.premium = true;
    user.subscriptionExpiresAt = expiryDate;
    await user.save();
    
    console.log(`[PaymentService] Updated subscription for user ${userId} until ${expiryDate}`);
  } catch (error) {
    console.error('[PaymentService] Failed to update user subscription:', error);
  }
};

/**
 * Get user payment history
 * @param {string} userId - User ID
 * @param {number} limit - Limit number of results
 * @returns {Promise<Array>} Payment history
 */
const getUserPaymentHistory = async (userId, limit = 20) => {
  try {
    const transactions = await Transaction.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
    
    return transactions;
  } catch (error) {
    console.error('[PaymentService] Failed to get payment history:', error);
    throw error;
  }
};

/**
 * Process refund
 * @param {string} transactionId - Transaction ID to refund
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>} Refund result
 */
const processRefund = async (transactionId, reason) => {
  try {
    const transaction = await Transaction.findOne({ transactionId });
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    if (transaction.status !== 'completed') {
      throw new Error('Only completed transactions can be refunded');
    }
    
    // Generate refund transaction ID
    const refundTransactionId = `REFUND-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Create refund transaction
    const refundTransaction = await Transaction.create({
      userId: transaction.userId,
      provider: transaction.provider,
      type: 'refund',
      amount: transaction.amount,
      currency: transaction.currency,
      phoneNumber: transaction.phoneNumber,
      reference: `REFUND-${transaction.reference}`,
      description: `Refund for ${transaction.description}`,
      transactionId: refundTransactionId,
      status: 'pending'
    });
    
    // Mark original transaction as refunded
    transaction.markRefunded(refundTransactionId, reason);
    await transaction.save();
    
    // Note: Actual refund processing would need to be implemented
    // based on the payment provider's refund API
    
    return {
      success: true,
      refundTransactionId,
      message: 'Refund processed successfully'
    };
  } catch (error) {
    console.error('[PaymentService] Refund failed:', error);
    throw error;
  }
};

module.exports = {
  initiateMpesaPayment,
  initiateAirtelPayment,
  queryPaymentStatus,
  handleMpesaCallback,
  handleAirtelCallback,
  handleProviderStatusCallback,
  getUserPaymentHistory,
  processRefund
};
