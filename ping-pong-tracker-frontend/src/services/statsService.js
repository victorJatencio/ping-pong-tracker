// src/services/statsService.js
import { db } from '../config/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  getDoc,
  serverTimestamp 
} from 'firebase/firestore';

class StatsService {
  constructor() {
    this.playersCache = new Map();
    this.lastUpdate = null;
  }

  /**
   * Calculate comprehensive player statistics from match data
   * @param {string} playerId - The player's UID
   * @returns {Object} Player statistics object
   */
  async calculatePlayerStats(playerId) {
    try {
      // Fetch all completed matches for this player
      const matchesRef = collection(db, 'matches');
      const playerMatchesQuery = query(
        matchesRef,
        where('status', '==', 'completed')
      );
      
      const querySnapshot = await getDocs(playerMatchesQuery);
      const allMatches = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter matches where this player participated
      const playerMatches = allMatches.filter(match => 
        match.player1Id === playerId || match.player2Id === playerId
      );

      if (playerMatches.length === 0) {
        return this.getDefaultStats(playerId);
      }

      // Calculate basic statistics
      const totalMatches = playerMatches.length;
      const wins = playerMatches.filter(match => match.winnerId === playerId);
      const losses = playerMatches.filter(match => match.loserId === playerId);
      const totalWins = wins.length;
      const totalLosses = losses.length;
      const winRate = totalMatches > 0 ? (totalWins / totalMatches) * 100 : 0;

      // Calculate current streak
      const { currentStreak, streakType } = this.calculateStreak(playerMatches, playerId);

      // Calculate average score differential
      const avgScoreDiff = this.calculateAverageScoreDifferential(playerMatches, playerId);

      // Calculate recent form (last 5 matches)
      const recentForm = this.calculateRecentForm(playerMatches, playerId, 5);

      // Calculate recent win rate (last 10 matches for bonus)
      const recentMatches = playerMatches
        .sort((a, b) => new Date(b.completedDate?.toDate()) - new Date(a.completedDate?.toDate()))
        .slice(0, 10);
      const recentWinRate = recentMatches.length > 0 
        ? (recentMatches.filter(match => match.winnerId === playerId).length / recentMatches.length) * 100 
        : winRate;

      // Calculate final ranking score
      const rankingScore = this.calculateRankingScore(winRate, totalWins, recentWinRate);

      // Calculate location-based statistics
      const locationStats = this.calculateLocationStats(playerMatches, playerId);

      // Calculate monthly statistics
      const monthlyStats = this.calculateMonthlyStats(playerMatches, playerId);

      return {
        playerId,
        totalMatches,
        totalWins,
        totalLosses,
        winRate: Math.round(winRate * 100) / 100, // Round to 2 decimal places
        currentStreak,
        streakType,
        averageScoreDiff: Math.round(avgScoreDiff * 100) / 100,
        recentForm,
        recentWinRate: Math.round(recentWinRate * 100) / 100,
        rankingScore: Math.round(rankingScore * 100) / 100,
        locationStats,
        monthlyStats,
        lastUpdated: new Date(),
        lastMatchDate: playerMatches.length > 0 
          ? playerMatches.sort((a, b) => new Date(b.completedDate?.toDate()) - new Date(a.completedDate?.toDate()))[0].completedDate
          : null
      };
    } catch (error) {
      console.error('Error calculating player stats:', error);
      return this.getDefaultStats(playerId);
    }
  }

  /**
   * Calculate ranking score using weighted formula
   */
  calculateRankingScore(winRate, totalWins, recentWinRate) {
    // Primary: Win Rate (70% weight)
    const winRateScore = winRate * 0.7;
    
    // Secondary: Total Wins (20% weight) - normalized to prevent inflation
    const winsScore = Math.min(totalWins * 2, 40) * 0.2; // Cap at 20 wins for scoring
    
    // Bonus: Recent Performance (10% weight)
    const recentBonus = (recentWinRate - winRate) * 0.1;
    
    return Math.max(0, winRateScore + winsScore + recentBonus);
  }

  /**
   * Calculate current win/loss streak
   */
  calculateStreak(matches, playerId) {
    if (matches.length === 0) return { currentStreak: 0, streakType: 'none' };

    // Sort matches by completion date (most recent first)
    const sortedMatches = matches.sort((a, b) => 
      new Date(b.completedDate?.toDate()) - new Date(a.completedDate?.toDate())
    );

    let streak = 0;
    let streakType = 'none';
    const lastMatchResult = sortedMatches[0].winnerId === playerId ? 'win' : 'loss';
    streakType = lastMatchResult === 'win' ? 'wins' : 'losses';

    // Count consecutive wins or losses from most recent match
    for (const match of sortedMatches) {
      const isWin = match.winnerId === playerId;
      if ((lastMatchResult === 'win' && isWin) || (lastMatchResult === 'loss' && !isWin)) {
        streak++;
      } else {
        break;
      }
    }

    return { currentStreak: streak, streakType };
  }

