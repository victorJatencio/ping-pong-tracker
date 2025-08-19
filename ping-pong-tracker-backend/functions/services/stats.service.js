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
      const matchesSnapshot = await db
        .collection("matches")
        .where("status", "==", "completed")
        .where("participants", "array-contains", playerId)
        .orderBy("completedDate", "asc")
        .get();

      if (matchesSnapshot.empty) {
        logger.info(`No completed matches found for player: ${playerId}`);
        return await this.createEmptyPlayerStats(playerId);
      }

      const matches = matchesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

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
      const dateA =
        (a.completedDate && a.completedDate.toDate()) || new Date(0);
      const dateB =
        (b.completedDate && b.completedDate.toDate()) || new Date(0);
      return dateA - dateB;
    });

    // Calculate stats from each match
    for (const match of sortedMatches) {
      let isWinner = false;

      // Method 1: Check winnerId field (if not null)
      if (match.winnerId && match.winnerId !== null) {
        isWinner = match.winnerId === playerId;
      }
      // Method 2: Calculate from scores (fallback for null winnerId)
      else if (
        match.player1Id &&
        match.player2Id &&
        match.player1Score !== undefined &&
        match.player2Score !== undefined
      ) {
        // Convert scores to numbers to ensure proper comparison
        const player1Score = parseInt(match.player1Score) || 0;
        const player2Score = parseInt(match.player2Score) || 0;

        if (match.player1Id === playerId) {
          // Current player is player1
          isWinner = player1Score > player2Score;
        } else if (match.player2Id === playerId) {
          // Current player is player2
          isWinner = player2Score > player1Score;
        }

        // Log for debugging
        console.log(
          `Match ${match.id}: winnerId was null, calculated from scores`
        );
        console.log(`  Player1 (${match.player1Id}): ${player1Score}`);
        console.log(`  Player2 (${match.player2Id}): ${player2Score}`);
        console.log(`  Current player (${playerId}) is winner: ${isWinner}`);
      }
      // Method 3: Check loserId field (if winnerId is null but loserId exists)
      else if (match.loserId && match.loserId !== null) {
        isWinner = match.loserId !== playerId; // If not the loser, then winner
      } else {
        // Unable to determine winner - log warning
        console.warn(`Unable to determine winner for match ${match.id}:`, {
          winnerId: match.winnerId,
          loserId: match.loserId,
          player1Id: match.player1Id,
          player2Id: match.player2Id,
          player1Score: match.player1Score,
          player2Score: match.player2Score,
        });
        continue; // Skip this match
      }

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

  /**
   * Get player statistics
   * @param {string} playerId - The player ID
   * @returns {Promise<Object>} Player statistics
   */
  /**
   * Get player statistics (FIXED - uses correct field names)
   * @param {string} playerId - The player ID
   * @returns {Promise<Object>} Player statistics calculated from matches
   */
  async getPlayerStats(playerId) {
    try {
      logger.info(
        `Getting player stats for: ${playerId} (calculating from matches)`
      );
      const db = this.getDb();

      // Get ALL completed matches first (no participants filter)
      const matchesSnapshot = await db
        .collection("matches")
        .where("status", "==", "completed")
        .get();

      if (matchesSnapshot.empty) {
        logger.info(`No completed matches found in database`);
        return this.createEmptyPlayerStats(playerId);
      }

      // Filter matches for this player in JavaScript
      let matches = matchesSnapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(
          (match) =>
            match.player1Id === playerId || match.player2Id === playerId
        );

      if (matches.length === 0) {
        logger.info(`No matches found for player: ${playerId}`);
        return this.createEmptyPlayerStats(playerId);
      }

      // Sort matches in JavaScript
      matches = matches.sort((a, b) => {
        const dateA = a.completedDate?.toDate?.() || new Date(a.completedDate);
        const dateB = b.completedDate?.toDate?.() || new Date(b.completedDate);
        return dateA - dateB;
      });

      logger.info(
        `Found ${matches.length} completed matches for player: ${playerId}`
      );

      const calculatedStats = this.calculatePlayerStats(playerId, matches);

      const finalStats = {
        ...calculatedStats,
        dataSource: "matches",
        calculatedAt: new Date().toISOString(),
        matchCount: matches.length,
        lastMatchDate:
          matches.length > 0 ? matches[matches.length - 1].completedDate : null,
      };

      logger.info(`Stats calculated successfully for player ${playerId}:`, {
        totalWins: finalStats.totalWins,
        gamesPlayed: finalStats.gamesPlayed,
        winStreak: finalStats.winStreak,
        dataSource: finalStats.dataSource,
        matchCount: finalStats.matchCount,
      });

      return finalStats;
    } catch (error) {
      logger.error(`Error getting player stats for ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Create empty player stats for players with no matches
   * @param {string} playerId - The player ID
   * @returns {Object} Empty stats object
   */
  createEmptyPlayerStats(playerId) {
    return {
      playerId,
      totalWins: 0,
      gamesPlayed: 0,
      winStreak: 0,
      maxWinStreak: 0,
      totalLosses: 0,
      dataSource: "matches",
      calculatedAt: new Date().toISOString(),
      matchCount: 0,
      lastMatchDate: null,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    };
  }

  /**
   * Validate and fix data inconsistencies
   * @param {string} playerId - The player ID to validate
   * @returns {Promise<Object>} Validation results
   */
  async validatePlayerStats(playerId) {
    try {
      const db = this.getDb();

      // Get current stats from playerStats collection
      const currentStats = await this.getPlayerStats(playerId);

      // Calculate what stats should be based on matches
      const matchesSnapshot = await db
        .collection("matches")
        .where("status", "==", "completed")
        .where("participants", "array-contains", playerId)
        .get();

      const matches = matchesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const calculatedStats = this.calculatePlayerStats(playerId, matches);

      // Compare current vs calculated
      const discrepancies = {};
      const fieldsToCheck = ["totalWins", "gamesPlayed", "winStreak"];

      fieldsToCheck.forEach((field) => {
        if (currentStats[field] !== calculatedStats[field]) {
          discrepancies[field] = {
            current: currentStats[field],
            calculated: calculatedStats[field],
            difference: calculatedStats[field] - currentStats[field],
          };
        }
      });

      return {
        playerId,
        hasDiscrepancies: Object.keys(discrepancies).length > 0,
        discrepancies,
        currentStats,
        calculatedStats,
        matchCount: matches.length,
      };
    } catch (error) {
      logger.error(`Error validating stats for player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Get leaderboard preview (top 3 players by wins)
   * @returns {Promise<Array>} Array of top 3 players with user details
   */
  async getLeaderboardPreview() {
    try {
      logger.info("Getting leaderboard preview (top 3 players)");
      const db = this.getDb();

      // Get top players by total wins
      const playerStatsSnapshot = await db
        .collection("playerStats")
        .orderBy("totalWins", "desc")
        .limit(3)
        .get();

      if (playerStatsSnapshot.empty) {
        logger.info("No player stats found for leaderboard");
        return [];
      }

      // Get user details for each player
      const leaderboardData = [];

      for (const doc of playerStatsSnapshot.docs) {
        const stats = doc.data();
        const playerId = doc.id;

        try {
          // Get user details from users collection
          const userDoc = await db.collection("users").doc(playerId).get();

          let userDetails = {
            id: playerId,
            displayName: "Unknown Player",
            profileImage: null,
            initials: "??",
          };

          if (userDoc.exists()) {
            // ← Fix: Add parentheses
            const userData = userDoc.data(); // ← Move userData definition BEFORE using it
            userDetails = {
              id: playerId,
              displayName:
                userData.displayName || userData.name || "Unknown Player",
              profileImage: userData.photoURL || null, // ← Now userData is properly defined
              initials: this.generateInitials(
                userData.displayName || userData.name
              ),
            };
          }

          leaderboardData.push({
            position: leaderboardData.length + 1,
            player: userDetails,
            stats: {
              totalWins: stats.totalWins || stats.data?.totalWins || 0,
              gamesPlayed: stats.gamesPlayed || stats.data?.gamesPlayed || 0,
              winStreak: stats.winStreak || stats.data?.winStreak || 0,
            },
          });
        } catch (userError) {
          logger.warn(
            `Could not fetch user details for player ${playerId}:`,
            userError
          );

          // Add player with minimal info if user details fail
          leaderboardData.push({
            position: leaderboardData.length + 1,
            player: {
              id: playerId,
              displayName: "Unknown Player",
              profileImage: null,
              initials: "??",
            },
            stats: {
              totalWins: stats.totalWins || 0,
              gamesPlayed: stats.gamesPlayed || 0,
              winStreak: stats.winStreak || 0,
            },
          });
        }
      }

      logger.info(
        `Leaderboard preview generated with ${leaderboardData.length} players`
      );
      return leaderboardData;
    } catch (error) {
      logger.error("Error getting leaderboard preview:", error);
      throw error;
    }
  }

  /**
   * Get all player statistics for leaderboard
   * @returns {Promise<Array>} Array of all player stats
   */
  async getAllPlayerStats() {
    try {
      logger.info("Getting all player statistics");
      const db = this.getDb();

      // Get all player stats
      const playerStatsSnapshot = await db
        .collection("playerStats")
        .orderBy("totalWins", "desc")
        .get();

      if (playerStatsSnapshot.empty) {
        logger.info("No player stats found");
        return [];
      }

      // Get user details for each player
      const allStatsData = [];

      for (const doc of playerStatsSnapshot.docs) {
        const stats = doc.data();
        const playerId = doc.id;

        try {
          // Get user details from users collection
          const userDoc = await db.collection("users").doc(playerId).get();

          let userDetails = {
            id: playerId,
            displayName: "Unknown Player",
            profileImage: null,
            initials: "??",
          };

          if (userDoc.exists()) {
            const userData = userDoc.data();
            userDetails = {
              id: playerId,
              displayName:
                userData.displayName || userData.name || "Unknown Player",
              profileImage: userData.photoURL || null,
              initials: this.generateInitials(
                userData.displayName || userData.name
              ),
            };
          }

          allStatsData.push({
            player: userDetails,
            stats: {
              totalWins: stats.totalWins || 0,
              totalLosses: stats.totalLosses || 0,
              gamesPlayed: stats.gamesPlayed || 0,
              winRate: stats.winRate || 0,
              winStreak: stats.winStreak || 0,
              maxWinStreak: stats.maxWinStreak || 0,
              rankingScore: stats.rankingScore || 0,
              lastMatchDate: stats.lastMatchDate || null,
            },
          });
        } catch (userError) {
          logger.warn(
            `Could not fetch user details for player ${playerId}:`,
            userError
          );

          // Add player with minimal info if user details fail
          allStatsData.push({
            player: {
              id: playerId,
              displayName: "Unknown Player",
              profileImage: null,
              initials: "??",
            },
            stats: {
              totalWins: stats.totalWins || 0,
              totalLosses: stats.totalLosses || 0,
              gamesPlayed: stats.gamesPlayed || 0,
              winRate: stats.winRate || 0,
              winStreak: stats.winStreak || 0,
              maxWinStreak: stats.maxWinStreak || 0,
              rankingScore: stats.rankingScore || 0,
              lastMatchDate: stats.lastMatchDate || null,
            },
          });
        }
      }

      logger.info(`All player stats retrieved: ${allStatsData.length} players`);
      return allStatsData;
    } catch (error) {
      logger.error("Error getting all player stats:", error);
      throw error;
    }
  }

  /**
   * Generate initials from display name
   * @param {string} displayName - The display name
   * @returns {string} Generated initials
   */
  generateInitials(displayName) {
    if (!displayName || typeof displayName !== "string") {
      return "??";
    }

    const words = displayName.trim().split(/\s+/);

    if (words.length === 1) {
      // Single word: take first two characters
      return words[0].substring(0, 2).toUpperCase();
    } else {
      // Multiple words: take first character of first two words
      return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    }
  }
}

module.exports = new StatsService();
