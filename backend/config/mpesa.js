const crypto = require('crypto');
const axios = require('axios');

/**
 * M-Pesa Vodacom Tanzania OpenAPI Configuration
 * Handles C2B Single Stage (USSD Push) mapping to the Daraja abstraction used by the app.
 */

/**
 * Encrypt API Key with RSA Public Key
 */
const encryptAPIKey = (apiKey, publicKey) => {
    let formattedKey = publicKey;
    // Add PEM headers if missing
    if (!formattedKey.includes('BEGIN PUBLIC KEY')) {
        formattedKey = `-----BEGIN PUBLIC KEY-----\n${publicKey.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
    }
    const buffer = Buffer.from(apiKey);
    const encrypted = crypto.publicEncrypt({
        key: formattedKey,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, buffer);
    return encrypted.toString('base64');
};

const getBaseUrl = () => {
    const environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    return environment === 'live' 
      ? 'https://openapi.m-pesa.com/openapi/ipg/v2/vodacomTZN' 
      : 'https://openapi.m-pesa.com/sandbox/ipg/v2/vodacomTZN';
};

/**
 * Generate Session ID from OpenAPI
 */
const getSessionId = async () => {
    const apiKey = process.env.MPESA_API_KEY;
    const publicKey = process.env.MPESA_PUBLIC_KEY;
    
    if (!apiKey || !publicKey) {
        throw new Error('Vodacom OpenAPI credentials not configured. Set MPESA_API_KEY and MPESA_PUBLIC_KEY.');
    }

    const encryptedKey = encryptAPIKey(apiKey, publicKey);
    
    const response = await axios.get(`${getBaseUrl()}/getSession/`, {
        headers: {
            'Authorization': `Bearer ${encryptedKey}`,
            'Origin': process.env.PUBLIC_API_URL || '*'
        }
    });

    if (response.data.output_ResponseCode !== 'INS-0') {
        throw new Error(response.data.output_ResponseDesc || 'Failed to get session ID');
    }

    return response.data.output_SessionID;
};

/**
 * Format phone number to Tanzania 255 format
 */
const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    let formatted = String(phone).replace(/\D/g, '');
    
    if (formatted.startsWith('0')) {
        formatted = '255' + formatted.substring(1);
    } else if (formatted.startsWith('254')) {
        // Fallback incase old code passed Daraja format
        formatted = '255' + formatted.substring(3);
    }
    if (!formatted.startsWith('255')) {
        formatted = '255' + formatted;
    }
    
    return formatted;
};

/**
 * Initiate C2B Single Stage (Equivalent to STK Push)
 */
const initiateSTKPush = async (phoneNumber, amount, accountReference, transactionDesc) => {
    try {
        const sessionId = await getSessionId();
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const thirdPartyId = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString();

        const payload = {
            input_Amount: amount.toString(),
            input_Country: 'TZN',
            input_Currency: 'TZS',
            input_CustomerMSISDN: formattedPhone, 
            input_ServiceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE || '000000',
            input_ThirdPartyConversationID: thirdPartyId,
            input_TransactionReference: accountReference.substring(0, 20),
            input_PurchasedItemsDesc: transactionDesc.substring(0, 50)
        };

        const response = await axios.post(`${getBaseUrl()}/c2bPayment/singleStage/`, payload, {
            headers: {
                'Authorization': `Bearer ${sessionId}`,
                'Content-Type': 'application/json',
                'Origin': process.env.PUBLIC_API_URL || '*'
            }
        });

        if (response.data.output_ResponseCode !== 'INS-0') {
            throw new Error(response.data.output_ResponseDesc);
        }

        // Map OpenAPI response back to Daraja style so paymentService.js doesn't break
        return {
            success: true,
            data: {
                CheckoutRequestID: response.data.output_TransactionID || thirdPartyId,
                MerchantRequestID: response.data.output_ConversationID || thirdPartyId,
                ResponseCode: response.data.output_ResponseCode,
                ResponseDescription: response.data.output_ResponseDesc
            }
        };
    } catch (error) {
        console.error('[M-Pesa] Payment Push failed:', error.response?.data || error);
        throw new Error(error.response?.data?.output_ResponseDesc || error.message || 'M-Pesa payment failed');
    }
};

/**
 * Query Transaction Status
 */
const querySTKPushStatus = async (checkoutRequestID) => {
    try {
        const sessionId = await getSessionId();
        
        const payload = {
            input_QueryReference: checkoutRequestID,
            input_ServiceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE || '000000',
            input_ThirdPartyConversationID: crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Date.now().toString(),
            input_Country: 'TZN'
        };

        const response = await axios.post(`${getBaseUrl()}/queryTransactionStatus/`, payload, {
            headers: {
                'Authorization': `Bearer ${sessionId}`,
                'Content-Type': 'application/json',
                'Origin': process.env.PUBLIC_API_URL || '*'
            }
        });

        const isSuccess = response.data.output_ResponseTransactionStatus === 'Completed';
        
        return {
            success: isSuccess,
            data: {
                ResultCode: isSuccess ? '0' : '1',
                ResultDesc: response.data.output_ResponseDesc || response.data.output_ResponseTransactionStatus
            }
        };
    } catch (error) {
        return {
            success: false,
            data: { ResultCode: '1', ResultDesc: error.message }
        };
    }
};

const metadataItemValue = (items = [], name) => {
    const item = items.find((entry) => entry?.Name === name);
    return item?.Value ?? '';
};

/**
 * Parse Webhook Callback
 */
const parseCallback = (payload = {}) => {
    const body = payload.body || payload;
    const stkCallback = body.Body?.stkCallback || body.stkCallback;

    if (stkCallback) {
        const metadataItems = stkCallback.CallbackMetadata?.Item || [];
        const resultCode = String(stkCallback.ResultCode ?? '');

        return {
            isSuccess: resultCode === '0',
            resultCode,
            resultDesc: stkCallback.ResultDesc || '',
            amount: Number(metadataItemValue(metadataItems, 'Amount') || 0),
            mpesaReceiptNumber: metadataItemValue(metadataItems, 'MpesaReceiptNumber'),
            merchantRequestID: stkCallback.MerchantRequestID || '',
            checkoutRequestID: stkCallback.CheckoutRequestID || '',
            transactionDate: metadataItemValue(metadataItems, 'TransactionDate'),
            phoneNumber: String(metadataItemValue(metadataItems, 'PhoneNumber') || '')
        };
    }

    const transactionId = body.output_TransactionID || body.input_TransactionID || body.TransactionID || '';
    const conversationId = body.output_ConversationID || body.ConversationID || '';
    const thirdPartyId = body.input_ThirdPartyConversationID || '';
    const amount = body.input_Amount || body.Amount || 0;
    const responseCode = body.output_ResponseCode || body.ResultCode || '';
    const resultCode = responseCode === 'INS-0' || responseCode === '0' ? '0' : String(responseCode || '1');

    return {
        isSuccess: resultCode === '0',
        resultCode,
        resultDesc: body.output_ResponseDesc || body.ResultDesc || 'Success',
        amount: Number(amount),
        mpesaReceiptNumber: transactionId,
        merchantRequestID: conversationId || thirdPartyId || '',
        checkoutRequestID: transactionId || thirdPartyId || conversationId || '',
        transactionDate: body.TransactionDate || body.input_TransactionDate || '',
        phoneNumber: String(body.input_CustomerMSISDN || body.MSISDN || body.PhoneNumber || '')
    };
};

module.exports = {
    initiateSTKPush,
    querySTKPushStatus,
    formatPhoneNumber,
    parseCallback
};
