const express = require("express");
const statsService = require("../../services/stats.service");
const logger = require("../../utils/logger");

const router = express.Router();

/**
 * Get player statistics
 * GET /api/stats/player/:playerId
 */
router.get("/player/:playerId", async (req, res) => {
  try {
    const {playerId} = req.params;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: "Player ID is required",
      });
    }

    const stats = await statsService.getPlayerStats(playerId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error getting player stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get player statistics",
    });
  }
});

/**
 * Get leaderboard preview (top 3 players)
 * GET /api/stats/leaderboard/preview
 */
router.get("/leaderboard/preview", async (req, res) => {
  try {
    logger.info("Leaderboard preview requested");

    const leaderboard = await statsService.getLeaderboardPreview();

    res.json({
      success: true,
      data: leaderboard,
      meta: {
        count: leaderboard.length,
        type: "preview",
        maxResults: 3,
      },
    });
  } catch (error) {
    logger.error("Error getting leaderboard preview:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get leaderboard preview",
    });
  }
});

/**
 * Sync player statistics
 * POST /api/stats/player/:playerId/sync
 */
router.post("/player/:playerId/sync", async (req, res) => {
  try {
    const {playerId} = req.params;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        error: "Player ID is required",
      });
    }

    const stats = await statsService.syncPlayerStats(playerId);

    res.json({
      success: true,
      message: "Player stats synced successfully",
      data: stats,
    });
  } catch (error) {
    logger.error("Error syncing player stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to sync player statistics",
    });
  }
});

/**
 * Sync all player statistics (Admin endpoint)
 * POST /api/stats/sync-all
 */
router.post("/sync-all", async (req, res) => {
  try {
    const results = await statsService.syncAllPlayerStats();

    const successCount = results.filter((r) => r.success).length;
    const totalCount = results.length;

    res.json({
      success: true,
      message: `Synced ${successCount}/${totalCount} players successfully`,
      data: results,
    });
  } catch (error) {
    logger.error("Error syncing all player stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to sync all player statistics",
    });
  }
});

module.exports = router;
