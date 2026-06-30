const crypto = require('crypto');

// Webhook secret keys (should be in environment variables)
const WEBHOOK_SECRETS = {
  mpesa: process.env.MPESA_WEBHOOK_SECRET || '',
  airtel: process.env.AIRTEL_WEBHOOK_SECRET || '',
  yas: process.env.YAS_WEBHOOK_SECRET || '',
  halopesa: process.env.HALOPESA_WEBHOOK_SECRET || ''
};

// IP whitelist for payment providers (optional security)
const IP_WHITELIST = {
  mpesa: process.env.MPESA_IP_WHITELIST ? process.env.MPESA_IP_WHITELIST.split(',') : [],
  airtel: process.env.AIRTEL_IP_WHITELIST ? process.env.AIRTEL_IP_WHITELIST.split(',') : [],
  yas: process.env.YAS_IP_WHITELIST ? process.env.YAS_IP_WHITELIST.split(',') : [],
  halopesa: process.env.HALOPESA_IP_WHITELIST ? process.env.HALOPESA_IP_WHITELIST.split(',') : []
};

// Timestamp validation - reject requests older than 5 minutes
const validateTimestamp = (req, res, next) => {
  try {
    const timestampHeader = req.headers['x-timestamp'] || req.headers['timestamp'];
    
    if (!timestampHeader) {
      console.warn('Webhook request missing timestamp header');
      if (process.env.NODE_ENV === 'production' || process.env.ALLOW_REAL_PAYMENT_PROVIDERS === 'true') {
        return res.status(401).json({ success: false, message: 'Missing timestamp' });
      }
      return next();
    }

    const requestTimestamp = parseInt(timestampHeader);
    const currentTimestamp = Date.now();
    const timeDifference = currentTimestamp - requestTimestamp;

    // Reject requests older than 5 minutes (300,000 ms)
    if (timeDifference > 300000 || timeDifference < -300000) {
      console.error(`Webhook timestamp validation failed. Time difference: ${timeDifference}ms`);
      return res.status(401).json({ success: false, message: 'Invalid timestamp' });
    }

    next();
  } catch (error) {
    console.error('Error validating webhook timestamp:', error);
    res.status(401).json({ success: false, message: 'Timestamp validation failed' });
  }
};

// IP whitelist validation
const validateIPWhitelist = (provider) => {
  return (req, res, next) => {
    try {
      const whitelist = IP_WHITELIST[provider];
      
      if (!whitelist || whitelist.length === 0) {
        // No whitelist configured, allow request
        return next();
      }

      const clientIP = req.ip || req.connection.remoteAddress;
      
      if (!whitelist.includes(clientIP)) {
        console.error(`Webhook IP validation failed for ${provider}. Client IP: ${clientIP}`);
        return res.status(403).json({ success: false, message: 'IP not whitelisted' });
      }

      next();
    } catch (error) {
      console.error('Error validating webhook IP:', error);
      res.status(403).json({ success: false, message: 'IP validation failed' });
    }
  };
};

// Verify HMAC-SHA256 signature
const verifyHMACSignature = (payload, signature, secret) => {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }
  
  // Use timing-safe comparison to prevent timing attacks
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
};

const shouldRequireSignature = (provider) => (
  process.env.NODE_ENV !== 'test' && (
    process.env.NODE_ENV === 'production' ||
    process.env.ALLOW_REAL_PAYMENT_PROVIDERS === 'true' ||
    Boolean(WEBHOOK_SECRETS[provider])
  )
);

const getPayloadForSignature = (req) => req.rawBody || JSON.stringify(req.body);