  /**
   * Calculate average score differential
   */
  calculateAverageScoreDifferential(matches, playerId) {
    if (matches.length === 0) return 0;

    const totalDiff = matches.reduce((sum, match) => {
      const isPlayer1 = match.player1Id === playerId;
      const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
      const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
      return sum + (playerScore - opponentScore);
    }, 0);

    return totalDiff / matches.length;
  }

  /**
   * Calculate recent form (array of recent match results)
   */
  calculateRecentForm(matches, playerId, count = 5) {
    const sortedMatches = matches
      .sort((a, b) => new Date(b.completedDate?.toDate()) - new Date(a.completedDate?.toDate()))
      .slice(0, count);

    return sortedMatches.map(match => match.winnerId === playerId);
  }

  /**
   * Calculate statistics by location
   */
  calculateLocationStats(matches, playerId) {
    const locationStats = {};

    matches.forEach(match => {
      const location = match.location || 'Unknown';
      if (!locationStats[location]) {
        locationStats[location] = { wins: 0, losses: 0, matches: 0 };
      }

      locationStats[location].matches++;
      if (match.winnerId === playerId) {
        locationStats[location].wins++;
      } else {
        locationStats[location].losses++;
      }
    });

    // Calculate win rates for each location
    Object.keys(locationStats).forEach(location => {
      const stats = locationStats[location];
      stats.winRate = stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
    });

    return locationStats;
  }

  /**
   * Calculate monthly statistics
   */
  calculateMonthlyStats(matches, playerId) {
    const monthlyStats = {};

    matches.forEach(match => {
      const date = new Date(match.completedDate?.toDate());
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { wins: 0, losses: 0, matches: 0 };
      }

      monthlyStats[monthKey].matches++;
      if (match.winnerId === playerId) {
        monthlyStats[monthKey].wins++;
      } else {
        monthlyStats[monthKey].losses++;
      }
    });

    // Calculate win rates for each month
    Object.keys(monthlyStats).forEach(month => {
      const stats = monthlyStats[month];
      stats.winRate = stats.matches > 0 ? (stats.wins / stats.matches) * 100 : 0;
    });

    return monthlyStats;
  }

  /**
   * Get default statistics for new players
   */
  getDefaultStats(playerId) {
    return {
      playerId,
      totalMatches: 0,
      totalWins: 0,
      totalLosses: 0,
      winRate: 0,
      currentStreak: 0,
      streakType: 'none',
      averageScoreDiff: 0,
      recentForm: [],
      recentWinRate: 0,
      rankingScore: 0,
      locationStats: {},
      monthlyStats: {},
      lastUpdated: new Date(),
      lastMatchDate: null
    };
  }

  /**
   * Calculate and update statistics for all players
   */
  async updateAllPlayerStats() {
    try {
      console.log('Updating all player statistics...');
      
      // Get all users
      const usersRef = collection(db, 'users');
      const usersSnapshot = await getDocs(usersRef);
      
      const updatePromises = usersSnapshot.docs.map(async (userDoc) => {
        const playerId = userDoc.id;
        const stats = await this.calculatePlayerStats(playerId);
        
        // Store stats in playerStats collection
        const statsRef = doc(db, 'playerStats', playerId);
        await setDoc(statsRef, {
          ...stats,
          lastUpdated: serverTimestamp()
        });
        
        return stats;
      });

      const allStats = await Promise.all(updatePromises);
      console.log(`Updated statistics for ${allStats.length} players`);
      
      return allStats;
    } catch (error) {
      console.error('Error updating all player stats:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard data sorted by ranking score
   */
  async getLeaderboard() {
    try {
      const statsRef = collection(db, 'playerStats');
      const statsQuery = query(statsRef, orderBy('rankingScore', 'desc'));
      const snapshot = await getDocs(statsQuery);
      
      const leaderboardData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Add ranking positions
      return leaderboardData.map((player, index) => ({
        ...player,
        rank: index + 1
      }));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      throw error;
    }
  }

  /**
   * Set up real-time listener for leaderboard updates
   */
  onLeaderboardUpdate(callback) {
    const statsRef = collection(db, 'playerStats');
    const statsQuery = query(statsRef, orderBy('rankingScore', 'desc'));
    
    return onSnapshot(statsQuery, (snapshot) => {
      const leaderboardData = snapshot.docs.map((doc, index) => ({
        id: doc.id,
        rank: index + 1,
        ...doc.data()
      }));
      
      callback(leaderboardData);
    }, (error) => {
      console.error('Error in leaderboard listener:', error);
    });
  }

  /**
   * Update statistics for specific players (when match is completed)
   */
  async updatePlayerStats(playerIds) {
    try {
      const updatePromises = playerIds.map(async (playerId) => {
        const stats = await this.calculatePlayerStats(playerId);
        const statsRef = doc(db, 'playerStats', playerId);
        await setDoc(statsRef, {
          ...stats,
          lastUpdated: serverTimestamp()
        });
        return stats;
      });

      return await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating specific player stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const statsService = new StatsService();
export default statsService;