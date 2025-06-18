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
  // New section

  async getPlayerProfileStats(playerId) {
  try {
    console.log('Getting profile stats for player:', playerId);
    
    // Get basic stats from playerStats collection
    const statsRef = doc(db, 'playerStats', playerId);
    const statsDoc = await getDoc(statsRef);
    
    if (!statsDoc.exists()) {
      console.log('No player stats found, calculating initial statistics...');
      // Calculate stats if they don't exist
      return await this.calculatePlayerStats(playerId);
    }
    
    const basicStats = statsDoc.data();
    console.log('Basic stats found:', basicStats);
    
    // Get detailed match history for profile-specific calculations
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

    const playerMatches = allMatches.filter(match => 
      match.player1Id === playerId || match.player2Id === playerId
    );

    console.log('Found player matches:', playerMatches.length);

    // Calculate profile-specific statistics
    const profileStats = {
      ...basicStats,
      
      // Performance trends (last 30 days)
      performanceTrend: this.calculatePerformanceTrend(playerMatches, playerId, 30),
      
      // Opponent analysis
      opponentStats: this.calculateOpponentStats(playerMatches, playerId),
      
      // Time-based performance
      timeBasedStats: this.calculateTimeBasedStats(playerMatches, playerId),
      
      // Achievement progress
      achievements: this.calculateAchievements(playerMatches, playerId, basicStats),
      
      // Detailed recent form (last 10 matches)
      detailedRecentForm: this.getDetailedRecentForm(playerMatches, playerId, 10),
      
      // Performance by day of week
      dayOfWeekStats: this.calculateDayOfWeekStats(playerMatches, playerId),
      
      // Score analysis
      scoreAnalysis: this.calculateScoreAnalysis(playerMatches, playerId)
    };

    console.log('Profile stats calculated successfully');
    return profileStats;
  } catch (error) {
    console.error('Error getting player profile stats:', error);
    throw error;
  }
}

/**
 * Calculate performance trend over specified days
 * @param {Array} matches - Player's matches
 * @param {string} playerId - Player's UID
 * @param {number} days - Number of days to analyze
 */
calculatePerformanceTrend(matches, playerId, days) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentMatches = matches.filter(match => 
      new Date(match.completedDate?.toDate()) >= cutoffDate
    ).sort((a, b) => new Date(a.completedDate?.toDate()) - new Date(b.completedDate?.toDate()));

    if (recentMatches.length === 0) {
      return [];
    }

    // Group by week for trend analysis
    const weeklyData = {};
    recentMatches.forEach(match => {
      const date = new Date(match.completedDate?.toDate());
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = { wins: 0, losses: 0, matches: 0 };
      }
      
      weeklyData[weekKey].matches++;
      if (match.winnerId === playerId) {
        weeklyData[weekKey].wins++;
      } else {
        weeklyData[weekKey].losses++;
      }
    });

    // Convert to array with win rates
    return Object.entries(weeklyData).map(([week, stats]) => ({
      week,
      winRate: stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0,
      matches: stats.matches
    }));
  } catch (error) {
    console.error('Error calculating performance trend:', error);
    return [];
  }
}

/**
 * Calculate statistics against different opponents
 * @param {Array} matches - Player's matches
 * @param {string} playerId - Player's UID
 */
calculateOpponentStats(matches, playerId) {
  try {
    const opponentStats = {};
    
    matches.forEach(match => {
      const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id;
      
      if (!opponentStats[opponentId]) {
        opponentStats[opponentId] = {
          wins: 0,
          losses: 0,
          matches: 0,
          totalPointsFor: 0,
          totalPointsAgainst: 0
        };
      }
      
      const stats = opponentStats[opponentId];
      stats.matches++;
      
      const isPlayer1 = match.player1Id === playerId;
      const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
      const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
      
      stats.totalPointsFor += playerScore;
      stats.totalPointsAgainst += opponentScore;
      
      if (match.winnerId === playerId) {
        stats.wins++;
      } else {
        stats.losses++;
      }
      
      stats.winRate = Math.round((stats.wins / stats.matches) * 100);
      stats.avgPointsFor = Math.round((stats.totalPointsFor / stats.matches) * 10) / 10;
      stats.avgPointsAgainst = Math.round((stats.totalPointsAgainst / stats.matches) * 10) / 10;
    });
    
    return opponentStats;
  } catch (error) {
    console.error('Error calculating opponent stats:', error);
    return {};
  }
}

