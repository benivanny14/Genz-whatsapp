const axios = require('axios');
const crypto = require('crypto');

// M-Pesa Daraja API Configuration
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || '',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || '',
  passkey: process.env.MPESA_PASSKEY || '',
  shortcode: process.env.MPESA_SHORTCODE || '',
  environment: process.env.MPESA_ENVIRONMENT || 'sandbox', // sandbox or production
  callbackURL: process.env.MPESA_CALLBACK_URL || 'http://localhost:5000/api/payment/webhook/mpesa'
};

// M-Pesa Daraja API URLs
const MPESA_URLS = {
  sandbox: {
    auth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkpush: 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
  },
  production: {
    auth: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
    stkpush: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
  }
};

// Generate M-Pesa timestamp
const generateTimestamp = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hour}${minute}${second}`;
};

// Generate M-Pesa password
const generatePassword = (shortcode, passkey, timestamp) => {
  const data = `${shortcode}${passkey}${timestamp}`;
  return Buffer.from(data).toString('base64');
};

// Get M-Pesa access token
const getMpesaAccessToken = async () => {
  try {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    const response = await axios.get(MPESA_URLS[MPESA_CONFIG.environment].auth, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting M-Pesa access token:', error);
    throw new Error('Failed to get M-Pesa access token');
  }
};

// Initiate M-Pesa STK Push
const initiateMpesaPayment = async (phoneNumber, amount, transactionId) => {
  try {
    // Validate configuration
    if (!MPESA_CONFIG.consumerKey || !MPESA_CONFIG.consumerSecret || !MPESA_CONFIG.passkey || !MPESA_CONFIG.shortcode) {
      throw new Error('M-Pesa API credentials not configured. Please set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_PASSKEY, and MPESA_SHORTCODE environment variables.');
    }

    const accessToken = await getMpesaAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(MPESA_CONFIG.shortcode, MPESA_CONFIG.passkey, timestamp);

    // Format phone number (remove leading 0 or 255, add 254)
    let formattedPhone = phoneNumber.replace(/^0/, '254');
    if (formattedPhone.startsWith('255')) {
      formattedPhone = '254' + formattedPhone.substring(3);
    }

    const stkPushRequest = {
      BusinessShortCode: MPESA_CONFIG.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: MPESA_CONFIG.shortcode,
      PhoneNumber: formattedPhone,
      CallBackURL: `${MPESA_CONFIG.callbackURL}?transactionId=${transactionId}`,
      AccountReference: 'GENZ_PREMIUM',
      TransactionDesc: 'Premium Subscription Payment'
    };

    const response = await axios.post(MPESA_URLS[MPESA_CONFIG.environment].stkpush, stkPushRequest, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      merchantRequestID: response.data.MerchantRequestID,
      checkoutRequestID: response.data.CheckoutRequestID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription,
      customerMessage: response.data.CustomerMessage
    };
  } catch (error) {
    console.error('Error initiating M-Pesa payment:', error);
    throw new Error('Failed to initiate M-Pesa payment');
  }
};

// Verify M-Pesa payment status
const verifyMpesaPayment = async (checkoutRequestID) => {
  try {
    const accessToken = await getMpesaAccessToken();
    
    const response = await axios.post(
      `${MPESA_URLS[MPESA_CONFIG.environment].stkpush.replace('processrequest', 'query')}`,
      {
        BusinessShortCode: MPESA_CONFIG.shortcode,
        Password: generatePassword(MPESA_CONFIG.shortcode, MPESA_CONFIG.passkey, generateTimestamp()),
        Timestamp: generateTimestamp(),
        CheckoutRequestID: checkoutRequestID
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      resultCode: response.data.ResultCode,
      resultDesc: response.data.ResultDesc,
      callbackMetadata: response.data.CallbackMetadata
    };
  } catch (error) {
    console.error('Error verifying M-Pesa payment:', error);
    throw new Error('Failed to verify M-Pesa payment');
  }
};

module.exports = {
  initiateMpesaPayment,
  verifyMpesaPayment
};
