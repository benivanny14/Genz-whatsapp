const winston = require('winston');
const path = require('path');

/**
 * Winston Logger Configuration
 * Provides structured logging with multiple transports
 */

const logDir = path.join(__dirname, '../logs');

// Define log formats
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'genz-whatsapp' },
  transports: [
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    // Write access logs to access.log
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'debug'
  }));
}

// Add console transport in production (only errors and warnings)
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: 'warn'
  }));
}

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

/**
 * Create a child logger with additional metadata
 * @param {Object} metadata - Additional metadata to include
 * @returns {Object} Child logger instance
 */
const childLogger = (metadata) => {
  return logger.child(metadata);
};

/**
 * Log request details
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
const logRequest = (req, res, duration) => {
  logger.http({
    requestId: req.id,
    method: req.method,
    url: req.url,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
};

/**
 * Log error details
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
const logError = (error, context = {}) => {
  logger.error({
    message: error.message,
    stack: error.stack,
    ...context
  });
};

/**
 * Log info message
 * @param {string} message - Info message
 * @param {Object} metadata - Additional metadata
 */
const logInfo = (message, metadata = {}) => {
  logger.info(message, metadata);
};

/**
 * Log warning message
 * @param {string} message - Warning message
 * @param {Object} metadata - Additional metadata
 */
const logWarning = (message, metadata = {}) => {
  logger.warn(message, metadata);
};

/**
 * Log debug message
 * @param {string} message - Debug message
 * @param {Object} metadata - Additional metadata
 */
const logDebug = (message, metadata = {}) => {
  logger.debug(message, metadata);
};

module.exports = {
  logger,
  childLogger,
  logRequest,
  logError,
  logInfo,
  logWarning,
  logDebug
};