/**
 * Calculate time-based performance statistics
 * @param {Array} matches - Player's matches
 * @param {string} playerId - Player's UID
 */
calculateTimeBasedStats(matches, playerId) {
  try {
    const timeStats = {
      morning: { wins: 0, losses: 0, matches: 0 }, // 6-12
      afternoon: { wins: 0, losses: 0, matches: 0 }, // 12-18
      evening: { wins: 0, losses: 0, matches: 0 } // 18-24
    };
    
    matches.forEach(match => {
      const hour = new Date(match.completedDate?.toDate()).getHours();
      let timeSlot;
      
      if (hour >= 6 && hour < 12) timeSlot = 'morning';
      else if (hour >= 12 && hour < 18) timeSlot = 'afternoon';
      else timeSlot = 'evening';
      
      timeStats[timeSlot].matches++;
      if (match.winnerId === playerId) {
        timeStats[timeSlot].wins++;
      } else {
        timeStats[timeSlot].losses++;
      }
    });
    
    // Calculate win rates
    Object.keys(timeStats).forEach(timeSlot => {
      const stats = timeStats[timeSlot];
      stats.winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
    });
    
    return timeStats;
  } catch (error) {
    console.error('Error calculating time-based stats:', error);
    return {
      morning: { wins: 0, losses: 0, matches: 0, winRate: 0 },
      afternoon: { wins: 0, losses: 0, matches: 0, winRate: 0 },
      evening: { wins: 0, losses: 0, matches: 0, winRate: 0 }
    };
  }
}

/**
 * Calculate achievements and progress
 * @param {Array} matches - Player's matches
 * @param {string} playerId - Player's UID
 * @param {Object} basicStats - Basic player statistics
 */
calculateAchievements(matches, playerId, basicStats) {
  try {
    const achievements = [];
    
    // Win-based achievements
    if (basicStats.totalWins >= 1) achievements.push({ 
      id: 'first_win', 
      name: 'First Victory', 
      description: 'Won your first match', 
      unlocked: true 
    });
    if (basicStats.totalWins >= 5) achievements.push({ 
      id: 'five_wins', 
      name: 'Getting Started', 
      description: 'Won 5 matches', 
      unlocked: true 
    });
    if (basicStats.totalWins >= 10) achievements.push({ 
      id: 'ten_wins', 
      name: 'Double Digits', 
      description: 'Won 10 matches', 
      unlocked: true 
    });
    if (basicStats.totalWins >= 25) achievements.push({ 
      id: 'quarter_century', 
      name: 'Quarter Century', 
      description: 'Won 25 matches', 
      unlocked: true 
    });
    if (basicStats.totalWins >= 50) achievements.push({ 
      id: 'half_century', 
      name: 'Half Century', 
      description: 'Won 50 matches', 
      unlocked: true 
    });
    
    // Streak-based achievements
    if (basicStats.currentStreak >= 3 && basicStats.streakType === 'wins') {
      achievements.push({ 
        id: 'three_streak', 
        name: 'Hot Streak', 
        description: 'Won 3 matches in a row', 
        unlocked: true 
      });
    }
    if (basicStats.currentStreak >= 5 && basicStats.streakType === 'wins') {
      achievements.push({ 
        id: 'five_streak', 
        name: 'On Fire', 
        description: 'Won 5 matches in a row', 
        unlocked: true 
      });
    }
    
    // Win rate achievements
    if (basicStats.winRate >= 70 && basicStats.totalMatches >= 10) {
      achievements.push({ 
        id: 'high_win_rate', 
        name: 'Dominator', 
        description: '70%+ win rate with 10+ matches', 
        unlocked: true 
      });
    }
    
    // Activity achievements
    if (basicStats.totalMatches >= 20) {
      achievements.push({ 
        id: 'active_player', 
        name: 'Active Player', 
        description: 'Played 20+ matches', 
        unlocked: true 
      });
    }
    
    return achievements;
  } catch (error) {
    console.error('Error calculating achievements:', error);
    return [];
  }
}

