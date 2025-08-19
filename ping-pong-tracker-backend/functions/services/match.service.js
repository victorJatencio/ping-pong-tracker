// ping-pong-tracker-backend/src/services/match.service.js
const admin = require('firebase-admin');
const statsService = require('./stats.service');

class MatchService {
    /**
     * Get upcoming matches for a user
     * @param {string} userId - User ID
     * @param {number} limitCount - Number of matches to fetch
     * @returns {Promise<Array>} - Array of upcoming matches
     */

    getDb() {
        return admin.firestore();
    }

    async getUpcomingMatches(userId, limitCount = 10) {
        try {

            const db = this.getDb();

            // Query for matches where user is player1 or player2
            const matchesRef = db.collection('matches');
            
            const [query1, query2] = await Promise.all([
                matchesRef
                    .where('status', '==', 'scheduled')
                    .where('player1Id', '==', userId)
                    .orderBy('scheduledDate', 'asc')
                    .limit(limitCount)
                    .get(),
                matchesRef
                    .where('status', '==', 'scheduled')
                    .where('player2Id', '==', userId)
                    .orderBy('scheduledDate', 'asc')
                    .limit(limitCount)
                    .get()
            ]);
            
            // Combine and sort results
            const matches = [];
            query1.forEach(doc => matches.push({ id: doc.id, ...doc.data() }));
            query2.forEach(doc => matches.push({ id: doc.id, ...doc.data() }));
            
            // Sort by scheduledDate and limit
            return matches
                .sort((a, b) => a.scheduledDate?.toDate() - b.scheduledDate?.toDate())
                .slice(0, limitCount);
        } catch (error) {
            console.error('Error fetching upcoming matches:', error);
            throw new Error('Failed to fetch upcoming matches');
        }
    }

    /**
     * Get recent matches for a user
     * @param {string} userId - User ID
     * @param {number} limitCount - Number of matches to fetch
     * @returns {Promise<Array>} - Array of recent matches
     */
    async getRecentMatches(userId, limitCount = 10) {
        try {
            const db = this.getDb();
            const matchesRef = db.collection('matches');
            
            const [query1, query2] = await Promise.all([
                matchesRef
                    .where('status', '==', 'completed')
                    .where('player1Id', '==', userId)
                    .orderBy('completedDate', 'desc')
                    .limit(limitCount)
                    .get(),
                matchesRef
                    .where('status', '==', 'completed')
                    .where('player2Id', '==', userId)
                    .orderBy('completedDate', 'desc')
                    .limit(limitCount)
                    .get()
            ]);
            
            const matches = [];
            query1.forEach(doc => matches.push({ id: doc.id, ...doc.data() }));
            query2.forEach(doc => matches.push({ id: doc.id, ...doc.data() }));
            
            return matches
                .sort((a, b) => b.completedDate?.toDate() - a.completedDate?.toDate())
                .slice(0, limitCount);
        } catch (error) {
            console.error('Error fetching recent matches:', error);
            throw new Error('Failed to fetch recent matches');
        }
    }

    /**
     * Get match details by ID
     * @param {string} matchId - Match ID
     * @returns {Promise<Object>} - Match details
     */
    async getMatchById(matchId) {
        try {
            const matchDoc = await db.collection('matches').doc(matchId).get();
            
            if (!matchDoc.exists) {
                throw new Error('Match not found');
            }
            
            return {
                id: matchDoc.id,
                ...matchDoc.data()
            };
        } catch (error) {
            console.error('Error fetching match:', error);
            throw error;
        }
    }

