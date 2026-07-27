const crypto = require('crypto');
const axios = require('axios');

/**
 * Airtel Money API Configuration
 * Handles Airtel Money payment operations
 */

/**
 * Generate Airtel authentication token
 * @returns {Promise<string>} Access token
 */
const generateAuthToken = async () => {
  const clientId = process.env.AIRTEL_CLIENT_ID;
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Airtel credentials not configured');
  }

  try {
    const environment = process.env.AIRTEL_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'live' 
      ? 'https://openapi.airtel.africa' 
      : 'https://openapi.airtel.africa';

    const response = await axios.post(
      `${baseUrl}/auth/oauth2/token`,
      {
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('[Airtel] Failed to generate auth token:', error);
    throw new Error('Failed to generate Airtel auth token');
  }
};

/**
 * Initiate Airtel Money payment
 * @param {string} phoneNumber - Customer phone number (format: 254XXXXXXXXX)
 * @param {number} amount - Amount to charge
 * @param {string} reference - Transaction reference
 * @param {string} transactionId - Unique transaction ID
 * @returns {Promise<Object>} Payment response
 */
const initiatePayment = async (phoneNumber, amount, reference, transactionId) => {
  try {
    const token = await generateAuthToken();

    const environment = process.env.AIRTEL_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'live' 
      ? 'https://openapi.airtel.africa' 
      : 'https://openapi.airtel.africa';

    const country = process.env.AIRTEL_COUNTRY || 'TZ';
    const currency = process.env.AIRTEL_CURRENCY || 'TZS';
    const callbackUrl = process.env.AIRTEL_CALLBACK_URL || `${process.env.PUBLIC_API_URL}/api/payment/webhook/airtel`;

    const payload = {
      country: country,
      currency: currency,
      amount: amount.toString(),
      phone: phoneNumber,
      external_id: transactionId,
      transaction_id: transactionId,
      callback_url: callbackUrl,
      reference: reference
    };

    const response = await axios.post(
      `${baseUrl}/standard/v1/disbursements`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Callback-URL': callbackUrl
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Airtel] Payment initiation failed:', error);
    throw new Error(error.response?.data?.message || 'Payment initiation failed');
  }
};

/**
 * Query Airtel transaction status
 * @param {string} transactionId - Transaction ID
 * @returns {Promise<Object>} Query response
 */
const queryTransactionStatus = async (transactionId) => {
  try {
    const token = await generateAuthToken();

    const environment = process.env.AIRTEL_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'live' 
      ? 'https://openapi.airtel.africa' 
      : 'https://openapi.airtel.africa';

    const country = process.env.AIRTEL_COUNTRY || 'TZ';
    const currency = process.env.AIRTEL_CURRENCY || 'TZS';

    const response = await axios.get(
      `${baseUrl}/standard/v1/disbursements/${transactionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        params: {
          country,
          currency
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[Airtel] Query transaction status failed:', error);
    throw new Error(error.response?.data?.message || 'Query failed');
  }
};

/**
 * Validate Airtel callback signature
 * @param {string} signature - Signature from callback
 * @param {string} payload - Callback payload
 * @returns {boolean} True if signature is valid
 */
const validateCallbackSignature = (signature, payload) => {
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET;
  if (!clientSecret || !signature) {
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac('sha256', clientSecret)
      .update(payload)
      .digest('base64');

    return computedSignature === signature;
  } catch (error) {
    console.error('[Airtel] Signature validation failed:', error);
    return false;
  }
};

/**
 * Format phone number to Airtel format
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
const formatPhoneNumber = (phone) => {
  // Remove all non-digit characters
  let formatted = phone.replace(/\D/g, '');

  // If starts with 0, replace with 254
  if (formatted.startsWith('0')) {
    formatted = '254' + formatted.slice(1);
  }
  // If starts with +, remove it and add 254 if not already present
  else if (formatted.startsWith('+')) {
    formatted = formatted.slice(1);
    if (!formatted.startsWith('254')) {
      formatted = '254' + formatted;
    }
  }
  // If starts with 7 or 1 (Kenya codes), add 254
  else if (formatted.startsWith('7') || formatted.startsWith('1')) {
    formatted = '254' + formatted;
  }

  return formatted;
};

/**
 * Parse Airtel callback response
 * @param {Object} callbackData - Callback data from Airtel
 * @returns {Object} Parsed transaction data
 */
const parseCallback = (callbackData) => {
  const transaction = callbackData.transaction || {};

  return {
    transactionId: callbackData.transaction_id || transaction.transaction_id,
    externalId: callbackData.external_id || transaction.external_id || transaction.transaction_id,
    status: callbackData.status || transaction.status,
    amount: parseFloat(callbackData.amount || transaction.amount),
    currency: callbackData.currency || transaction.currency,
    phoneNumber: callbackData.phone || transaction.phone,
    reference: callbackData.reference || transaction.reference,
    message: callbackData.message || transaction.message
  };
};

module.exports = {
  generateAuthToken,
  initiatePayment,
  queryTransactionStatus,
  validateCallbackSignature,
  formatPhoneNumber,
  parseCallback
};
