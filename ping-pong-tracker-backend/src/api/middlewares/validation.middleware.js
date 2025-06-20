const { validate } = require('../../utils/validation');
const { responseHandler } = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * Enhanced validation middleware with custom error handling
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, property = 'body', options = {}) => {
    const defaultOptions = {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false,
        ...options
    };
    
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], defaultOptions);
        
        if (error) {
            const formattedErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message.replace(/"/g, ''),
                value: detail.context?.value,
                type: detail.type
            }));
            
            logger.warn('Validation failed:', {
                endpoint: req.originalUrl,
                method: req.method,
                property,
                errors: formattedErrors,
                userId: req.user?.uid || 'anonymous'
            });
            
            return responseHandler.validationError(res, formattedErrors, 'Request validation failed');
        }
        
        // Replace the original property with the validated and sanitized value
        req[property] = value;
        
        logger.debug('Validation passed:', {
            endpoint: req.originalUrl,
            method: req.method,
            property,
            userId: req.user?.uid || 'anonymous'
        });
        
        next();
    };
};

/**
 * Validate multiple request properties
 * @param {Object} schemas - Object with property names as keys and schemas as values
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateMultiple = (schemas, options = {}) => {
    return (req, res, next) => {
        const errors = [];
        const validatedData = {};
        
        for (const [property, schema] of Object.entries(schemas)) {
            const { error, value } = schema.validate(req[property], {
                abortEarly: false,
                stripUnknown: true,
                convert: true,
                allowUnknown: false,
                ...options
            });
            
            if (error) {
                const propertyErrors = error.details.map(detail => ({
                    property,
                    field: detail.path.join('.'),
                    message: detail.message.replace(/"/g, ''),
                    value: detail.context?.value,
                    type: detail.type
                }));
                errors.push(...propertyErrors);
            } else {
                validatedData[property] = value;
            }
        }
        
        if (errors.length > 0) {
            logger.warn('Multiple property validation failed:', {
                endpoint: req.originalUrl,
                method: req.method,
                errors,
                userId: req.user?.uid || 'anonymous'
            });
            
            return responseHandler.validationError(res, errors, 'Request validation failed');
        }
        
        // Replace original properties with validated values
        Object.assign(req, validatedData);
        
        logger.debug('Multiple property validation passed:', {
            endpoint: req.originalUrl,
            method: req.method,
            properties: Object.keys(schemas),
            userId: req.user?.uid || 'anonymous'
        });
        
        next();
    };
};

/**
 * Conditional validation middleware
 * Only validates if a condition is met
 * @param {Function} condition - Function that returns boolean
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate
 * @returns {Function} Express middleware function
 */
const validateIf = (condition, schema, property = 'body') => {
    return (req, res, next) => {
        if (!condition(req)) {
            return next();
        }
        
        return validateRequest(schema, property)(req, res, next);
    };
};

/**
 * File upload validation middleware
 * Validates file uploads with size and type restrictions
 * @param {Object} options - File validation options
 * @returns {Function} Express middleware function
 */
const validateFileUpload = (options = {}) => {
    const {
        maxSize = 5 * 1024 * 1024, // 5MB default
        allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
        required = false
    } = options;
    
    return (req, res, next) => {
        const file = req.file;
        
        if (!file) {
            if (required) {
                return responseHandler.validationError(res, 
                    [{ field: 'file', message: 'File is required' }],
                    'File upload validation failed'
                );
            }
            return next();
        }
        
        const errors = [];
        
        // Check file size
        if (file.size > maxSize) {
            errors.push({
                field: 'file',
                message: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
                value: `${Math.round(file.size / 1024 / 1024)}MB`
            });
        }
        
        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
            errors.push({
                field: 'file',
                message: `File type must be one of: ${allowedTypes.join(', ')}`,
                value: file.mimetype
            });
        }
        
        if (errors.length > 0) {
            logger.warn('File upload validation failed:', {
                endpoint: req.originalUrl,
                method: req.method,
                errors,
                fileName: file.originalname,
                fileSize: file.size,
                fileType: file.mimetype,
                userId: req.user?.uid || 'anonymous'
            });
            
            return responseHandler.validationError(res, errors, 'File upload validation failed');
        }
        
        logger.debug('File upload validation passed:', {
            endpoint: req.originalUrl,
            method: req.method,
            fileName: file.originalname,
            fileSize: file.size,
            fileType: file.mimetype,
            userId: req.user?.uid || 'anonymous'
        });
        
        next();
    };
};

/**
 * Sanitization middleware
 * Sanitizes request data to prevent XSS and injection attacks
 */
const sanitizeRequest = (req, res, next) => {
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        // Remove HTML tags and potentially dangerous characters
        return str
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<[^>]*>/g, '')
            .trim();
    };
    
    const sanitizeObject = (obj) => {
        if (obj === null || typeof obj !== 'object') {
            return typeof obj === 'string' ? sanitizeString(obj) : obj;
        }
        
        if (Array.isArray(obj)) {
            return obj.map(sanitizeObject);
        }
        
        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitizeObject(value);
        }
        return sanitized;
    };
    
    // Sanitize request body, query, and params
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
        req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
        req.params = sanitizeObject(req.params);
    }
    
    next();
};

module.exports = {
    validateRequest,
    validateMultiple,
    validateIf,
    validateFileUpload,
    sanitizeRequest,
    validate // Re-export the basic validate function
};