    /**
     * Create a new match
     * @param {Object} matchData - Match data
     * @param {string} createdBy - User ID of creator
     * @returns {Promise<string>} - ID of the created match
     */
    async createMatch(matchData, createdBy) {
        try {
            // Validate required fields
            this.validateMatchData(matchData);
            
            // Create scheduledDate from date and time
            let scheduledDate = null;
            if (matchData.date && matchData.time) {
                const [year, month, day] = matchData.date.split('-').map(Number);
                const [hours, minutes] = matchData.time.split(':').map(Number);
                scheduledDate = admin.firestore.Timestamp.fromDate(
                    new Date(year, month - 1, day, hours, minutes)
                );
            }
            
            const matchRef = await db.collection('matches').add({
                ...matchData,
                scheduledDate,
                status: 'scheduled',
                player1Score: 0,
                player2Score: 0,
                winnerId: null,
                loserId: null,
                createdBy,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`Match created: ${matchRef.id}`);
            return matchRef.id;
        } catch (error) {
            console.error('Error creating match:', error);
            throw error;
        }
    }

    /**
     * Update match scores and complete the match
     * @param {string} matchId - Match ID
     * @param {Object} scoreData - Score data
     * @param {string} updatedBy - User ID of updater
     * @returns {Promise<void>}
     */
    async updateMatchScore(matchId, scoreData, updatedBy) {
        try {
            // Get current match data
            const matchDoc = await db.collection('matches').doc(matchId).get();
            
            if (!matchDoc.exists) {
                throw new Error('Match not found');
            }
            
            const matchData = matchDoc.data();
            
            // Validate permissions
            if (matchData.player1Id !== updatedBy && matchData.player2Id !== updatedBy) {
                throw new Error('Only match participants can update scores');
            }
            
            // Validate scores
            this.validateScores(scoreData);
            
            // Determine winner and loser
            const { winnerId, loserId } = this.determineWinner(
                scoreData, 
                matchData.player1Id, 
                matchData.player2Id
            );
            
            // Create score update history
            const scoreUpdateHistory = matchData.scoreUpdateHistory || [];
            scoreUpdateHistory.push({
                previousScores: {
                    player1Score: matchData.player1Score,
                    player2Score: matchData.player2Score
                },
                newScores: {
                    player1Score: scoreData.player1Score,
                    player2Score: scoreData.player2Score
                },
                previousStatus: matchData.status,
                updatedBy,
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // Update match in transaction
            await db.runTransaction(async (transaction) => {
                // Update match
                transaction.update(db.collection('matches').doc(matchId), {
                    player1Score: scoreData.player1Score,
                    player2Score: scoreData.player2Score,
                    winnerId,
                    loserId,
                    status: 'completed',
                    completedDate: admin.firestore.FieldValue.serverTimestamp(),
                    scoreUpdateHistory,
                    lastUpdatedBy: updatedBy,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            
            // 🔥 CRITICAL: Auto-sync player stats after match completion
            console.log('Match completed, syncing player stats...');
            await Promise.all([
                statsService.syncPlayerStats(matchData.player1Id),
                statsService.syncPlayerStats(matchData.player2Id)
            ]);
            
            console.log(`Match ${matchId} completed and stats synced`);
        } catch (error) {
            console.error('Error updating match score:', error);
            throw error;
        }
    }

    /**
     * Cancel a scheduled match
     * @param {string} matchId - Match ID
     * @param {string} userId - User ID of canceler
     * @returns {Promise<void>}
     */
    async cancelMatch(matchId, userId) {
        try {
            const matchDoc = await db.collection('matches').doc(matchId).get();
            
            if (!matchDoc.exists) {
                throw new Error('Match not found');
            }
            
            const matchData = matchDoc.data();
            
            if (matchData.status !== 'scheduled') {
                throw new Error('Only scheduled matches can be canceled');
            }
            
            if (matchData.player1Id !== userId && matchData.player2Id !== userId) {
                throw new Error('Only match participants can cancel a match');
            }
            
            await db.collection('matches').doc(matchId).update({
                status: 'canceled',
                lastUpdatedBy: userId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`Match ${matchId} canceled by ${userId}`);
        } catch (error) {
            console.error('Error canceling match:', error);
            throw error;
        }
    }

    /**
     * Validate match data
     * @param {Object} matchData - Match data to validate
     */
    validateMatchData(matchData) {
        if (!matchData.player1Id || !matchData.player2Id) {
            throw new Error('Both players are required');
        }
        
        if (matchData.player1Id === matchData.player2Id) {
            throw new Error('Players cannot be the same');
        }
        
        if (!matchData.location) {
            throw new Error('Location is required');
        }
        
        if (!matchData.date || !matchData.time) {
            throw new Error('Date and time are required');
        }
    }

    /**
     * Validate scores
     * @param {Object} scoreData - Score data to validate
     */
    validateScores(scoreData) {
        const { player1Score, player2Score } = scoreData;
        
        if (typeof player1Score !== 'number' || typeof player2Score !== 'number') {
            throw new Error('Scores must be numbers');
        }
        
        if (player1Score < 0 || player2Score < 0) {
            throw new Error('Scores cannot be negative');
        }
        
        if (player1Score === player2Score) {
            throw new Error('Scores cannot be equal - no ties allowed');
        }
        
        if (player1Score > 100 || player2Score > 100) {
            throw new Error('Scores seem unreasonably high');
        }
    }

    /**
     * Determine winner and loser from scores
     * @param {Object} scoreData - Score data
     * @param {string} player1Id - Player 1 ID
     * @param {string} player2Id - Player 2 ID
     * @returns {Object} - Winner and loser IDs
     */
    determineWinner(scoreData, player1Id, player2Id) {
        const { player1Score, player2Score } = scoreData;
        
        if (player1Score > player2Score) {
            return { winnerId: player1Id, loserId: player2Id };
        } else {
            return { winnerId: player2Id, loserId: player1Id };
        }
    }
}

module.exports = new MatchService();

