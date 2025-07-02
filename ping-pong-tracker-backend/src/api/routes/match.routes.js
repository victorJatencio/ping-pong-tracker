const express = require("express");
const {
  authenticate,
  requireMatchParticipant,
  userRateLimit,
} = require("../middlewares/auth.middleware");
const { validateRequest } = require("../middlewares/validation.middleware");
const { asyncErrorHandler } = require("../middlewares/error.middleware");
const matchController = require("../controllers/match.controller");
const { matchSchemas } = require("../../utils/validation");
const statsService = require("../../services/stats.service");

const router = express.Router();

/**
 * @route   GET /api/matches
 * @desc    Get matches (with filters)
 * @access  Private
 */
router.get(
  "/",
  authenticate,
  validateRequest(matchSchemas.queryMatches, "query"),
  asyncErrorHandler(matchController.getMatches)
);

/**
 * @route   POST /api/matches
 * @desc    Create a new match
 * @access  Private
 */
router.post(
  "/",
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
router.get(
  "/upcoming",
  authenticate,
  asyncErrorHandler(matchController.getUpcomingMatches)
);

/**
 * @route   GET /api/matches/recent
 * @desc    Get recent completed matches
 * @access  Private
 */
router.get(
  "/recent",
  authenticate,
  asyncErrorHandler(matchController.getRecentMatches)
);

/**
 * @route   GET /api/matches/user/:userId
 * @desc    Get matches for a specific user
 * @access  Private
 */
router.get(
  "/user/:userId",
  authenticate,
  validateRequest(matchSchemas.queryMatches, "query"),
  asyncErrorHandler(matchController.getUserMatches)
);

/**
 * @route   GET /api/matches/upcoming/:userId
 * @desc    Get upcoming matches for a specific user (for dashboard cards)
 * @access  Private
 */
router.get(
  "/upcoming/:userId",
  authenticate,
  validateRequest(matchSchemas.queryMatches, "query"),
  asyncErrorHandler(matchController.getUpcomingMatchesForUser)
);

/**
 * @route   GET /api/matches/recent/:userId
 * @desc    Get recent completed matches for a specific user (for dashboard cards)
 * @access  Private
 */
router.get(
  "/recent/:userId",
  authenticate,
  validateRequest(matchSchemas.queryMatches, "query"),
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
router.get(
  "/:matchId",
  authenticate,
  requireMatchParticipant,
  asyncErrorHandler(matchController.getMatchById)
);

/**
 * @route   PUT /api/matches/:matchId/scores
 * @desc    Update match scores (ENHANCED: Now includes automatic playerStats sync)
 * @access  Private (Match participants only)
 */
router.put(
  "/:matchId/scores",
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
router.put(
  "/:matchId/status",
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
router.delete(
  "/:matchId",
  authenticate,
  requireMatchParticipant,
  asyncErrorHandler(matchController.deleteMatch)
);

/**
 * @route   POST /api/matches/:matchId/complete
 * @desc    Mark match as completed and sync player stats
 * @access  Private (Match participants only)
 */
router.post(
  "/:matchId/complete",
  authenticate,
  requireMatchParticipant,
  validateRequest(matchSchemas.completeMatch),
  asyncErrorHandler(matchController.completeMatchWithSync)
);

/**
 * Complete a match and sync player stats
 * PUT /api/matches/:matchId/complete
 */
router.put("/:matchId/complete", async (req, res) => {
  try {
    const { matchId } = req.params;
    const { player1Score, player2Score, winnerId, loserId, notes } = req.body;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        error: "Match ID is required",
      });
    }

    const db = admin.firestore();
    const matchRef = db.collection("matches").doc(matchId);

    // Get current match data
    const matchDoc = await matchRef.get();
    if (!matchDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Match not found",
      });
    }

    const matchData = matchDoc.data();

    // Update match with completion data
    const updateData = {
      status: "completed",
      completedDate: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: req.user?.uid || "system",
    };

    // Add scores if provided
    if (player1Score !== undefined) updateData.player1Score = player1Score;
    if (player2Score !== undefined) updateData.player2Score = player2Score;
    if (winnerId) updateData.winnerId = winnerId;
    if (loserId) updateData.loserId = loserId;
    if (notes) updateData.notes = notes;

    // Add score update history
    if (player1Score !== undefined && player2Score !== undefined) {
      updateData.scoreUpdateHistory = admin.firestore.FieldValue.arrayUnion({
        previousScores: {
          player1Score: matchData.player1Score || 0,
          player2Score: matchData.player2Score || 0,
        },
        newScores: {
          player1Score,
          player2Score,
        },
        previousStatus: matchData.status,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: req.user?.uid || "system",
      });
    }

    // Update the match
    await matchRef.update(updateData);

    // Sync player stats automatically
    const syncResult = await statsService.syncMatchPlayers(matchId);

    res.json({
      success: true,
      message: "Match completed and player stats synced successfully",
      data: {
        matchId,
        syncResult,
      },
    });
  } catch (error) {
    logger.error("Error completing match:", error);
    res.status(500).json({
      success: false,
      error: "Failed to complete match",
    });
  }
});

/**
 * Update match scores and sync stats if completed
 * PUT /api/matches/:matchId/scores
 */
router.put("/:matchId/scores", async (req, res) => {
  try {
    const { matchId } = req.params;
    const { player1Score, player2Score, winnerId, loserId } = req.body;

    if (!matchId) {
      return res.status(400).json({
        success: false,
        error: "Match ID is required",
      });
    }

    if (player1Score === undefined || player2Score === undefined) {
      return res.status(400).json({
        success: false,
        error: "Both player scores are required",
      });
    }

    const db = admin.firestore();
    const matchRef = db.collection("matches").doc(matchId);

    // Get current match data
    const matchDoc = await matchRef.get();
    if (!matchDoc.exists) {
      return res.status(404).json({
        success: false,
        error: "Match not found",
      });
    }

    const matchData = matchDoc.data();

    // Update match scores
    const updateData = {
      player1Score,
      player2Score,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdatedBy: req.user?.uid || "system",
    };

    // Add winner/loser if provided
    if (winnerId) updateData.winnerId = winnerId;
    if (loserId) updateData.loserId = loserId;

    // Add score update history
    updateData.scoreUpdateHistory = admin.firestore.FieldValue.arrayUnion({
      previousScores: {
        player1Score: matchData.player1Score || 0,
        player2Score: matchData.player2Score || 0,
      },
      newScores: {
        player1Score,
        player2Score,
      },
      previousStatus: matchData.status,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: req.user?.uid || "system",
    });

    // Update the match
    await matchRef.update(updateData);

    let syncResult = null;

    // If match is completed, sync player stats
    if (matchData.status === "completed") {
      syncResult = await statsService.syncMatchPlayers(matchId);
    }

    res.json({
      success: true,
      message: "Match scores updated successfully",
      data: {
        matchId,
        scores: { player1Score, player2Score },
        syncResult,
      },
    });
  } catch (error) {
    logger.error("Error updating match scores:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update match scores",
    });
  }
});

module.exports = router;
