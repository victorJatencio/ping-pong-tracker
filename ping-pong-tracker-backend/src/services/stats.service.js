// ping-pong-tracker-backend/src/services/stats.service.js
const admin = require('firebase-admin');

class StatsService {
    /**
     * Helper method to get database instance
     * Prevents Firebase initialization issues
     */
    getDb() {
        return admin.firestore();
    }

    /**
     * Sync player stats after match completion
     * This is the CRITICAL method that fixes the playerStats sync issue
     * @param {string} playerId - Player ID to sync stats for
     * @returns {Promise<Object>} - Updated player stats
     */
    async syncPlayerStats(playerId) {
        try {
            const db = this.getDb();
            
            console.log(`🔄 Syncing stats for player: ${playerId}`);
            
            // Calculate fresh stats from all completed matches
            const freshStats = await this.calculatePlayerStats(playerId);
            
            // Update playerStats collection with merge to preserve existing fields
            await db.collection('playerStats').doc(playerId).set(freshStats, { merge: true });
            
            console.log(`✅ Stats synced successfully for player: ${playerId}`, {
                totalMatches: freshStats.totalMatches,
                totalWins: freshStats.totalWins,
                winRate: freshStats.winRate
            });
            
            return freshStats;
        } catch (error) {
            console.error(`❌ Error syncing stats for player ${playerId}:`, error);
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
            const db = this.getDb();
            
            console.log(`📊 Calculating stats for player: ${playerId}`);
            
            // Fetch all completed matches for this player
            const matchesRef = db.collection('matches');
            
            // Query for matches where player is player1
            const player1Matches = await matchesRef
                .where('player1Id', '==', playerId)
                .where('status', '==', 'completed')
                .get();
            
            // Query for matches where player is player2
            const player2Matches = await matchesRef
                .where('player2Id', '==', playerId)
                .where('status', '==', 'completed')
                .get();
            
            // Combine all matches
            const playerMatches = [];
            
            player1Matches.forEach(doc => {
                playerMatches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            player2Matches.forEach(doc => {
                playerMatches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`📈 Found ${playerMatches.length} completed matches for player ${playerId}`);

            if (playerMatches.length === 0) {
                console.log(`🆕 No matches found, returning default stats for player ${playerId}`);
                return this.getDefaultStats(playerId);
            }

            // Calculate basic statistics
            const totalMatches = playerMatches.length;
            let totalWins = 0;
            let totalLosses = 0;

            // Calculate wins and losses by comparing scores
            playerMatches.forEach(match => {
                const isPlayer1 = match.player1Id === playerId;
                const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
                const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
                
                if (playerScore > opponentScore) {
                    totalWins++;
                } else if (playerScore < opponentScore) {
                    totalLosses++;
                }
                // Ties are not counted as wins or losses
            });

            const winRate = totalMatches > 0 ? Math.round((totalWins / totalMatches) * 100) : 0;

            // Calculate current streak
            const { currentStreak, streakType } = this.calculateStreak(playerMatches, playerId);

            // Calculate average score differential
            const avgScoreDiff = this.calculateAverageScoreDifferential(playerMatches, playerId);

            // Calculate recent form (last 5 matches)
            const recentForm = this.calculateRecentForm(playerMatches, playerId, 5);

            // Calculate recent win rate (last 10 matches)
            const recentMatches = playerMatches
                .sort((a, b) => {
                    const dateA = a.completedDate?.toDate ? a.completedDate.toDate() : new Date(a.completedDate);
                    const dateB = b.completedDate?.toDate ? b.completedDate.toDate() : new Date(b.completedDate);
                    return dateB - dateA;
                })
                .slice(0, 10);
            
            const recentWins = recentMatches.filter(match => {
                const isPlayer1 = match.player1Id === playerId;
                const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
                const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
                return playerScore > opponentScore;
            }).length;
            
            const recentWinRate = recentMatches.length > 0 
                ? Math.round((recentWins / recentMatches.length) * 100)
                : winRate;

            // Calculate ranking score
            const rankingScore = this.calculateRankingScore(winRate, totalWins, recentWinRate);

            // Calculate location-based statistics
            const locationStats = this.calculateLocationStats(playerMatches, playerId);

            // Calculate monthly statistics
            const monthlyStats = this.calculateMonthlyStats(playerMatches, playerId);

            // Get last match date
            const lastMatchDate = playerMatches.length > 0 
                ? playerMatches.sort((a, b) => {
                    const dateA = a.completedDate?.toDate ? a.completedDate.toDate() : new Date(a.completedDate);
                    const dateB = b.completedDate?.toDate ? b.completedDate.toDate() : new Date(b.completedDate);
                    return dateB - dateA;
                })[0].completedDate
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

            console.log(`📊 Calculated stats for ${playerId}:`, {
                totalMatches,
                totalWins,
                totalLosses,
                winRate,
                currentStreak,
                streakType
            });

            return stats;
        } catch (error) {
            console.error('❌ Error calculating player stats:', error);
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
            const db = this.getDb();
            
            console.log(`📋 Getting profile stats for player: ${playerId}`);
            
            // Get basic stats from playerStats collection
            const statsDoc = await db.collection('playerStats').doc(playerId).get();
            
            if (!statsDoc.exists) {
                console.log('📊 No player stats found, calculating initial statistics...');
                return await this.calculatePlayerStats(playerId);
            }
            
            const basicStats = statsDoc.data();
            console.log('📊 Found existing player stats:', {
                totalMatches: basicStats.totalMatches,
                totalWins: basicStats.totalWins,
                winRate: basicStats.winRate
            });
            
            // Return basic stats with achievements calculated
            const achievements = this.calculateAchievements([], playerId, basicStats);
            
            return {
                ...basicStats,
                achievements
            };
        } catch (error) {
            console.error('❌ Error getting player profile stats:', error);
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
        const sortedMatches = matches.sort((a, b) => {
            const dateA = a.completedDate?.toDate ? a.completedDate.toDate() : new Date(a.completedDate);
            const dateB = b.completedDate?.toDate ? b.completedDate.toDate() : new Date(b.completedDate);
            return dateB - dateA;
        });

        let currentStreak = 0;
        let streakType = 'none';
        
        for (const match of sortedMatches) {
            const isPlayer1 = match.player1Id === playerId;
            const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
            const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
            const isWin = playerScore > opponentScore;
            
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
     * @returns {Array} - Recent form array (true = win, false = loss)
     */
    calculateRecentForm(matches, playerId, count = 5) {
        const recentMatches = matches
            .sort((a, b) => {
                const dateA = a.completedDate?.toDate ? a.completedDate.toDate() : new Date(a.completedDate);
                const dateB = b.completedDate?.toDate ? b.completedDate.toDate() : new Date(b.completedDate);
                return dateB - dateA;
            })
            .slice(0, count);

        return recentMatches.map(match => {
            const isPlayer1 = match.player1Id === playerId;
            const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
            const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
            return playerScore > opponentScore;
        });
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
            
            const isPlayer1 = match.player1Id === playerId;
            const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
            const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
            
            if (playerScore > opponentScore) {
                locationStats[location].wins++;
            } else if (playerScore < opponentScore) {
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
            const date = match.completedDate?.toDate ? match.completedDate.toDate() : new Date(match.completedDate);
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
            
            const isPlayer1 = match.player1Id === playerId;
            const playerScore = isPlayer1 ? match.player1Score : match.player2Score;
            const opponentScore = isPlayer1 ? match.player2Score : match.player1Score;
            
            if (playerScore > opponentScore) {
                monthlyStats[monthKey].wins++;
            } else if (playerScore < opponentScore) {
                monthlyStats[monthKey].losses++;
            }

            monthlyStats[monthKey].winRate = Math.round(
                (monthlyStats[monthKey].wins / monthlyStats[monthKey].matches) * 100
            );
        });

        return monthlyStats;
    }

    /**
     * Calculate achievements for Achievements Card
     * @param {Array} matches - Player's matches (can be empty if using basicStats)
     * @param {string} playerId - Player's UID
     * @param {Object} basicStats - Basic player statistics
     * @returns {Array} - Array of achievements
     */
    calculateAchievements(matches, playerId, basicStats) {
        const achievements = [];
        
        // Win-based achievements
        if (basicStats.totalWins >= 1) {
            achievements.push({ 
                id: 'first_win', 
                name: 'First Victory', 
                description: 'Won your first match', 
                unlocked: true,
                icon: '🏆'
            });
        }
        
        if (basicStats.totalWins >= 5) {
            achievements.push({ 
                id: 'five_wins', 
                name: 'Getting Started', 
                description: 'Won 5 matches', 
                unlocked: true,
                icon: '🎯'
            });
        }
        
        if (basicStats.totalWins >= 10) {
            achievements.push({ 
                id: 'ten_wins', 
                name: 'Double Digits', 
                description: 'Won 10 matches', 
                unlocked: true,
                icon: '🏅'
            });
        }
        
        // Streak-based achievements
        if (basicStats.currentStreak >= 3 && basicStats.streakType === 'wins') {
            achievements.push({ 
                id: 'hot_streak', 
                name: 'Hot Streak', 
                description: 'Won 3 matches in a row', 
                unlocked: true,
                icon: '🔥'
            });
        }
        
        // Win rate achievements
        if (basicStats.winRate >= 70 && basicStats.totalMatches >= 10) {
            achievements.push({ 
                id: 'dominator', 
                name: 'Dominator', 
                description: '70%+ win rate with 10+ matches', 
                unlocked: true,
                icon: '👑'
            });
        }
        
        // Games played achievements
        if (basicStats.totalMatches >= 10) {
            achievements.push({ 
                id: 'veteran', 
                name: 'Veteran Player', 
                description: 'Played 10+ matches', 
                unlocked: true,
                icon: '🎮'
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

    /**
     * Force sync all player stats (useful for data migration)
     * @returns {Promise<void>}
     */
    async syncAllPlayerStats() {
        try {
            const db = this.getDb();
            
            console.log('🔄 Starting sync for all players...');
            
            // Get all unique player IDs from matches
            const matchesSnapshot = await db.collection('matches').get();
            const playerIds = new Set();
            
            matchesSnapshot.forEach(doc => {
                const match = doc.data();
                if (match.player1Id) playerIds.add(match.player1Id);
                if (match.player2Id) playerIds.add(match.player2Id);
            });
            
            console.log(`📊 Found ${playerIds.size} unique players to sync`);
            
            // Sync stats for each player
            const syncPromises = Array.from(playerIds).map(playerId => 
                this.syncPlayerStats(playerId)
            );
            
            await Promise.all(syncPromises);
            
            console.log('✅ All player stats synced successfully');
        } catch (error) {
            console.error('❌ Error syncing all player stats:', error);
            throw error;
        }
    }
}

module.exports = new StatsService();

