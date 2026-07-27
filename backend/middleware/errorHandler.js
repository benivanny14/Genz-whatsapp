const { logError } = require('../config/winston');
const { captureException } = require('../config/sentry');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  const statusCode = error.statusCode || err.statusCode || 500;

  // Log error with Winston
  logError(err, {
    requestId: req.id,
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous',
    ip: req.ip
  });

  // Capture error in Sentry
  captureException(err, {
    requestId: req.id,
    path: req.path,
    method: req.method,
    userId: req.user?.id || 'anonymous'
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  const responseStatus = error.statusCode || statusCode;
  const isServerError = responseStatus >= 500;

  res.status(responseStatus).json({
    success: false,
    requestId: req.id,
    message: isServerError && process.env.NODE_ENV === 'production'
      ? 'Server Error'
      : (error.message || 'Server Error')
  });
};

module.exports = errorHandler;
