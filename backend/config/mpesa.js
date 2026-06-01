const crypto = require('crypto');
const axios = require('axios');

/**
 * M-Pesa Daraja API Configuration
 * Handles M-Pesa STK Push, C2B, and B2C operations
 */

/**
 * Generate M-Pesa authentication token
 * @returns {Promise<string>} Access token
 */
const generateAuthToken = async () => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

  if (!consumerKey || !consumerSecret) {
    throw new Error('M-Pesa credentials not configured');
  }

  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  try {
    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'live' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';

    const response = await axios.get(
      `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`
        }
      }
    );

    return response.data.access_token;
  } catch (error) {
    console.error('[M-Pesa] Failed to generate auth token:', error);
    throw new Error('Failed to generate M-Pesa auth token');
  }
};

/**
 * Generate password for STK Push
 * @returns {string} Base64 encoded password
 */
const generatePassword = () => {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);

  if (!shortcode || !passkey) {
    throw new Error('M-Pesa shortcode or passkey not configured');
  }

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  return { password, timestamp };
};

/**
 * Initiate STK Push (Lipa na M-Pesa Online)
 * @param {string} phoneNumber - Customer phone number (format: 254XXXXXXXXX)
 * @param {number} amount - Amount to charge
 * @param {string} accountReference - Account reference
 * @param {string} transactionDesc - Transaction description
 * @returns {Promise<Object>} STK Push response
 */
const initiateSTKPush = async (phoneNumber, amount, accountReference, transactionDesc) => {
  try {
    const token = await generateAuthToken();
    const { password, timestamp } = generatePassword();

    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'live' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';

    const callbackUrl = process.env.MPESA_CALLBACK_URL || `${process.env.PUBLIC_API_URL}/api/payment/webhook/mpesa`;

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc
    };

    const response = await axios.post(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[M-Pesa] STK Push failed:', error);
    throw new Error(error.response?.data?.errorMessage || 'STK Push failed');
  }
};

/**
 * Query STK Push status
 * @param {string} checkoutRequestID - Checkout request ID from STK Push
 * @returns {Promise<Object>} Query response
 */
const querySTKPushStatus = async (checkoutRequestID) => {
  try {
    const token = await generateAuthToken();
    const { password, timestamp } = generatePassword();

    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    const baseUrl = environment === 'live' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';

    const payload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestID
    };

    const response = await axios.post(
      `${baseUrl}/mpesa/stkpushquery/v1/query`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    console.error('[M-Pesa] Query STK Push status failed:', error);
    throw new Error(error.response?.data?.errorMessage || 'Query failed');
  }
};

/**
 * Validate M-Pesa callback signature
 * @param {string} signature - Signature from callback
 * @param {string} payload - Callback payload
 * @returns {boolean} True if signature is valid
 */
const validateCallbackSignature = (signature, payload) => {
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!callbackUrl || !signature) {
    return false;
  }

  try {
    const secret = process.env.MPESA_CONSUMER_SECRET;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(callbackUrl + payload)
      .digest('base64');

    return computedSignature === signature;
  } catch (error) {
    console.error('[M-Pesa] Signature validation failed:', error);
    return false;
  }
};

/**
 * Format phone number to M-Pesa format
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
 * Parse M-Pesa callback response
 * @param {Object} callbackData - Callback data from M-Pesa
 * @returns {Object} Parsed transaction data
 */
const parseCallback = (callbackData) => {
  const { Body } = callbackData;
  const { stkCallback } = Body;
  const { CallbackMetadata } = stkCallback;
  const Item = CallbackMetadata?.Item || [];

  const metadata = {};
  Item.forEach(item => {
    metadata[item.Name] = item.Value;
  });

  return {
    merchantRequestID: stkCallback.MerchantRequestID,
    checkoutRequestID: stkCallback.CheckoutRequestID,
    resultCode: String(stkCallback.ResultCode),
    resultDesc: stkCallback.ResultDesc,
    amount: parseFloat(metadata.Amount),
    mpesaReceiptNumber: metadata.MpesaReceiptNumber,
    transactionDate: metadata.TransactionDate,
    phoneNumber: metadata.PhoneNumber
  };
};

module.exports = {
  generateAuthToken,
  generatePassword,
  initiateSTKPush,
  querySTKPushStatus,
  validateCallbackSignature,
  formatPhoneNumber,
  parseCallback
};
