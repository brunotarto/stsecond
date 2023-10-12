// Import AppError utility
const AppError = require('../utils/appError');

// Handle CastError from MongoDB
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path.replace('_id', 'id')}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle ValidationError from MongoDB
const handleValidatorErrorDB = (err) => {
  const message = `${err.message}`;
  return new AppError(message, 400);
};

// Handle ValidationError from MongoDB
const handleSyntaxErrorDB = (err) => {
  const message = `${err.message}`;
  return new AppError(message, 400);
};

// Handle duplicate error from MongoDB
const handleDuplicateErrorDB = (err) => {
  const message = `Duplicate field value: *${
    Object.keys(err.keyValue)[0]
  }* : *${Object.values(err.keyValue)[0]}*, Please use another value.`;
  return new AppError(message, 400);
};

// Send error response in development environment
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack,
    err: err,
  });
};

// Log error details in development environment
const sendErrorDevLog = (devErr) => {
  errorMessage = `status: ${devErr.status},
                  message: ${devErr.message},
                  stack: ${devErr.stack}`;

  console.log('🚩⚠️', errorMessage);
};

// Send error response in production environment
const sendErrorProd = (err, res, devErr) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('ERROR ⚠️⚠️', err);

    res.status(500).json({
      status: 'error',
      message: 'Something went wrong. Please try again later.',
    });
    sendErrorDevLog(devErr);
  }
};

// Error handling middleware
module.exports = (err, req, res, next) => {
  // Set default error status code and status
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Check environment and handle errors accordingly
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message || err.msg;
    // Handle specific MongoDB errors
    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.code === 11000) error = handleDuplicateErrorDB(err);
    if (err.name === 'SyntaxError') error = handleSyntaxErrorDB(err);
    if (err.name === 'ValidationError') error = handleValidatorErrorDB(err);
    sendErrorProd(error, res, err);
  }
};
