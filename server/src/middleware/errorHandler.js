/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode || 500;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
  const err = new AppError(`Resource not found: ${req.method} ${req.originalUrl}`, 404);
  next(err);
};

/**
 * Centralized global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field: ${err.path}`;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const duplicatedFields = Object.keys(err.keyValue || {}).join(', ');
    message = `Duplicate key error: value for [${duplicatedFields}] already exists`;
  }

  const responsePayload = {
    success: false,
    status: err.status || 'error',
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  };

  res.status(statusCode).json(responsePayload);
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
