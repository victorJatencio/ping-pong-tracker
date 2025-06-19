import { db } from '../config/firebase';
import { 
    collection, 
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    limit,
    Timestamp,
    serverTimestamp
} from 'firebase/firestore';

/**
 * Service for handling match operations
 */
const matchService = {
    /**
     * Get upcoming matches for a user
     * @param {string} userId - User ID
     * @param {number} limitCount - Number of matches to fetch
     * @returns {Promise<Array>} - Array of upcoming matches
     */
    async getUpcomingMatches(userId, limitCount = 10) {
        try {
            // Query for matches where user is player1
            const matchesQuery1 = query(
                collection(db, 'matches'),
                where('status', '==', 'scheduled'),
                where('player1Id', '==', userId),
                orderBy('scheduledDate', 'asc'),
                limit(limitCount)
            );
            
            // Query for matches where user is player2
            const matchesQuery2 = query(
                collection(db, 'matches'),
                where('status', '==', 'scheduled'),
                where('player2Id', '==', userId),
                orderBy('scheduledDate', 'asc'),
                limit(limitCount)
            );
            
            // Execute both queries
            const [querySnapshot1, querySnapshot2] = await Promise.all([
                getDocs(matchesQuery1),
                getDocs(matchesQuery2)
            ]);
            
            // Combine results
            const matches = [];
            
            querySnapshot1.forEach(doc => {
                matches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            querySnapshot2.forEach(doc => {
                matches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Sort by scheduledDate
            matches.sort((a, b) => {
                const dateA = a.scheduledDate?.toDate() || new Date(0);
                const dateB = b.scheduledDate?.toDate() || new Date(0);
                return dateA - dateB;
            });
            
            // Limit to requested count
            return matches.slice(0, limitCount);
        } catch (error) {
            console.error('Error fetching upcoming matches:', error);
            throw error;
        }
    },

    /**
     * Get recent matches for a user
     * @param {string} userId - User ID
     * @param {number} limitCount - Number of matches to fetch
     * @returns {Promise<Array>} - Array of recent matches
     */
    async getRecentMatches(userId, limitCount = 10) {
        try {
            // Query for matches where user is player1
            const matchesQuery1 = query(
                collection(db, 'matches'),
                where('status', '==', 'completed'),
                where('player1Id', '==', userId),
                orderBy('completedDate', 'desc'),
                limit(limitCount)
            );
            
            // Query for matches where user is player2
            const matchesQuery2 = query(
                collection(db, 'matches'),
                where('status', '==', 'completed'),
                where('player2Id', '==', userId),
                orderBy('completedDate', 'desc'),
                limit(limitCount)
            );
            
            // Execute both queries
            const [querySnapshot1, querySnapshot2] = await Promise.all([
                getDocs(matchesQuery1),
                getDocs(matchesQuery2)
            ]);
            
            // Combine results
            const matches = [];
            
            querySnapshot1.forEach(doc => {
                matches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            querySnapshot2.forEach(doc => {
                matches.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Sort by completedDate
            matches.sort((a, b) => {
                const dateA = a.completedDate?.toDate() || new Date(0);
                const dateB = b.completedDate?.toDate() || new Date(0);
                return dateB - dateA; // Descending order
            });
            
            // Limit to requested count
            return matches.slice(0, limitCount);
        } catch (error) {
            console.error('Error fetching recent matches:', error);
            throw error;
        }
    },

    /**
     * Get match details by ID
     * @param {string} matchId - Match ID
     * @returns {Promise<Object>} - Match details
     */
    async getMatchById(matchId) {
        try {
            const matchDoc = await getDoc(doc(db, 'matches', matchId));
            
            if (matchDoc.exists()) {
                return {
                    id: matchDoc.id,
                    ...matchDoc.data()
                };
            } else {
                throw new Error('Match not found');
            }
        } catch (error) {
            console.error('Error fetching match:', error);
            throw error;
        }
    },

    /**
     * Create a new match
     * @param {Object} matchData - Match data
     * @returns {Promise<string>} - ID of the created match
     */
    async createMatch(matchData) {
        try {
            // Create a scheduledDate Timestamp from date and time strings
            let scheduledDate = null;
            if (matchData.date && matchData.time) {
                const [year, month, day] = matchData.date.split('-').map(Number);
                const [hours, minutes] = matchData.time.split(':').map(Number);
                scheduledDate = Timestamp.fromDate(new Date(year, month - 1, day, hours, minutes));
            }
            
            const matchRef = await addDoc(collection(db, 'matches'), {
                ...matchData,
                scheduledDate,
                status: 'scheduled',
                player1Score: 0,
                player2Score: 0,
                winnerId: null,
                loserId: null,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            return matchRef.id;
        } catch (error) {
            console.error('Error creating match:', error);
            throw error;
        }
    },

    /**
     * Update match scores and status
     * @param {string} matchId - Match ID
     * @param {Object} scoreData - Score data
     * @returns {Promise<void>}
     */
    async updateMatchScore(matchId, scoreData) {
        try {
            const matchDoc = await getDoc(doc(db, 'matches', matchId));
            
            if (!matchDoc.exists()) {
                throw new Error('Match not found');
            }
            
            const matchData = matchDoc.data();
            
            // Determine winner and loser
            let winnerId = null;
            let loserId = null;
            
            if (scoreData.player1Score > scoreData.player2Score) {
                winnerId = matchData.player1Id;
                loserId = matchData.player2Id;
            } else if (scoreData.player2Score > scoreData.player1Score) {
                winnerId = matchData.player2Id;
                loserId = matchData.player1Id;
            } else {
                throw new Error('Scores cannot be equal');
            }
            
            // Create score update history entry
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
                updatedBy: scoreData.updatedBy,
                timestamp: serverTimestamp()
            });
            
            // Update match
            await updateDoc(doc(db, 'matches', matchId), {
                player1Score: scoreData.player1Score,
                player2Score: scoreData.player2Score,
                winnerId,
                loserId,
                status: 'completed',
                completedDate: serverTimestamp(),
                scoreUpdateHistory,
                lastUpdatedBy: scoreData.updatedBy,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error updating match score:', error);
            throw error;
        }
    },

    /**
     * Cancel a scheduled match
     * @param {string} matchId - Match ID
     * @param {string} userId - User ID of the person canceling
     * @returns {Promise<void>}
     */
    async cancelMatch(matchId, userId) {
        try {
            const matchDoc = await getDoc(doc(db, 'matches', matchId));
            
            if (!matchDoc.exists()) {
                throw new Error('Match not found');
            }
            
            const matchData = matchDoc.data();
            
            if (matchData.status !== 'scheduled') {
                throw new Error('Only scheduled matches can be canceled');
            }
            
            // Check if user is a participant
            if (matchData.player1Id !== userId && matchData.player2Id !== userId) {
                throw new Error('Only match participants can cancel a match');
            }
            
            await updateDoc(doc(db, 'matches', matchId), {
                status: 'canceled',
                lastUpdatedBy: userId,
                updatedAt: serverTimestamp()
            });
        } catch (error) {
            console.error('Error canceling match:', error);
            throw error;
        }
    }
};

export default matchService;