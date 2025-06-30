// ping-pong-tracker-backend/src/services/stats.service.js
const admin = require('firebase-admin');


class StatsService {
    /**
     * Sync player stats after match completion
     * This is the CRITICAL method that fixes the playerStats sync issue
     * @param {string} playerId - Player ID to sync stats for
     * @returns {Promise<Object>} - Updated player stats
     */

    // Helper method to get database instance
    getDb() {
        return admin.firestore();
    }

    async syncPlayerStats(playerId) {
        try {
            const db = this.getDb();
            
            console.log(`Syncing stats for player: ${playerId}`);
            
            // Calculate fresh stats from all completed matches
            const freshStats = await this.calculatePlayerStats(playerId);
            
            // Update playerStats collection
            await db.collection('playerStats').doc(playerId).set(freshStats, { merge: true });
            
            console.log(`Stats synced successfully for player: ${playerId}`);
            return freshStats;
        } catch (error) {
            console.error(`Error syncing stats for player ${playerId}:`, error);
            throw error;
        }
    }

    /**
     * Calculate comprehensive player statistics from match data
     * @param {string} playerId - The player's UID
     * @returns {Promise<Object>} Player statistics object
     */
    async calculatePlayerStats(playerId) {
        try {
            // Fetch all completed matches for this player
            const matchesRef = db.collection('matches');
            const completedMatches = await matchesRef
                .where('status', '==', 'completed')
                .get();
            
            // Filter matches where this player participated
            const playerMatches = [];
            completedMatches.forEach(doc => {
                const matchData = doc.data();
                if (matchData.player1Id === playerId || matchData.player2Id === playerId) {
                    playerMatches.push({
                        id: doc.id,
                        ...matchData
                    });
                }
            });

            if (playerMatches.length === 0) {
                return this.getDefaultStats(playerId);
            }

            // Calculate basic statistics
            const totalMatches = playerMatches.length;
            const wins = playerMatches.filter(match => match.winnerId === playerId);
            const losses = playerMatches.filter(match => match.loserId === playerId);
            const totalWins = wins.length;
            const totalLosses = losses.length;
            const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

            // Calculate current streak
            const { currentStreak, streakType } = this.calculateStreak(playerMatches, playerId);

            // Calculate average score differential
            const avgScoreDiff = this.calculateAverageScoreDifferential(playerMatches, playerId);

            // Calculate recent form (last 5 matches)
            const recentForm = this.calculateRecentForm(playerMatches, playerId, 5);

            // Calculate recent win rate (last 10 matches)
            const recentMatches = playerMatches
                .sort((a, b) => b.completedDate?.toDate() - a.completedDate?.toDate())
                .slice(0, 10);
            const recentWinRate = recentMatches.length > 0 
                ? Math.round((recentMatches.filter(match => match.winnerId === playerId).length / recentMatches.length) * 100)
                : winRate;

            // Calculate ranking score
            const rankingScore = this.calculateRankingScore(winRate, totalWins, recentWinRate);

            // Calculate location-based statistics
            const locationStats = this.calculateLocationStats(playerMatches, playerId);

            // Calculate monthly statistics
            const monthlyStats = this.calculateMonthlyStats(playerMatches, playerId);

            // Get last match date
            const lastMatchDate = playerMatches.length > 0 
                ? playerMatches.sort((a, b) => b.completedDate?.toDate() - a.completedDate?.toDate())[0].completedDate
                : null;

            const stats = {
                playerId,
                totalMatches,
                totalWins,
                totalLosses,
                winRate,
                currentStreak,
                streakType,
                averageScoreDiff: avgScoreDiff,
                recentForm,
                recentWinRate,
                rankingScore,
                locationStats,
                monthlyStats,
                lastMatchDate,
                lastUpdated: admin.firestore.FieldValue.serverTimestamp()
            };

            console.log(`Calculated stats for ${playerId}:`, {
                totalMatches,
                totalWins,
                totalLosses,
                winRate,
                currentStreak
            });

            return stats;
        } catch (error) {
            console.error('Error calculating player stats:', error);
            throw error;
        }
    }

