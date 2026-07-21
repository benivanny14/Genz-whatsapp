const axios = require('axios');
const crypto = require('crypto');

// Airtel Money API Configuration
const AIRTEL_CONFIG = {
  clientId: process.env.AIRTEL_CLIENT_ID || '',
  clientSecret: process.env.AIRTEL_CLIENT_SECRET || '',
  environment: process.env.AIRTEL_ENVIRONMENT || 'sandbox', // sandbox or production
  countryCode: 'TZ',
  currency: 'TZS',
  callbackURL: process.env.AIRTEL_CALLBACK_URL || 'http://localhost:5000/api/payment/webhook/airtel'
};

// Airtel Money API URLs
const AIRTEL_URLS = {
  sandbox: {
    auth: 'https://openapi.airtel.africa/auth/oauth2/token',
    payment: 'https://openapi.airtel.africa/merchant/v1/payments'
  },
  production: {
    auth: 'https://openapi.airtel.africa/auth/oauth2/token',
    payment: 'https://openapi.airtel.africa/merchant/v1/payments'
  }
};

// Get Airtel Money access token
const getAirtelAccessToken = async () => {
  try {
    if (!AIRTEL_CONFIG.clientId || !AIRTEL_CONFIG.clientSecret) {
      throw new Error('Airtel Money API credentials not configured. Please set AIRTEL_CLIENT_ID and AIRTEL_CLIENT_SECRET environment variables.');
    }

    const response = await axios.post(AIRTEL_URLS[AIRTEL_CONFIG.environment].auth, {
      client_id: AIRTEL_CONFIG.clientId,
      client_secret: AIRTEL_CONFIG.clientSecret,
      grant_type: 'client_credentials'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.access_token;
  } catch (error) {
    console.error('Error getting Airtel Money access token:', error);
    throw new Error('Failed to get Airtel Money access token');
  }
};

// Initiate Airtel Money payment
const initiateAirtelPayment = async (phoneNumber, amount, transactionId) => {
  try {
    const accessToken = await getAirtelAccessToken();

    // Format phone number (remove leading 0 or 255, add 255)
    let formattedPhone = phoneNumber.replace(/^0/, '255');
    if (!formattedPhone.startsWith('255')) {
      formattedPhone = '255' + formattedPhone;
    }

    const paymentRequest = {
      transaction: {
        id: transactionId,
        amount: amount,
        currency: AIRTEL_CONFIG.currency
      },
      payer: {
        country: AIRTEL_CONFIG.countryCode,
        msisdn: formattedPhone
      },
      payee: {
        country: AIRTEL_CONFIG.countryCode,
        msisdn: '0639533428' // Receiver number
      },
      transaction_type: 'MERCHANT_PAYMENT'
    };

    const response = await axios.post(
      AIRTEL_URLS[AIRTEL_CONFIG.environment].payment,
      paymentRequest,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Country': AIRTEL_CONFIG.countryCode,
          'X-Currency': AIRTEL_CONFIG.currency
        }
      }
    );

    return {
      success: true,
      transactionId: response.data.transaction.id,
      status: response.data.transaction.status,
      message: response.data.status.message
    };
  } catch (error) {
    console.error('Error initiating Airtel Money payment:', error);
    throw new Error('Failed to initiate Airtel Money payment');
  }
};

// Verify Airtel Money payment status
const verifyAirtelPayment = async (transactionId) => {
  try {
    const accessToken = await getAirtelAccessToken();

    const response = await axios.get(
      `${AIRTEL_URLS[AIRTEL_CONFIG.environment].payment}/${transactionId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Country': AIRTEL_CONFIG.countryCode,
          'X-Currency': AIRTEL_CONFIG.currency
        }
      }
    );

    return {
      success: true,
      transactionId: response.data.transaction.id,
      status: response.data.transaction.status,
      amount: response.data.transaction.amount,
      currency: response.data.transaction.currency
    };
  } catch (error) {
    console.error('Error verifying Airtel Money payment:', error);
    throw new Error('Failed to verify Airtel Money payment');
  }
};

module.exports = {
  initiateAirtelPayment,
  verifyAirtelPayment
};
