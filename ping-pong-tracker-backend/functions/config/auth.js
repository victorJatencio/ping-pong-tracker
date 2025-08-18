const jwt = require('jsonwebtoken');
const { getAuth } = require('./database');
const logger = require('../utils/logger');

/**
 * JWT Configuration
 */
const jwtConfig = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    issuer: 'ping-pong-tracker-backend',
    audience: 'ping-pong-tracker-frontend'
};

/**
 * Generate JWT token for authenticated user
 * @param {Object} user - User object from Firebase Auth
 * @returns {string} JWT token
 */
const generateToken = (user) => {
    const payload = {
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName || null,
        photoURL: user.photoURL || null,
        role: user.customClaims?.role || 'user'
    };

    return jwt.sign(payload, jwtConfig.secret, {
        expiresIn: jwtConfig.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        subject: user.uid
    });
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, jwtConfig.secret, {
            issuer: jwtConfig.issuer,
            audience: jwtConfig.audience
        });
    } catch (error) {
        logger.error('JWT verification failed:', error.message);
        throw new Error('Invalid token');
    }
};

/**
 * Verify Firebase ID token and get user information
 * @param {string} idToken - Firebase ID token
 * @returns {Object} User information from Firebase
 */
const verifyFirebaseToken = async (idToken) => {
    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const user = await getAuth().getUser(decodedToken.uid);
        
        return {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            displayName: user.displayName,
            photoURL: user.photoURL,
            customClaims: user.customClaims || {},
            metadata: {
                creationTime: user.metadata.creationTime,
                lastSignInTime: user.metadata.lastSignInTime
            }
        };
    } catch (error) {
        logger.error('Firebase token verification failed:', error.message);
        throw new Error('Invalid Firebase token');
    }
};

/**
 * Set custom claims for a user
 * @param {string} uid - User ID
 * @param {Object} claims - Custom claims to set
 */
const setCustomClaims = async (uid, claims) => {
    try {
        await getAuth().setCustomUserClaims(uid, claims);
        logger.info(`Custom claims set for user ${uid}:`, claims);
    } catch (error) {
        logger.error(`Failed to set custom claims for user ${uid}:`, error.message);
        throw error;
    }
};

/**
 * Create a custom token for a user
 * @param {string} uid - User ID
 * @param {Object} additionalClaims - Additional claims to include
 * @returns {string} Custom token
 */
const createCustomToken = async (uid, additionalClaims = {}) => {
    try {
        return await getAuth().createCustomToken(uid, additionalClaims);
    } catch (error) {
        logger.error(`Failed to create custom token for user ${uid}:`, error.message);
        throw error;
    }
};

/**
 * Revoke refresh tokens for a user (force logout)
 * @param {string} uid - User ID
 */
const revokeRefreshTokens = async (uid) => {
    try {
        await getAuth().revokeRefreshTokens(uid);
        logger.info(`Refresh tokens revoked for user ${uid}`);
    } catch (error) {
        logger.error(`Failed to revoke refresh tokens for user ${uid}:`, error.message);
        throw error;
    }
};

/**
 * Delete a user account
 * @param {string} uid - User ID
 */
const deleteUser = async (uid) => {
    try {
        await getAuth().deleteUser(uid);
        logger.info(`User account deleted: ${uid}`);
    } catch (error) {
        logger.error(`Failed to delete user ${uid}:`, error.message);
        throw error;
    }
};

module.exports = {
    jwtConfig,
    generateToken,
    verifyToken,
    verifyFirebaseToken,
    setCustomClaims,
    createCustomToken,
    revokeRefreshTokens,
    deleteUser
};