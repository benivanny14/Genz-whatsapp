const axios = require('axios');
const crypto = require('crypto');

// Yas API Configuration
const YAS_CONFIG = {
  apiKey: process.env.YAS_API_KEY || '',
  merchantId: process.env.YAS_MERCHANT_ID || '',
  secretKey: process.env.YAS_SECRET_KEY || '',
  environment: process.env.YAS_ENVIRONMENT || 'sandbox', // sandbox or production
  callbackURL: process.env.YAS_CALLBACK_URL || 'http://localhost:5000/api/payment/webhook/yas'
};

// Yas API URLs
const YAS_URLS = {
  sandbox: {
    payment: 'https://sandbox.yas.co.tz/api/v1/payments'
  },
  production: {
    payment: 'https://api.yas.co.tz/api/v1/payments'
  }
};

// Generate Yas signature
const generateYasSignature = (merchantId, apiKey, transactionId, amount, phoneNumber) => {
  const data = `${merchantId}${apiKey}${transactionId}${amount}${phoneNumber}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Initiate Yas payment
const initiateYasPayment = async (phoneNumber, amount, transactionId) => {
  try {
    if (!YAS_CONFIG.apiKey || !YAS_CONFIG.merchantId || !YAS_CONFIG.secretKey) {
      throw new Error('Yas API credentials not configured. Please set YAS_API_KEY, YAS_MERCHANT_ID, and YAS_SECRET_KEY environment variables.');
    }

    // Format phone number (remove leading 0 or 255, add 255)
    let formattedPhone = phoneNumber.replace(/^0/, '255');
    if (!formattedPhone.startsWith('255')) {
      formattedPhone = '255' + formattedPhone;
    }

    const signature = generateYasSignature(
      YAS_CONFIG.merchantId,
      YAS_CONFIG.apiKey,
      transactionId,
      amount,
      formattedPhone
    );

    const paymentRequest = {
      merchant_id: YAS_CONFIG.merchantId,
      transaction_id: transactionId,
      amount: amount,
      currency: 'TZS',
      phone_number: formattedPhone,
      receiver_number: '0639533428',
      signature: signature,
      callback_url: `${YAS_CONFIG.callbackURL}?transactionId=${transactionId}`
    };

    const response = await axios.post(
      YAS_URLS[YAS_CONFIG.environment].payment,
      paymentRequest,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': YAS_CONFIG.apiKey
        }
      }
    );

    return {
      success: true,
      transactionId: response.data.transaction_id,
      status: response.data.status,
      message: response.data.message
    };
  } catch (error) {
    console.error('Error initiating Yas payment:', error);
    throw new Error('Failed to initiate Yas payment');
  }
};

// Verify Yas payment status
const verifyYasPayment = async (transactionId) => {
  try {
    const response = await axios.get(
      `${YAS_URLS[YAS_CONFIG.environment].payment}/${transactionId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': YAS_CONFIG.apiKey
        }
      }
    );

    return {
      success: true,
      transactionId: response.data.transaction_id,
      status: response.data.status,
      amount: response.data.amount,
      currency: response.data.currency
    };
  } catch (error) {
    console.error('Error verifying Yas payment:', error);
    throw new Error('Failed to verify Yas payment');
  }
};

module.exports = {
  initiateYasPayment,
  verifyYasPayment
};
