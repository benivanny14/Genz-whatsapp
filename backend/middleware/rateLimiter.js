const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes'
});

// Rate limiter for payment initiation (prevent spam)
const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 payment requests per windowMs
  message: {
    success: false,
    message: 'Too many payment requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for subscription status checks (prevent abuse)
const subscriptionRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 status checks per minute
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for webhooks (more lenient for payment providers)
const webhookRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 webhook requests per minute
  skip: (req) => {
    // Skip rate limiting for whitelisted IPs (payment providers)
    const whitelist = process.env.WEBHOOK_IP_WHITELIST ? process.env.WEBHOOK_IP_WHITELIST.split(',') : [];
    const clientIP = req.ip || req.connection.remoteAddress;
    return whitelist.includes(clientIP);
  },
  message: {
    success: false,
    message: 'Webhook rate limit exceeded.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, authLimiter, paymentRateLimiter, subscriptionRateLimiter, webhookRateLimiter };