    /**
     * Get player profile stats (enhanced version for frontend)
     * @param {string} playerId - Player ID
     * @returns {Promise<Object>} - Enhanced player statistics
     */
    async getPlayerProfileStats(playerId) {
        try {
            // Get basic stats from playerStats collection
            const statsDoc = await db.collection('playerStats').doc(playerId).get();
            
            if (!statsDoc.exists) {
                console.log('No player stats found, calculating initial statistics...');
                return await this.calculatePlayerStats(playerId);
            }
            
            const basicStats = statsDoc.data();
            
            // Get detailed match history for profile-specific calculations
            const matchesRef = db.collection('matches');
            const completedMatches = await matchesRef
                .where('status', '==', 'completed')
                .get();
            
            const playerMatches = [];
            completedMatches.forEach(doc => {
                const matchData = doc.data();
                if (matchData.player1Id === playerId || matchData.player2Id === playerId) {
                    playerMatches.push({
                        id: doc.id,
                        ...matchData
                    });
                }
            });

            // Calculate enhanced statistics
            const profileStats = {
                ...basicStats,
                performanceTrend: this.calculatePerformanceTrend(playerMatches, playerId, 30),
                opponentStats: this.calculateOpponentStats(playerMatches, playerId),
                timeBasedStats: this.calculateTimeBasedStats(playerMatches, playerId),
                achievements: this.calculateAchievements(playerMatches, playerId, basicStats),
                detailedRecentForm: this.getDetailedRecentForm(playerMatches, playerId, 10),
                dayOfWeekStats: this.calculateDayOfWeekStats(playerMatches, playerId),
                scoreAnalysis: this.calculateScoreAnalysis(playerMatches, playerId)
            };

            return profileStats;
        } catch (error) {
            console.error('Error getting player profile stats:', error);
            throw error;
        }
    }

    /**
     * Calculate current win/loss streak
     * @param {Array} matches - Player's matches
     * @param {string} playerId - Player's UID
     * @returns {Object} - Streak information
     */
    calculateStreak(matches, playerId) {
        if (matches.length === 0) {
            return { currentStreak: 0, streakType: 'none' };
        }

        // Sort matches by completion date (most recent first)
        const sortedMatches = matches.sort((a, b) => 
            b.completedDate?.toDate() - a.completedDate?.toDate()
        );

        let currentStreak = 0;
        let streakType = 'none';
        const mostRecentResult = sortedMatches[0].winnerId === playerId ? 'win' : 'loss';
        
        for (const match of sortedMatches) {
            const isWin = match.winnerId === playerId;
            
            if (currentStreak === 0) {
                // First match sets the streak type
                currentStreak = 1;
                streakType = isWin ? 'wins' : 'losses';
            } else if ((streakType === 'wins' && isWin) || (streakType === 'losses' && !isWin)) {
                // Continue the streak
                currentStreak++;
            } else {
                // Streak broken
                break;
            }
        }

        return { currentStreak, streakType };
    }

    /**
     * Calculate average score differential
     * @param {Array} matches - Player's matches
     * @param {string} playerId - Player's UID
     * @returns {number} - Average score differential
     */
    calculateAverageScoreDifferential(matches, playerId) {
        if (matches.length === 0) return 0;

        const totalDiff = matches.reduce((sum, match) => {
            const isPlayer1 = match.player1Id === playerId;
            const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
            const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
            return sum + (playerScore - opponentScore);
        }, 0);

        return Math.round((totalDiff / matches.length) * 10) / 10;
    }

    /**
     * Calculate recent form
     * @param {Array} matches - Player's matches
     * @param {string} playerId - Player's UID
     * @param {number} count - Number of recent matches
     * @returns {Array} - Recent form array
     */
    calculateRecentForm(matches, playerId, count = 5) {
        const recentMatches = matches
            .sort((a, b) => b.completedDate?.toDate() - a.completedDate?.toDate())
            .slice(0, count);

        return recentMatches.map(match => match.winnerId === playerId);
    }

