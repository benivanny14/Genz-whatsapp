const axios = require('axios');
require('dotenv').config();

/**
 * PesaPal Payment Service
 * Handles PesaPal payment integration for GENZ WhatsApp
 */

const PESAPAL_BASE_URL = process.env.PESAPAL_BASE_URL || 'https://cyb.pesapal.com/pesapalv3';
const PESAPAL_CONSUMER_KEY = process.env.PESAPAL_CONSUMER_KEY;
const PESAPAL_CONSUMER_SECRET = process.env.PESAPAL_CONSUMER_SECRET;

let authToken = null;
let tokenExpiry = null;

/**
 * Get PesaPal Auth Token
 * @returns {Promise<string>} Auth token
 */
const getPesapalAuthToken = async () => {
  try {
    // Check if token is still valid (with 5 minute buffer)
    if (authToken && tokenExpiry && Date.now() < tokenExpiry - 5 * 60 * 1000) {
      console.log('[PesaPal] Using cached token');
      return authToken;
    }

    console.log('[PesaPal] Requesting new auth token...');
    
    const response = await axios.post(`${PESAPAL_BASE_URL}/api/Auth/RegisterConsumer`, {
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (response.data && response.data.token) {
      authToken = response.data.token;
      // Token expires in 30 minutes (1800000 ms)
      tokenExpiry = Date.now() + 30 * 60 * 1000;
      console.log('[PesaPal] Token obtained successfully!');
      return authToken;
    } else {
      throw new Error('No token in response');
    }
  } catch (error) {
    console.error('[PesaPal] Error getting auth token:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get PesaPal auth token');
  }
};

/**
 * Submit Order Request (Create Payment Link)
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} Payment link result
 */
const submitOrderRequest = async (orderData) => {
  try {
    const token = await getPesapalAuthToken();
    
    const response = await axios.post(`${PESAPAL_BASE_URL}/api/Transactions/SubmitOrderRequest`, orderData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data) {
      console.log('[PesaPal] Order submitted successfully:', response.data);
      return response.data;
    } else {
      throw new Error('No response data');
    }
  } catch (error) {
    console.error('[PesaPal] Error submitting order:', error.response ? error.response.data : error.message);
    throw new Error('Failed to submit order to PesaPal');
  }
};

/**
 * Get Transaction Status
 * @param {string} orderTrackingId - Order tracking ID
 * @returns {Promise<Object>} Transaction status
 */
const getTransactionStatus = async (orderTrackingId) => {
  try {
    const token = await getPesapalAuthToken();
    
    const response = await axios.get(
      `${PESAPAL_BASE_URL}/api/Transactions/GetTransactionStatus?orderTrackingId=${orderTrackingId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.data) {
      console.log('[PesaPal] Transaction status:', response.data);
      return response.data;
    } else {
      throw new Error('No response data');
    }
  } catch (error) {
    console.error('[PesaPal] Error getting transaction status:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get transaction status from PesaPal');
  }
};

/**
 * Format order data for PesaPal
 * @param {Object} paymentDetails - Payment details
 * @returns {Object} Formatted order data
 */
const formatOrderData = (paymentDetails) => {
  return {
    id: paymentDetails.id || `GENZ-${Date.now()}`,
    currency: paymentDetails.currency || 'TZS',
    amount: paymentDetails.amount,
    description: paymentDetails.description || 'GENZ WhatsApp Premium Subscription',
    callback_url: paymentDetails.callbackUrl || `${process.env.PUBLIC_API_URL}/api/payments/pesapal/callback`,
    cancellation_url: paymentDetails.cancellationUrl || `${process.env.FRONTEND_URL}/payment/cancelled`,
    notification_id: paymentDetails.notificationId || paymentDetails.phoneNumber,
    billing_address: {
      email_address: paymentDetails.email || '',
      phone_number: paymentDetails.phoneNumber || '',
      country_code: paymentDetails.countryCode || 'TZ',
      first_name: paymentDetails.firstName || '',
      last_name: paymentDetails.lastName || ''
    }
  };
};

module.exports = {
  getPesapalAuthToken,
  submitOrderRequest,
  getTransactionStatus,
  formatOrderData
};
