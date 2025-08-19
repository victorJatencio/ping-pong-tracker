const Joi = require("joi");
const {formatValidationErrors} = require("./response");

/**
 * Common validation schemas
 */
const commonSchemas = {
  // MongoDB ObjectId pattern (though we're using Firestore, keeping for compatibility)
  objectId: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).message("Invalid ID format"),

  // Firebase UID pattern
  firebaseUid: Joi.string().min(1).max(128).required(),

  // Email validation
  email: Joi.string().email().required(),

  // Password validation (for custom auth if needed)
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).message(
      "Password must be at least 8 characters long and contain at least one lowercase letter, one uppercase letter, and one number",
  ),

  // Date validation
  date: Joi.date().iso(),

  // Pagination
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),

  // Sort order
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),

  // Match status
  matchStatus: Joi.string().valid("scheduled", "in-progress", "completed", "cancelled"),

  // Score validation (ping-pong typically goes to 21)
  score: Joi.number().integer().min(0).max(50),

  // User role validation
  userRole: Joi.string().valid("user", "admin", "moderator").default("user"),
};

/**
 * User validation schemas
 */
const userSchemas = {
  // Create user profile
  createProfile: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: commonSchemas.email,
    photoURL: Joi.string().uri().allow(null, ""),
    bio: Joi.string().max(500).allow(""),
    location: Joi.string().max(100).allow(""),
    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean().default(true),
        push: Joi.boolean().default(true),
        matchInvitations: Joi.boolean().default(true),
        matchResults: Joi.boolean().default(true),
        leaderboardUpdates: Joi.boolean().default(false),
      }).default(),
      privacy: Joi.object({
        showEmail: Joi.boolean().default(false),
        showLocation: Joi.boolean().default(true),
        showStats: Joi.boolean().default(true),
      }).default(),
    }).default(),
  }),

  // Update user profile
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    photoURL: Joi.string().uri().allow(null, ""),
    bio: Joi.string().max(500).allow(""),
    location: Joi.string().max(100).allow(""),
    preferences: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        matchInvitations: Joi.boolean(),
        matchResults: Joi.boolean(),
        leaderboardUpdates: Joi.boolean(),
      }),
      privacy: Joi.object({
        showEmail: Joi.boolean(),
        showLocation: Joi.boolean(),
        showStats: Joi.boolean(),
      }),
    }),
  }).min(1),
};

/**
 * Match validation schemas
 */
const matchSchemas = {
  // Create match
  createMatch: Joi.object({
    player2Id: commonSchemas.firebaseUid,
    scheduledDate: Joi.date().iso().min("now").required(),
    location: Joi.string().min(1).max(100).required(),
    notes: Joi.string().max(500).allow(""),
    type: Joi.string().valid("casual", "ranked", "tournament").default("casual"),
  }),

  // Update match scores
  updateScores: Joi.object({
    player1Score: commonSchemas.score.required(),
    player2Score: commonSchemas.score.required(),
    status: Joi.string().valid("completed").required(),
    notes: Joi.string().max(500).allow(""),
  }).custom((value, helpers) => {
    // Ensure scores are different (no ties in ping-pong)
    if (value.player1Score === value.player2Score) {
      return helpers.error("custom.tieNotAllowed");
    }

    // Ensure at least one player reached minimum winning score (usually 21)
    const maxScore = Math.max(value.player1Score, value.player2Score);
    if (maxScore < 21) {
      return helpers.error("custom.minimumScoreNotReached");
    }

    // Ensure winner won by at least 2 points (ping-pong rule)
    const scoreDiff = Math.abs(value.player1Score - value.player2Score);
    if (maxScore >= 21 && scoreDiff < 2) {
      return helpers.error("custom.insufficientWinMargin");
    }

    return value;
  }, "Ping-pong score validation").messages({
    "custom.tieNotAllowed": "Tie scores are not allowed in ping-pong",
    "custom.minimumScoreNotReached": "Winner must score at least 21 points",
    "custom.insufficientWinMargin": "Winner must win by at least 2 points",
  }),

  // Update match status
  updateStatus: Joi.object({
    status: commonSchemas.matchStatus.required(),
    notes: Joi.string().max(500).allow(""),
  }),

  // Query matches
  queryMatches: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    status: commonSchemas.matchStatus,
    playerId: commonSchemas.firebaseUid,
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")),
    sortBy: Joi.string().valid("scheduledDate", "completedDate", "createdAt").default("scheduledDate"),
    sortOrder: commonSchemas.sortOrder,
  }),
};

/**
 * Statistics validation schemas
 */
const statsSchemas = {
  // Query player statistics
  queryPlayerStats: Joi.object({
    playerId: commonSchemas.firebaseUid,
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref("startDate")),
    includeHistory: Joi.boolean().default(false),
  }),

  // Query leaderboard
  queryLeaderboard: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    timeframe: Joi.string().valid("all-time", "yearly", "monthly", "weekly").default("all-time"),
    sortBy: Joi.string().valid("winRate", "totalWins", "totalMatches", "currentStreak").default("winRate"),
    sortOrder: commonSchemas.sortOrder,
  }),
};

/**
 * Notification validation schemas
 */
const notificationSchemas = {
  // Create notification
  createNotification: Joi.object({
    recipientId: commonSchemas.firebaseUid,
    type: Joi.string().valid("match_invitation", "match_result", "leaderboard_update", "system").required(),
    title: Joi.string().min(1).max(100).required(),
    message: Joi.string().min(1).max(500).required(),
    data: Joi.object().default({}),
    priority: Joi.string().valid("low", "normal", "high").default("normal"),
  }),

  // Update notification
  updateNotification: Joi.object({
    read: Joi.boolean(),
    archived: Joi.boolean(),
  }).min(1),

  // Query notifications
  queryNotifications: Joi.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    read: Joi.boolean(),
    type: Joi.string().valid("match_invitation", "match_result", "leaderboard_update", "system"),
    sortBy: Joi.string().valid("createdAt", "priority").default("createdAt"),
    sortOrder: commonSchemas.sortOrder,
  }),
};

/**
 * Validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @return {Function} Express middleware function
 */
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const {error, value} = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const formattedErrors = formatValidationErrors(error);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formattedErrors,
        timestamp: new Date().toISOString(),
      });
    }

    // Replace the original property with the validated and sanitized value
    req[property] = value;
    next();
  };
};

module.exports = {
  commonSchemas,
  userSchemas,
  matchSchemas,
  statsSchemas,
  notificationSchemas,
  validate,
};