    /**
     * Calculate ranking score
     * @param {number} winRate - Win rate percentage
     * @param {number} totalWins - Total wins
     * @param {number} recentWinRate - Recent win rate
     * @returns {number} - Ranking score
     */
    calculateRankingScore(winRate, totalWins, recentWinRate) {
        const baseScore = winRate * 0.6;
        const activityBonus = Math.min(totalWins * 0.5, 20);
        const recentFormBonus = (recentWinRate - winRate) * 0.1;
        
        return Math.round((baseScore + activityBonus + recentFormBonus) * 10) / 10;
    }

    /**
     * Calculate location-based statistics
     * @param {Array} matches - Player's matches
     * @param {string} playerId - Player's UID
     * @returns {Object} - Location statistics
     */
    calculateLocationStats(matches, playerId) {
        const locationStats = {};

        matches.forEach(match => {
            const location = match.location || 'Unknown';
            
            if (!locationStats[location]) {
                locationStats[location] = {
                    matches: 0,
                    wins: 0,
                    losses: 0,
                    winRate: 0
                };
            }

            locationStats[location].matches++;
            if (match.winnerId === playerId) {
                locationStats[location].wins++;
            } else {
                locationStats[location].losses++;
            }

            locationStats[location].winRate = Math.round(
                (locationStats[location].wins / locationStats[location].matches) * 100
            );
        });

        return locationStats;
    }

    /**
     * Calculate monthly statistics
     * @param {Array} matches - Player's matches
     * @param {string} playerId - Player's UID
     * @returns {Object} - Monthly statistics
     */
    calculateMonthlyStats(matches, playerId) {
        const monthlyStats = {};

        matches.forEach(match => {
            const date = match.completedDate?.toDate();
            if (!date) return;

            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            if (!monthlyStats[monthKey]) {
                monthlyStats[monthKey] = {
                    matches: 0,
                    wins: 0,
                    losses: 0,
                    winRate: 0
                };
            }

            monthlyStats[monthKey].matches++;
            if (match.winnerId === playerId) {
                monthlyStats[monthKey].wins++;
            } else {
                monthlyStats[monthKey].losses++;
            }

            monthlyStats[monthKey].winRate = Math.round(
                (monthlyStats[monthKey].wins / monthlyStats[monthKey].matches) * 100
            );
        });

        return monthlyStats;
    }

    /**
     * Calculate achievements
     * @param {Array} matches - Player's matches
     * @param {string} playerId - Player's UID
     * @param {Object} basicStats - Basic player statistics
     * @returns {Array} - Array of achievements
     */
    calculateAchievements(matches, playerId, basicStats) {
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
        
        // Streak-based achievements
        if (basicStats.currentStreak >= 3 && basicStats.streakType === 'wins') {
            achievements.push({ 
                id: 'three_streak', 
                name: 'Hot Streak', 
                description: 'Won 3 matches in a row', 
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
        
        return achievements;
    }

    /**
     * Get default stats for new players
     * @param {string} playerId - Player ID
     * @returns {Object} - Default stats object
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
            lastMatchDate: null,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        };
    }

    // Additional helper methods for enhanced stats...
    calculatePerformanceTrend(matches, playerId, days) {
        // Implementation for performance trend calculation
        return [];
    }

    calculateOpponentStats(matches, playerId) {
        // Implementation for opponent statistics
        return {};
    }

    calculateTimeBasedStats(matches, playerId) {
        // Implementation for time-based statistics
        return {};
    }

    getDetailedRecentForm(matches, playerId, count) {
        // Implementation for detailed recent form
        return [];
    }

    calculateDayOfWeekStats(matches, playerId) {
        // Implementation for day of week statistics
        return {};
    }

    calculateScoreAnalysis(matches, playerId) {
        // Implementation for score analysis
        return {};
    }
}

module.exports = new StatsService();