// Verify M-Pesa webhook signature
const verifyMpesaSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-mpesa-signature'] || req.headers['signature'];
    
    if (shouldRequireSignature('mpesa')) {
      if (!WEBHOOK_SECRETS.mpesa) {
        console.error('M-Pesa webhook secret is not configured');
        return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
      }

      if (!signature) {
        console.error('M-Pesa webhook missing signature');
        return res.status(401).json({ success: false, message: 'Missing signature' });
      }

      const payload = getPayloadForSignature(req);
      
      try {
        const isValid = verifyHMACSignature(payload, signature, WEBHOOK_SECRETS.mpesa);
        
        if (!isValid) {
          console.error('Invalid M-Pesa webhook signature');
          return res.status(401).json({ success: false, message: 'Invalid signature' });
        }
      } catch (signatureError) {
        console.error('M-Pesa signature verification error:', signatureError);
        return res.status(401).json({ success: false, message: 'Signature verification failed' });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error verifying M-Pesa webhook signature:', error);
    res.status(401).json({ success: false, message: 'Signature verification failed' });
  }
};

// Verify Airtel Money webhook signature
const verifyAirtelSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-airtel-signature'] || req.headers['signature'];
    
    if (shouldRequireSignature('airtel')) {
      if (!WEBHOOK_SECRETS.airtel) {
        console.error('Airtel webhook secret is not configured');
        return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
      }

      if (!signature) {
        console.error('Airtel webhook missing signature');
        return res.status(401).json({ success: false, message: 'Missing signature' });
      }

      const payload = getPayloadForSignature(req);
      
      try {
        const isValid = verifyHMACSignature(payload, signature, WEBHOOK_SECRETS.airtel);
        
        if (!isValid) {
          console.error('Invalid Airtel webhook signature');
          return res.status(401).json({ success: false, message: 'Invalid signature' });
        }
      } catch (signatureError) {
        console.error('Airtel signature verification error:', signatureError);
        return res.status(401).json({ success: false, message: 'Signature verification failed' });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error verifying Airtel webhook signature:', error);
    res.status(401).json({ success: false, message: 'Signature verification failed' });
  }
};

// Verify Yas webhook signature
const verifyYasSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-yas-signature'] || req.headers['signature'];
    
    if (shouldRequireSignature('yas')) {
      if (!WEBHOOK_SECRETS.yas) {
        console.error('Yas webhook secret is not configured');
        return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
      }

      if (!signature) {
        console.error('Yas webhook missing signature');
        return res.status(401).json({ success: false, message: 'Missing signature' });
      }

      const payload = getPayloadForSignature(req);
      
      try {
        const isValid = verifyHMACSignature(payload, signature, WEBHOOK_SECRETS.yas);
        
        if (!isValid) {
          console.error('Invalid Yas webhook signature');
          return res.status(401).json({ success: false, message: 'Invalid signature' });
        }
      } catch (signatureError) {
        console.error('Yas signature verification error:', signatureError);
        return res.status(401).json({ success: false, message: 'Signature verification failed' });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error verifying Yas webhook signature:', error);
    res.status(401).json({ success: false, message: 'Signature verification failed' });
  }
};

// Verify HaloPesa webhook signature
const verifyHalopesaSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-halopesa-signature'] || req.headers['signature'];
    
    if (shouldRequireSignature('halopesa')) {
      if (!WEBHOOK_SECRETS.halopesa) {
        console.error('HaloPesa webhook secret is not configured');
        return res.status(500).json({ success: false, message: 'Webhook secret not configured' });
      }

      if (!signature) {
        console.error('HaloPesa webhook missing signature');
        return res.status(401).json({ success: false, message: 'Missing signature' });
      }

      const payload = getPayloadForSignature(req);
      
      try {
        const isValid = verifyHMACSignature(payload, signature, WEBHOOK_SECRETS.halopesa);
        
        if (!isValid) {
          console.error('Invalid HaloPesa webhook signature');
          return res.status(401).json({ success: false, message: 'Invalid signature' });
        }
      } catch (signatureError) {
        console.error('HaloPesa signature verification error:', signatureError);
        return res.status(401).json({ success: false, message: 'Signature verification failed' });
      }
    }
    
    next();
  } catch (error) {
    console.error('Error verifying HaloPesa webhook signature:', error);
    res.status(401).json({ success: false, message: 'Signature verification failed' });
  }
};

module.exports = {
  verifyMpesaSignature,
  verifyAirtelSignature,
  verifyYasSignature,
  verifyHalopesaSignature,
  validateTimestamp,
  validateIPWhitelist
};
