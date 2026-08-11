const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

// SECURITY (3.9): xss-clean removed — it is unmaintained, mutates user data
// destructively, and is redundant here. Input validation (express-validator /
// Joi-style checks in controllers) plus output encoding (React auto-escapes;
// sanitizeInput strips control chars) cover the same ground safely.

/**
 * Security Middleware Configuration
 * Provides comprehensive security hardening for the application
 */

/**
 * Configure Helmet for security headers
 */
const configureHelmet = () => {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https:', 'ws:', 'wss:'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    frameguard: { action: 'deny' },
    xssFilter: true
  });
};

/**
 * Configure rate limiting for API endpoints
 */
const createRateLimiter = (options = {}) => {
  const config = {
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: {
      success: false,
      error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
  };

  // Only add skip if it's a valid function
  if (typeof options.skip === 'function') {
    config.skip = options.skip;
  }

  // Only add keyGenerator if provided
  if (typeof options.keyGenerator === 'function') {
    config.keyGenerator = options.keyGenerator;
  }

  return rateLimit(config);
};

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100 // Limit each IP to 5 requests per windowMs (100 in dev)
});

/**
 * API rate limiter for general endpoints
 */
const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // Limit each IP to 100 requests per windowMs
});

/**
 * Strict rate limiter for sensitive operations
 */
const strictRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10 // Limit each IP to 10 requests per windowMs
});

/**
 * CSRF defense via Origin validation (OWASP recommendation for token-based
 * APIs, no session store required). Browsers always attach an Origin header to
 * state-changing requests (fetch/XHR). If that Origin is not one of the
 * application's own origins, the request is rejected before it can act on the
 * authenticated session/cookie. Requests without an Origin header (mobile
 * apps, curl, PWA installs) are allowed through; SameSite=strict auth cookies
 * plus Bearer headers protect those channels.
 */
const validateOrigin = (allowedOrigins = []) => {
  const allowed = allowedOrigins.filter(Boolean);
  const isAllowed = (origin) => {
    if (!origin) return true;
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
    return allowed.includes(origin);
  };
  return (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
    const origin = req.headers.origin;
    if (!origin) return next();
    if (!isAllowed(origin)) {
      console.warn('[CSRF] Blocked cross-origin state-changing request', {
        origin,
        method: req.method,
        path: req.originalUrl
      });
      return res.status(403).json({
        success: false,
        error: 'Cross-origin request blocked'
      });
    }
    next();
  };
};

/**
 * CSRF token validation middleware
 */
const validateCSRF = (req, res, next) => {
  const csrfToken = req.headers['x-csrf-token'];
  const sessionToken = req.session?.csrfToken;

  // Skip CSRF validation for GET requests
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  if (!csrfToken || !sessionToken || csrfToken !== sessionToken) {
    return res.status(403).json({
      success: false,
      error: 'Invalid CSRF token'
    });
  }

  next();
};

/**
 * Input sanitization middleware
 *
 * Only strips null bytes and control characters. DO NOT strip `<` / `>` here:
 * message content legitimately contains those characters ("a < b", "<3"), and
 * stripping them silently corrupts user messages. Stored-XSS is prevented at
 * render time (React auto-escapes text; no dangerouslySetInnerHTML is used in
 * the app) and by the fileValidation + xss-clean layers on specific fields.
 */
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // eslint-disable-next-line no-control-regex
      return obj.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }
  if (req.params) {
    req.params = sanitize(req.params);
  }

  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(self), camera=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
};

/**
 * IP whitelist middleware
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied from this IP'
      });
    }
    
    next();
  };
};

/**
 * Request size limiter
 */
const requestSizeLimiter = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];
    const maxBytes = parseInt(maxSize) * 1024 * 1024;
    
    if (contentLength && parseInt(contentLength) > maxBytes) {
      return res.status(413).json({
        success: false,
        error: 'Request entity too large'
      });
    }
    
    next();
  };
};

module.exports = {
  configureHelmet,
  createRateLimiter,
  authRateLimiter,
  apiRateLimiter,
  strictRateLimiter,
  validateOrigin,
  validateCSRF,
  sanitizeInput,
  securityHeaders,
  ipWhitelist,
  requestSizeLimiter
};
