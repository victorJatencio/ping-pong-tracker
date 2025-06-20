const logger = require('../../utils/logger');
const { ApiResponse } = require('../../utils/response');

/**
 * Custom error class for application-specific errors
 */
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();
        
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Firebase Admin SDK error handler
 * Converts Firebase errors to standardized API responses
 */
const handleFirebaseError = (error) => {
    logger.error('Firebase error:', error);
    
    switch (error.code) {
        case 'auth/id-token-expired':
            return new AppError('Authentication token has expired', 401);
        case 'auth/id-token-revoked':
            return new AppError('Authentication token has been revoked', 401);
        case 'auth/invalid-id-token':
            return new AppError('Invalid authentication token', 401);
        case 'auth/user-not-found':
            return new AppError('User not found', 404);
        case 'auth/user-disabled':
            return new AppError('User account has been disabled', 403);
        case 'auth/email-already-exists':
            return new AppError('Email address is already in use', 409);
        case 'auth/phone-number-already-exists':
            return new AppError('Phone number is already in use', 409);
        case 'auth/invalid-email':
            return new AppError('Invalid email address', 400);
        case 'auth/invalid-password':
            return new AppError('Invalid password', 400);
        case 'auth/weak-password':
            return new AppError('Password is too weak', 400);
        case 'permission-denied':
            return new AppError('Permission denied', 403);
        case 'not-found':
            return new AppError('Document not found', 404);
        case 'already-exists':
            return new AppError('Document already exists', 409);
        case 'resource-exhausted':
            return new AppError('Resource quota exceeded', 429);
        case 'failed-precondition':
            return new AppError('Operation failed due to precondition', 400);
        case 'aborted':
            return new AppError('Operation was aborted', 409);
        case 'out-of-range':
            return new AppError('Operation was attempted past the valid range', 400);
        case 'unimplemented':
            return new AppError('Operation is not implemented', 501);
        case 'internal':
            return new AppError('Internal server error', 500);
        case 'unavailable':
            return new AppError('Service temporarily unavailable', 503);
        case 'deadline-exceeded':
            return new AppError('Operation deadline exceeded', 504);
        default:
            return new AppError('Firebase operation failed', 500);
    }
};

/**
 * Validation error handler
 * Handles Joi validation errors and other validation-related errors
 */
const handleValidationError = (error) => {
    if (error.isJoi) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
        }));
        
        return new AppError('Validation failed', 400, true, errors);
    }
    
    return new AppError('Invalid input data', 400);
};

/**
 * Database error handler
 * Handles database connection and operation errors
 */
const handleDatabaseError = (error) => {
    logger.error('Database error:', error);
    
    // Handle specific database errors
    if (error.message.includes('ECONNREFUSED')) {
        return new AppError('Database connection failed', 503);
    }
    
    if (error.message.includes('timeout')) {
        return new AppError('Database operation timed out', 504);
    }
    
    return new AppError('Database operation failed', 500);
};

/**
 * JWT error handler
 * Handles JSON Web Token related errors
 */
const handleJWTError = (error) => {
    switch (error.name) {
        case 'JsonWebTokenError':
            return new AppError('Invalid authentication token', 401);
        case 'TokenExpiredError':
            return new AppError('Authentication token has expired', 401);
        case 'NotBeforeError':
            return new AppError('Authentication token not active yet', 401);
        default:
            return new AppError('Authentication failed', 401);
    }
};

/**
 * Development error response
 * Provides detailed error information for development environment
 */
const sendErrorDev = (err, res) => {
    const response = new ApiResponse(
        false,
        null,
        err.message,
        {
            name: err.name,
            stack: err.stack,
            statusCode: err.statusCode,
            isOperational: err.isOperational,
            ...(err.errors && { validationErrors: err.errors })
        }
    );
    
    res.status(err.statusCode || 500).json(response);
};

/**
 * Production error response
 * Provides sanitized error information for production environment
 */
const sendErrorProd = (err, res) => {
    // Only send operational errors to client in production
    if (err.isOperational) {
        const response = new ApiResponse(
            false,
            null,
            err.message,
            err.errors || null
        );
        
        res.status(err.statusCode).json(response);
    } else {
        // Log the error but don't expose details to client
        logger.error('Non-operational error in production:', err);
        
        const response = new ApiResponse(
            false,
            null,
            'Something went wrong on our end. Please try again later.',
            null
        );
        
        res.status(500).json(response);
    }
};

/**
 * Global error handling middleware
 * This should be the last middleware in the application
 */
const errorHandler = (err, req, res, next) => {
    // Set default error properties
    err.statusCode = err.statusCode || 500;
    err.isOperational = err.isOperational !== undefined ? err.isOperational : false;
    
    // Log error details
    logger.error('Error occurred:', {
        message: err.message,
        statusCode: err.statusCode,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        userId: req.user?.uid || 'anonymous',
        timestamp: new Date().toISOString()
    });
    
    let error = { ...err };
    error.message = err.message;
    
    // Handle specific error types
    if (err.code && err.code.startsWith('auth/')) {
        error = handleFirebaseError(err);
    } else if (err.isJoi || err.name === 'ValidationError') {
        error = handleValidationError(err);
    } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
        error = handleJWTError(err);
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('timeout')) {
        error = handleDatabaseError(err);
    } else if (err.name === 'CastError') {
        error = new AppError('Invalid ID format', 400);
    } else if (err.code === 11000) {
        error = new AppError('Duplicate field value', 409);
    }
    
    // Send error response based on environment
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(error, res);
    } else {
        sendErrorProd(error, res);
    }
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    next(error);
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch and forward errors
 */
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
    asyncErrorHandler,
    handleFirebaseError,
    handleValidationError,
    handleDatabaseError,
    handleJWTError
};