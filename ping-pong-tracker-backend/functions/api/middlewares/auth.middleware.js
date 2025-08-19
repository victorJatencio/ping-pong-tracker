const {verifyFirebaseToken, verifyToken} = require("../../config/auth");
const {responseHandler} = require("../../utils/response");
const {dbUtils} = require("../../config/database");
const logger = require("../../utils/logger");

/**
 * Extract token from Authorization header
 * @param {Object} req - Express request object
 * @return {string|null} Token string or null if not found
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer token" and "token" formats
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return authHeader;
};

/**
 * Authenticate user using Firebase ID token
 * This middleware verifies Firebase ID tokens and attaches user info to req.user
 */
const authenticateFirebase = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return responseHandler.unauthorized(res, "No authentication token provided");
    }

    // Verify Firebase ID token
    const user = await verifyFirebaseToken(token);

    // Fetch additional user data from Firestore
    const userProfile = await dbUtils.getDocument("users", user.uid);

    // Attach user information to request
    req.user = {
      ...user,
      profile: userProfile,
    };

    logger.debug(`User authenticated: ${user.uid} (${user.email})`);
    next();
  } catch (error) {
    logger.error("Firebase authentication failed:", error.message);
    return responseHandler.unauthorized(res, "Invalid authentication token");
  }
};

/**
 * Authenticate user using JWT token
 * This middleware verifies JWT tokens issued by the backend
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return responseHandler.unauthorized(res, "No authentication token provided");
    }

    // Verify JWT token
    const decoded = verifyToken(token);

    // Fetch current user data from Firestore
    const userProfile = await dbUtils.getDocument("users", decoded.uid);

    if (!userProfile) {
      return responseHandler.unauthorized(res, "User not found");
    }

    // Attach user information to request
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.emailVerified,
      displayName: decoded.displayName,
      photoURL: decoded.photoURL,
      role: decoded.role,
      profile: userProfile,
    };

    logger.debug(`User authenticated via JWT: ${decoded.uid} (${decoded.email})`);
    next();
  } catch (error) {
    logger.error("JWT authentication failed:", error.message);
    return responseHandler.unauthorized(res, "Invalid authentication token");
  }
};

/**
 * Flexible authentication middleware that accepts both Firebase and JWT tokens
 * This is the recommended middleware for most endpoints
 */
const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return responseHandler.unauthorized(res, "No authentication token provided");
    }

    // Try Firebase token first (longer tokens), then JWT
    try {
      if (token.length > 100) {
        // Likely a Firebase ID token (they're typically much longer)
        await authenticateFirebase(req, res, next);
      } else {
        // Likely a JWT token
        await authenticateJWT(req, res, next);
      }
    } catch (firebaseError) {
      // If Firebase auth fails, try JWT
      try {
        await authenticateJWT(req, res, next);
      } catch (jwtError) {
        logger.error("Both authentication methods failed:", {
          firebase: firebaseError.message,
          jwt: jwtError.message,
        });
        return responseHandler.unauthorized(res, "Invalid authentication token");
      }
    }
  } catch (error) {
    logger.error("Authentication error:", error.message);
    return responseHandler.unauthorized(res, "Authentication failed");
  }
};

/**
 * Optional authentication middleware
 * Attaches user info if token is provided, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      return next();
    }

    // Try to authenticate, but don't fail if it doesn't work
    await authenticate(req, res, (error) => {
      if (error) {
        // Authentication failed, but continue without user
        req.user = null;
      }
      next();
    });
  } catch (error) {
    // Authentication failed, but continue without user
    req.user = null;
    next();
  }
};

/**
 * Authorization middleware factory
 * Creates middleware that checks if user has required role
 * @param {string|Array} roles - Required role(s)
 * @return {Function} Express middleware function
 */
const authorize = (roles) => {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return (req, res, next) => {
    if (!req.user) {
      return responseHandler.unauthorized(res, "Authentication required");
    }

    const userRole = req.user.role || "user";

    if (!requiredRoles.includes(userRole)) {
      logger.warn(`Authorization failed for user ${req.user.uid}: required ${requiredRoles}, has ${userRole}`);
      return responseHandler.forbidden(res, "Insufficient permissions");
    }

    logger.debug(`User ${req.user.uid} authorized with role: ${userRole}`);
    next();
  };
};

/**
 * Resource ownership middleware
 * Checks if the authenticated user owns the requested resource
 * @param {string} paramName - Name of the parameter containing the resource owner ID
 * @return {Function} Express middleware function
 */
const requireOwnership = (paramName = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      return responseHandler.unauthorized(res, "Authentication required");
    }

    const resourceOwnerId = req.params[paramName] || req.body[paramName] || req.query[paramName];

    if (!resourceOwnerId) {
      return responseHandler.error(res, `Missing ${paramName} parameter`, 400);
    }

    // Allow access if user owns the resource or is an admin
    if (req.user.uid === resourceOwnerId || req.user.role === "admin") {
      return next();
    }

    logger.warn(`Ownership check failed: user ${req.user.uid} tried to access resource owned by ${resourceOwnerId}`);
    return responseHandler.forbidden(res, "You can only access your own resources");
  };
};

/**
 * Match participant middleware
 * Checks if the authenticated user is a participant in the specified match
 */
const requireMatchParticipant = async (req, res, next) => {
  try {
    if (!req.user) {
      return responseHandler.unauthorized(res, "Authentication required");
    }

    const matchId = req.params.matchId || req.params.id;

    if (!matchId) {
      return responseHandler.error(res, "Missing match ID", 400);
    }

    // Fetch match data
    const match = await dbUtils.getDocument("matches", matchId);

    if (!match) {
      return responseHandler.notFound(res, "Match not found");
    }

    // Check if user is a participant or admin
    const isParticipant = match.player1Id === req.user.uid || match.player2Id === req.user.uid;
    const isAdmin = req.user.role === "admin";

    if (!isParticipant && !isAdmin) {
      logger.warn(`Match access denied: user ${req.user.uid} is not a participant in match ${matchId}`);
      return responseHandler.forbidden(res, "You can only access matches you participate in");
    }

    // Attach match data to request for use in route handlers
    req.match = match;
    next();
  } catch (error) {
    logger.error("Match participant check failed:", error.message);
    return responseHandler.error(res, "Failed to verify match access");
  }
};

/**
 * Rate limiting by user
 * Implements per-user rate limiting for sensitive operations
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @return {Function} Express middleware function
 */
const userRateLimit = (maxRequests = 10, windowMs = 60000) => {
  const userRequests = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const userId = req.user.uid;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get user's request history
    let requests = userRequests.get(userId) || [];

    // Remove old requests outside the window
    requests = requests.filter((timestamp) => timestamp > windowStart);

    // Check if user has exceeded the limit
    if (requests.length >= maxRequests) {
      logger.warn(`Rate limit exceeded for user ${userId}: ${requests.length} requests in window`);
      return responseHandler.error(res, "Too many requests, please try again later", 429);
    }

    // Add current request
    requests.push(now);
    userRequests.set(userId, requests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      for (const [uid, timestamps] of userRequests.entries()) {
        const validTimestamps = timestamps.filter((ts) => ts > windowStart);
        if (validTimestamps.length === 0) {
          userRequests.delete(uid);
        } else {
          userRequests.set(uid, validTimestamps);
        }
      }
    }

    next();
  };
};

module.exports = {
  authenticate,
  authenticateFirebase,
  authenticateJWT,
  optionalAuth,
  authorize,
  requireOwnership,
  requireMatchParticipant,
  userRateLimit,
};