/**
 * Get detailed recent form with match details
 * @param {Array} matches - Player's matches
 * @param {string} playerId - Player's UID
 * @param {number} count - Number of recent matches to analyze
 */
getDetailedRecentForm(matches, playerId, count = 10) {
  try {
    return matches
      .sort((a, b) => new Date(b.completedDate?.toDate()) - new Date(a.completedDate?.toDate()))
      .slice(0, count)
      .map(match => {
        const isPlayer1 = match.player1Id === playerId;
        const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
        const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
        const opponentId = isPlayer1 ? match.player2Id : match.player1Id;
        
        return {
          matchId: match.id,
          date: match.completedDate,
          won: match.winnerId === playerId,
          playerScore,
          opponentScore,
          opponentId,
          location: match.location,
          scoreDiff: playerScore - opponentScore
        };
      });
  } catch (error) {
    console.error('Error getting detailed recent form:', error);
    return [];
  }
}

/**
 * Calculate performance by day of week
 * @param {Array} matches - Player's matches
 * @param {string} playerId - Player's UID
 */
calculateDayOfWeekStats(matches, playerId) {
  try {
    const dayStats = {
      0: { wins: 0, losses: 0, matches: 0, name: 'Sunday' },
      1: { wins: 0, losses: 0, matches: 0, name: 'Monday' },
      2: { wins: 0, losses: 0, matches: 0, name: 'Tuesday' },
      3: { wins: 0, losses: 0, matches: 0, name: 'Wednesday' },
      4: { wins: 0, losses: 0, matches: 0, name: 'Thursday' },
      5: { wins: 0, losses: 0, matches: 0, name: 'Friday' },
      6: { wins: 0, losses: 0, matches: 0, name: 'Saturday' }
    };
    
    matches.forEach(match => {
      const dayOfWeek = new Date(match.completedDate?.toDate()).getDay();
      dayStats[dayOfWeek].matches++;
      
      if (match.winnerId === playerId) {
        dayStats[dayOfWeek].wins++;
      } else {
        dayStats[dayOfWeek].losses++;
      }
    });
    
    // Calculate win rates
    Object.keys(dayStats).forEach(day => {
      const stats = dayStats[day];
      stats.winRate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0;
    });
    
    return dayStats;
  } catch (error) {
    console.error('Error calculating day of week stats:', error);
    return {};
  }
}

/**
 * Calculate score analysis
 * @param {Array} matches - Player's matches
 * @param {string} playerId - Player's UID
 */
calculateScoreAnalysis(matches, playerId) {
  try {
    let totalPointsFor = 0;
    let totalPointsAgainst = 0;
    let closeMatches = 0; // Matches decided by 3 points or less
    let blowouts = 0; // Matches decided by 10+ points
    
    matches.forEach(match => {
      const isPlayer1 = match.player1Id === playerId;
      const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
      const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
      
      totalPointsFor += playerScore;
      totalPointsAgainst += opponentScore;
      
      const scoreDiff = Math.abs(playerScore - opponentScore);
      if (scoreDiff <= 3) closeMatches++;
      if (scoreDiff >= 10) blowouts++;
    });
    
    return {
      avgPointsFor: matches.length > 0 ? Math.round((totalPointsFor / matches.length) * 10) / 10 : 0,
      avgPointsAgainst: matches.length > 0 ? Math.round((totalPointsAgainst / matches.length) * 10) / 10 : 0,
      closeMatches,
      blowouts,
      closeMatchRate: matches.length > 0 ? Math.round((closeMatches / matches.length) * 100) : 0,
      blowoutRate: matches.length > 0 ? Math.round((blowouts / matches.length) * 100) : 0
    };
  } catch (error) {
    console.error('Error calculating score analysis:', error);
    return {
      avgPointsFor: 0,
      avgPointsAgainst: 0,
      closeMatches: 0,
      blowouts: 0,
      closeMatchRate: 0,
      blowoutRate: 0
    };
  }
}


  // last section
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