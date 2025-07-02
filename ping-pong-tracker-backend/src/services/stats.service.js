const admin = require("firebase-admin");
const logger = require("../utils/logger");

/**
 * Enhanced Stats Service
 * Automatically syncs playerStats with matches collection
 * Calculates: totalWins, winStreak, gamesPlayed
 */
class StatsService {
  constructor() {
    this.db = null;
  }

  /**
   * Get Firestore database instance
   */
  getDb() {
    if (!this.db) {
      this.db = admin.firestore();
    }
    return this.db;
  }

  /**
   * Sync player statistics based on completed matches
   * @param {string} playerId - The player ID to sync stats for
   * @returns {Promise<Object>} Updated player stats
   */
  async syncPlayerStats(playerId) {
    try {
      logger.info(`Starting stats sync for player: ${playerId}`);
      const db = this.getDb();

      // Get all completed matches for this player
      const matchesQuery1 = db
        .collection("matches")
        .where("status", "==", "completed")
        .where("player1Id", "==", playerId);

      const matchesQuery2 = db
        .collection("matches")
        .where("status", "==", "completed")
        .where("player2Id", "==", playerId);

      const [snapshot1, snapshot2] = await Promise.all([
        matchesQuery1.get(),
        matchesQuery2.get(),
      ]);

      // Combine results and remove duplicates
      const allMatches = new Map();

      snapshot1.docs.forEach((doc) => {
        allMatches.set(doc.id, { id: doc.id, ...doc.data() });
      });

      snapshot2.docs.forEach((doc) => {
        allMatches.set(doc.id, { id: doc.id, ...doc.data() });
      });

      const matches = Array.from(allMatches.values());

      if (matches.length === 0) {
        logger.info(`No completed matches found for player: ${playerId}`);
        return await this.createEmptyPlayerStats(playerId);
      }

      // Calculate stats from matches
      const stats = this.calculatePlayerStats(playerId, matches);

      // Update playerStats collection
      const playerStatsRef = db.collection("playerStats").doc(playerId);
      await playerStatsRef.set(
        {
          ...stats,
          lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSyncedMatchCount: matches.length,
        },
        { merge: true }
      );

      logger.info(`Stats synced successfully for player ${playerId}:`, stats);
      return stats;
    } catch (error) {
      logger.error(`Error syncing stats for player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate player statistics from matches
   * @param {string} playerId - The player ID
   * @param {Array} matches - Array of completed matches
   * @returns {Object} Calculated stats
   */
  calculatePlayerStats(playerId, matches) {
    let totalWins = 0;
    let gamesPlayed = matches.length;
    let currentWinStreak = 0;
    let maxWinStreak = 0;
    let tempWinStreak = 0;

    // Sort matches by completion date to calculate win streak correctly
    const sortedMatches = matches.sort((a, b) => {
      const dateA = a.completedDate?.toDate() || new Date(0);
      const dateB = b.completedDate?.toDate() || new Date(0);
      return dateA - dateB;
    });

    // Calculate stats from each match
    for (const match of sortedMatches) {
      const isWinner = match.winnerId === playerId;

      if (isWinner) {
        totalWins++;
        tempWinStreak++;
        maxWinStreak = Math.max(maxWinStreak, tempWinStreak);
      } else {
        tempWinStreak = 0; // Reset streak on loss
      }
    }

    // Current win streak is the streak at the end (most recent matches)
    currentWinStreak = tempWinStreak;

    return {
      playerId,
      totalWins,
      gamesPlayed,
      winStreak: currentWinStreak,
      maxWinStreak,
      totalLosses: gamesPlayed - totalWins,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  /**
   * Create empty player stats for new players
   * @param {string} playerId - The player ID
   * @returns {Promise<Object>} Empty stats object
   */
  async createEmptyPlayerStats(playerId) {
    const emptyStats = {
      playerId,
      totalWins: 0,
      gamesPlayed: 0,
      winStreak: 0,
      maxWinStreak: 0,
      totalLosses: 0,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      lastSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSyncedMatchCount: 0,
    };

    const db = this.getDb();
    await db
      .collection("playerStats")
      .doc(playerId)
      .set(emptyStats, { merge: true });

    logger.info(`Created empty stats for new player: ${playerId}`);
    return emptyStats;
  }

  /**
   * Sync stats for both players involved in a match
   * @param {string} matchId - The match ID
   * @returns {Promise<Object>} Sync results for both players
   */
  async syncMatchPlayers(matchId) {
    try {
      logger.info(`Syncing stats for match: ${matchId}`);
      const db = this.getDb();

      // Get the match details
      const matchDoc = await db.collection("matches").doc(matchId).get();

      if (!matchDoc.exists) {
        throw new Error(`Match not found: ${matchId}`);
      }

      const matchData = matchDoc.data();

      if (matchData.status !== "completed") {
        logger.info(`Match ${matchId} is not completed, skipping stats sync`);
        return { skipped: true, reason: "Match not completed" };
      }

      // Sync stats for both players
      const [player1Stats, player2Stats] = await Promise.all([
        this.syncPlayerStats(matchData.player1Id),
        this.syncPlayerStats(matchData.player2Id),
      ]);

      logger.info(`Successfully synced stats for match ${matchId}`);
      return {
        matchId,
        player1Stats,
        player2Stats,
        syncedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Error syncing match players for match ${matchId}:`, error);
      throw error;
    }
  }

  /**
   * Get player statistics
   * @param {string} playerId - The player ID
   * @returns {Promise<Object>} Player statistics
   */
  async getPlayerStats(playerId) {
    try {
      const db = this.getDb();
      const playerStatsDoc = await db
        .collection("playerStats")
        .doc(playerId)
        .get();

      if (!playerStatsDoc.exists) {
        logger.info(
          `No stats found for player ${playerId}, creating empty stats`
        );
        return await this.createEmptyPlayerStats(playerId);
      }

      return {
        id: playerStatsDoc.id,
        ...playerStatsDoc.data(),
      };
    } catch (error) {
      logger.error(`Error getting stats for player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Sync stats for all players (bulk operation)
   * @returns {Promise<Array>} Array of sync results
   */
  async syncAllPlayerStats() {
    try {
      logger.info("Starting bulk stats sync for all players");
      const db = this.getDb();

      // Get all unique player IDs from completed matches
      const matchesSnapshot = await db
        .collection("matches")
        .where("status", "==", "completed")
        .get();

      const playerIds = new Set();
      matchesSnapshot.docs.forEach((doc) => {
        const match = doc.data();
        if (match.player1Id) playerIds.add(match.player1Id);
        if (match.player2Id) playerIds.add(match.player2Id);
      });

      logger.info(`Found ${playerIds.size} unique players to sync`);

      // Sync stats for each player
      const syncResults = [];
      for (const playerId of playerIds) {
        try {
          const stats = await this.syncPlayerStats(playerId);
          syncResults.push({ playerId, success: true, stats });
        } catch (error) {
          logger.error(`Failed to sync stats for player ${playerId}:`, error);
          syncResults.push({ playerId, success: false, error: error.message });
        }
      }

      logger.info(
        `Bulk sync completed. ${syncResults.filter((r) => r.success).length}/${
          syncResults.length
        } players synced successfully`
      );
      return syncResults;
    } catch (error) {
      logger.error("Error in bulk stats sync:", error);
      throw error;
    }
  }
}

module.exports = new StatsService();
