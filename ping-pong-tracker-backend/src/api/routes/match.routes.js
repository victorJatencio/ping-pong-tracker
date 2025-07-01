const express = require('express');
const { authenticate, requireMatchParticipant, userRateLimit } = require('../middlewares/auth.middleware');
const { validateRequest } = require('../middlewares/validation.middleware');
const { asyncErrorHandler } = require('../middlewares/error.middleware');
const matchController = require('../controllers/match.controller');
const { matchSchemas } = require('../../utils/validation');

const router = express.Router();

/**
 * @route   GET /api/matches
 * @desc    Get matches (with filters)
 * @access  Private
 */
router.get('/',
    authenticate,
    validateRequest(matchSchemas.queryMatches, 'query'),
    asyncErrorHandler(matchController.getMatches)
);

/**
 * @route   POST /api/matches
 * @desc    Create a new match
 * @access  Private
 */
router.post('/',
    authenticate,
    userRateLimit(10, 60000), // 10 matches per minute
    validateRequest(matchSchemas.createMatch),
    asyncErrorHandler(matchController.createMatch)
);

// ========================================
// SPECIFIC ROUTES (MUST COME BEFORE PARAMETERIZED ROUTES)
// ========================================

/**
 * @route   GET /api/matches/upcoming
 * @desc    Get upcoming matches for current user
 * @access  Private
 */
router.get('/upcoming',
    authenticate,
    asyncErrorHandler(matchController.getUpcomingMatches)
);

/**
 * @route   GET /api/matches/recent
 * @desc    Get recent completed matches
 * @access  Private
 */
router.get('/recent',
    authenticate,
    asyncErrorHandler(matchController.getRecentMatches)
);

/**
 * @route   GET /api/matches/user/:userId
 * @desc    Get matches for a specific user
 * @access  Private
 */
router.get('/user/:userId',
    authenticate,
    validateRequest(matchSchemas.queryMatches, 'query'),
    asyncErrorHandler(matchController.getUserMatches)
);

/**
 * @route   GET /api/matches/upcoming/:userId
 * @desc    Get upcoming matches for a specific user (for dashboard cards)
 * @access  Private
 */
router.get('/upcoming/:userId',
    authenticate,
    validateRequest(matchSchemas.queryMatches, 'query'),
    asyncErrorHandler(matchController.getUpcomingMatchesForUser)
);

/**
 * @route   GET /api/matches/recent/:userId
 * @desc    Get recent completed matches for a specific user (for dashboard cards)
 * @access  Private
 */
router.get('/recent/:userId',
    authenticate,
    validateRequest(matchSchemas.queryMatches, 'query'),
    asyncErrorHandler(matchController.getRecentMatchesForUser)
);

// ========================================
// PARAMETERIZED ROUTES (MUST COME AFTER SPECIFIC ROUTES)
// ========================================

/**
 * @route   GET /api/matches/:matchId
 * @desc    Get match by ID
 * @access  Private
 */
router.get('/:matchId',
    authenticate,
    requireMatchParticipant,
    asyncErrorHandler(matchController.getMatchById)
);

/**
 * @route   PUT /api/matches/:matchId/scores
 * @desc    Update match scores (ENHANCED: Now includes automatic playerStats sync)
 * @access  Private (Match participants only)
 */
router.put('/:matchId/scores',
    authenticate,
    requireMatchParticipant,
    validateRequest(matchSchemas.updateScores),
    asyncErrorHandler(matchController.updateMatchScoresWithSync) // ← ENHANCED: New controller method
);

/**
 * @route   PUT /api/matches/:matchId/status
 * @desc    Update match status (ENHANCED: Includes stats sync when completed)
 * @access  Private (Match participants only)
 */
router.put('/:matchId/status',
    authenticate,
    requireMatchParticipant,
    validateRequest(matchSchemas.updateStatus),
    asyncErrorHandler(matchController.updateMatchStatusWithSync) // ← ENHANCED: New controller method
);

/**
 * @route   DELETE /api/matches/:matchId
 * @desc    Cancel/delete a match
 * @access  Private (Match participants only)
 */
router.delete('/:matchId',
    authenticate,
    requireMatchParticipant,
    asyncErrorHandler(matchController.deleteMatch)
);

/**
 * @route   POST /api/matches/:matchId/complete
 * @desc    Mark match as completed and sync player stats
 * @access  Private (Match participants only)
 */
router.post('/:matchId/complete',
    authenticate,
    requireMatchParticipant,
    validateRequest(matchSchemas.completeMatch),
    asyncErrorHandler(matchController.completeMatchWithSync)
);

module.exports = router;

