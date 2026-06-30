const axios = require('axios');
const crypto = require('crypto');

// HaloPesa API Configuration
const HALOPESA_CONFIG = {
  apiKey: process.env.HALOPESA_API_KEY || '',
  merchantId: process.env.HALOPESA_MERCHANT_ID || '',
  secretKey: process.env.HALOPESA_SECRET_KEY || '',
  environment: process.env.HALOPESA_ENVIRONMENT || 'sandbox', // sandbox or production
  callbackURL: process.env.HALOPESA_CALLBACK_URL || 'http://localhost:5000/api/payment/webhook/halopesa'
};

// HaloPesa API URLs
const HALOPESA_URLS = {
  sandbox: {
    payment: 'https://sandbox.halopesa.co.tz/api/v1/payments'
  },
  production: {
    payment: 'https://api.halopesa.co.tz/api/v1/payments'
  }
};

// Generate HaloPesa signature
const generateHalopesaSignature = (merchantId, apiKey, transactionId, amount, phoneNumber) => {
  const data = `${merchantId}${apiKey}${transactionId}${amount}${phoneNumber}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Initiate HaloPesa payment
const initiateHalopesaPayment = async (phoneNumber, amount, transactionId) => {
  try {
    if (!HALOPESA_CONFIG.apiKey || !HALOPESA_CONFIG.merchantId || !HALOPESA_CONFIG.secretKey) {
      throw new Error('HaloPesa API credentials not configured. Please set HALOPESA_API_KEY, HALOPESA_MERCHANT_ID, and HALOPESA_SECRET_KEY environment variables.');
    }

    // Format phone number (remove leading 0 or 255, add 255)
    let formattedPhone = phoneNumber.replace(/^0/, '255');
    if (!formattedPhone.startsWith('255')) {
      formattedPhone = '255' + formattedPhone;
    }

    const signature = generateHalopesaSignature(
      HALOPESA_CONFIG.merchantId,
      HALOPESA_CONFIG.apiKey,
      transactionId,
      amount,
      formattedPhone
    );

    const paymentRequest = {
      merchant_id: HALOPESA_CONFIG.merchantId,
      transaction_id: transactionId,
      amount: amount,
      currency: 'TZS',
      phone_number: formattedPhone,
      receiver_number: '0639533428',
      signature: signature,
      callback_url: `${HALOPESA_CONFIG.callbackURL}?transactionId=${transactionId}`
    };

    const response = await axios.post(
      HALOPESA_URLS[HALOPESA_CONFIG.environment].payment,
      paymentRequest,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': HALOPESA_CONFIG.apiKey
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
    console.error('Error initiating HaloPesa payment:', error);
    throw new Error('Failed to initiate HaloPesa payment');
  }
};

// Verify HaloPesa payment status
const verifyHalopesaPayment = async (transactionId) => {
  try {
    const response = await axios.get(
      `${HALOPESA_URLS[HALOPESA_CONFIG.environment].payment}/${transactionId}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': HALOPESA_CONFIG.apiKey
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
    console.error('Error verifying HaloPesa payment:', error);
    throw new Error('Failed to verify HaloPesa payment');
  }
};

module.exports = {
  initiateHalopesaPayment,
  verifyHalopesaPayment
};
