const logger = require('./logger');

/**
 * Standard API response structure
 */
class ApiResponse {
    constructor(success, data = null, message = '', errors = null, meta = null) {
        this.success = success;
        this.data = data;
        this.message = message;
        this.timestamp = new Date().toISOString();
        
        if (errors) {
            this.errors = errors;
        }
        
        if (meta) {
            this.meta = meta;
        }
    }
}

/**
 * Response handler utility functions
 */
const responseHandler = {
    /**
     * Send success response
     * @param {Object} res - Express response object
     * @param {*} data - Response data
     * @param {string} message - Success message
     * @param {number} statusCode - HTTP status code
     * @param {Object} meta - Additional metadata
     */
    success(res, data = null, message = 'Success', statusCode = 200, meta = null) {
        const response = new ApiResponse(true, data, message, null, meta);
        
        logger.info(`✅ ${statusCode} ${message}`, {
            endpoint: res.req.originalUrl,
            method: res.req.method,
            statusCode,
            userId: res.req.user?.uid || 'anonymous'
        });
        
        return res.status(statusCode).json(response);
    },

    /**
     * Send created response
     * @param {Object} res - Express response object
     * @param {*} data - Created resource data
     * @param {string} message - Success message
     */
    created(res, data, message = 'Resource created successfully') {
        return this.success(res, data, message, 201);
    },

    /**
     * Send error response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     * @param {*} errors - Error details
     */
    error(res, message = 'Internal server error', statusCode = 500, errors = null) {
        const response = new ApiResponse(false, null, message, errors);
        
        logger.error(`❌ ${statusCode} ${message}`, {
            endpoint: res.req.originalUrl,
            method: res.req.method,
            statusCode,
            errors,
            userId: res.req.user?.uid || 'anonymous'
        });
        
        return res.status(statusCode).json(response);
    },

    /**
     * Send validation error response
     * @param {Object} res - Express response object
     * @param {*} errors - Validation errors
     * @param {string} message - Error message
     */
    validationError(res, errors, message = 'Validation failed') {
        return this.error(res, message, 400, errors);
    },

    /**
     * Send unauthorized response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    unauthorized(res, message = 'Unauthorized access') {
        return this.error(res, message, 401);
    },

    /**
     * Send forbidden response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    forbidden(res, message = 'Access forbidden') {
        return this.error(res, message, 403);
    },

    /**
     * Send not found response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    notFound(res, message = 'Resource not found') {
        return this.error(res, message, 404);
    },

    /**
     * Send conflict response
     * @param {Object} res - Express response object
     * @param {string} message - Error message
     */
    conflict(res, message = 'Resource conflict') {
        return this.error(res, message, 409);
    },

    /**
     * Send paginated response
     * @param {Object} res - Express response object
     * @param {Array} data - Response data array
     * @param {Object} pagination - Pagination metadata
     * @param {string} message - Success message
     */
    paginated(res, data, pagination, message = 'Data retrieved successfully') {
        const meta = {
            pagination: {
                page: pagination.page,
                limit: pagination.limit,
                total: pagination.total,
                totalPages: Math.ceil(pagination.total / pagination.limit),
                hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
                hasPrev: pagination.page > 1
            }
        };
        
        return this.success(res, data, message, 200, meta);
    }
};

/**
 * Error response helper for async route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Validation error formatter for Joi validation
 * @param {Object} error - Joi validation error
 * @returns {Array} Formatted error array
 */
const formatValidationErrors = (error) => {
    return error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
    }));
};

module.exports = {
    ApiResponse,
    responseHandler,
    asyncHandler,
    formatValidationErrors
};