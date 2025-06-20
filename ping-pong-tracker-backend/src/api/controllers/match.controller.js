const { dbUtils, admin } = require('../../config/database');
const { responseHandler } = require('../../utils/response');
const logger = require('../../utils/logger');

/**
 * Get matches with filters and pagination
 */
const getMatches = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            playerId,
            startDate,
            endDate,
            sortBy = 'scheduledDate',
            sortOrder = 'desc'
        } = req.query;
        
        // Build query filters
        const filters = [];
        
        if (status) {
            filters.push({ field: 'status', operator: '==', value: status });
        }
        
        if (playerId) {
            filters.push({ field: 'participants', operator: 'array-contains', value: playerId });
        }
        
        if (startDate) {
            filters.push({ field: sortBy, operator: '>=', value: new Date(startDate) });
        }
        
        if (endDate) {
            filters.push({ field: sortBy, operator: '<=', value: new Date(endDate) });
        }
        
        // Get matches
        const allMatches = await dbUtils.queryDocuments('matches', filters, 
            { field: sortBy, direction: sortOrder }
        );
        
        // Apply pagination
        const offset = (page - 1) * limit;
        const total = allMatches.length;
        const matches = allMatches.slice(offset, offset + limit);
        
        // Enrich matches with player information
        const enrichedMatches = await enrichMatchesWithPlayerInfo(matches);
        
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        };
        
        logger.info(`Retrieved ${matches.length} matches with filters:`, { status, playerId, startDate, endDate });
        return responseHandler.paginated(res, enrichedMatches, pagination, 'Matches retrieved successfully');
        
    } catch (error) {
        logger.error('Get matches failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve matches');
    }
};

/**
 * Create a new match
 */
const createMatch = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const { player2Id, scheduledDate, location, notes, type = 'casual' } = req.body;
        
        // Validate that player2 exists
        const player2 = await dbUtils.getDocument('users', player2Id);
        if (!player2) {
            return responseHandler.notFound(res, 'Opponent not found');
        }
        
        // Prevent self-matches
        if (currentUserId === player2Id) {
            return responseHandler.validationError(res, 
                [{ field: 'player2Id', message: 'Cannot create a match against yourself' }],
                'Invalid opponent selection'
            );
        }
        
        // Create match data
        const matchData = {
            player1Id: currentUserId,
            player2Id,
            participants: [currentUserId, player2Id], // For easier querying
            player1Score: 0,
            player2Score: 0,
            winnerId: null,
            loserId: null,
            status: 'scheduled',
            type,
            scheduledDate: new Date(scheduledDate),
            location,
            notes: notes || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: currentUserId,
            scoreUpdateHistory: []
        };
        
        // Create match
        const matchId = await dbUtils.createDocument('matches', matchData);
        
        // Get created match with player info
        const createdMatch = await dbUtils.getDocument('matches', matchId);
        const enrichedMatch = await enrichMatchWithPlayerInfo(createdMatch);
        
        logger.info(`Match created: ${matchId} between ${currentUserId} and ${player2Id}`);
        return responseHandler.created(res, enrichedMatch, 'Match created successfully');
        
    } catch (error) {
        logger.error('Create match failed:', error.message);
        return responseHandler.error(res, 'Failed to create match');
    }
};

/**
 * Get match by ID
 */
const getMatchById = async (req, res) => {
    try {
        const match = req.match; // Set by requireMatchParticipant middleware
        
        // Enrich match with player information
        const enrichedMatch = await enrichMatchWithPlayerInfo(match);
        
        logger.info(`Match ${match.id} retrieved by user ${req.user.uid}`);
        return responseHandler.success(res, enrichedMatch, 'Match retrieved successfully');
        
    } catch (error) {
        logger.error('Get match by ID failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve match');
    }
};

/**
 * Update match scores
 */
const updateMatchScores = async (req, res) => {
    try {
        const match = req.match;
        const currentUserId = req.user.uid;
        const { player1Score, player2Score, status, notes } = req.body;
        
        // Validate match can be updated
        if (match.status === 'completed') {
            return responseHandler.conflict(res, 'Cannot update scores for completed match');
        }
        
        if (match.status === 'cancelled') {
            return responseHandler.conflict(res, 'Cannot update scores for cancelled match');
        }
        
        // Determine winner and loser
        let winnerId = null;
        let loserId = null;
        
        if (status === 'completed') {
            if (player1Score > player2Score) {
                winnerId = match.player1Id;
                loserId = match.player2Id;
            } else {
                winnerId = match.player2Id;
                loserId = match.player1Id;
            }
        }
        
        // Create score update history entry
        const scoreUpdate = {
            timestamp: new Date(),
            updatedBy: currentUserId,
            previousScores: {
                player1Score: match.player1Score,
                player2Score: match.player2Score
            },
            newScores: {
                player1Score,
                player2Score
            },
            previousStatus: match.status,
            newStatus: status
        };
        
        // Update match
        const updateData = {
            player1Score,
            player2Score,
            status,
            winnerId,
            loserId,
            notes: notes || match.notes,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: currentUserId,
            scoreUpdateHistory: admin.firestore.FieldValue.arrayUnion(scoreUpdate)
        };
        
        // Add completion date if match is completed
        if (status === 'completed') {
            updateData.completedDate = admin.firestore.FieldValue.serverTimestamp();
        }
        
        await dbUtils.updateDocument('matches', match.id, updateData);
        
        // Update player statistics if match is completed
        if (status === 'completed') {
            await updatePlayerStatistics(match.player1Id, match.player2Id, winnerId, loserId);
        }
        
        // Get updated match
        const updatedMatch = await dbUtils.getDocument('matches', match.id);
        const enrichedMatch = await enrichMatchWithPlayerInfo(updatedMatch);
        
        logger.info(`Match scores updated: ${match.id} by user ${currentUserId}`);
        return responseHandler.success(res, enrichedMatch, 'Match scores updated successfully');
        
    } catch (error) {
        logger.error('Update match scores failed:', error.message);
        return responseHandler.error(res, 'Failed to update match scores');
    }
};

/**
 * Update match status
 */
const updateMatchStatus = async (req, res) => {
    try {
        const match = req.match;
        const currentUserId = req.user.uid;
        const { status, notes } = req.body;
        
        // Validate status transition
        const validTransitions = {
            'scheduled': ['in-progress', 'cancelled'],
            'in-progress': ['completed', 'cancelled'],
            'completed': [], // Cannot change from completed
            'cancelled': [] // Cannot change from cancelled
        };
        
        if (!validTransitions[match.status].includes(status)) {
            return responseHandler.validationError(res,
                [{ field: 'status', message: `Cannot change status from ${match.status} to ${status}` }],
                'Invalid status transition'
            );
        }
        
        // Update match
        const updateData = {
            status,
            notes: notes || match.notes,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: currentUserId
        };
        
        await dbUtils.updateDocument('matches', match.id, updateData);
        
        // Get updated match
        const updatedMatch = await dbUtils.getDocument('matches', match.id);
        const enrichedMatch = await enrichMatchWithPlayerInfo(updatedMatch);
        
        logger.info(`Match status updated: ${match.id} -> ${status} by user ${currentUserId}`);
        return responseHandler.success(res, enrichedMatch, 'Match status updated successfully');
        
    } catch (error) {
        logger.error('Update match status failed:', error.message);
        return responseHandler.error(res, 'Failed to update match status');
    }
};

/**
 * Delete/cancel a match
 */
const deleteMatch = async (req, res) => {
    try {
        const match = req.match;
        const currentUserId = req.user.uid;
        
        // Only allow deletion of scheduled matches
        if (match.status === 'completed') {
            return responseHandler.conflict(res, 'Cannot delete completed matches');
        }
        
        // Update match status to cancelled instead of deleting
        await dbUtils.updateDocument('matches', match.id, {
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: currentUserId,
            cancelledAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        logger.info(`Match cancelled: ${match.id} by user ${currentUserId}`);
        return responseHandler.success(res, null, 'Match cancelled successfully');
        
    } catch (error) {
        logger.error('Delete match failed:', error.message);
        return responseHandler.error(res, 'Failed to cancel match');
    }
};

/**
 * Get matches for a specific user
 */
const getUserMatches = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, status } = req.query;
        
        // Build query filters
        const filters = [
            { field: 'participants', operator: 'array-contains', value: userId }
        ];
        
        if (status) {
            filters.push({ field: 'status', operator: '==', value: status });
        }
        
        // Get matches
        const allMatches = await dbUtils.queryDocuments('matches', filters,
            { field: 'createdAt', direction: 'desc' }
        );
        
        // Apply pagination
        const offset = (page - 1) * limit;
        const total = allMatches.length;
        const matches = allMatches.slice(offset, offset + limit);
        
        // Enrich matches with player information
        const enrichedMatches = await enrichMatchesWithPlayerInfo(matches);
        
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        };
        
        logger.info(`Retrieved ${matches.length} matches for user ${userId}`);
        return responseHandler.paginated(res, enrichedMatches, pagination, 'User matches retrieved successfully');
        
    } catch (error) {
        logger.error('Get user matches failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve user matches');
    }
};

/**
 * Get upcoming matches for current user
 */
const getUpcomingMatches = async (req, res) => {
    try {
        const currentUserId = req.user.uid;
        const { limit = 5 } = req.query;
        
        // Get upcoming matches
        const matches = await dbUtils.queryDocuments('matches', [
            { field: 'participants', operator: 'array-contains', value: currentUserId },
            { field: 'status', operator: 'in', value: ['scheduled', 'in-progress'] },
            { field: 'scheduledDate', operator: '>=', value: new Date() }
        ], { field: 'scheduledDate', direction: 'asc' }, parseInt(limit));
        
        // Enrich matches with player information
        const enrichedMatches = await enrichMatchesWithPlayerInfo(matches);
        
        logger.info(`Retrieved ${matches.length} upcoming matches for user ${currentUserId}`);
        return responseHandler.success(res, enrichedMatches, 'Upcoming matches retrieved successfully');
        
    } catch (error) {
        logger.error('Get upcoming matches failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve upcoming matches');
    }
};

/**
 * Get recent completed matches
 */
const getRecentMatches = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        
        // Get recent completed matches
        const matches = await dbUtils.queryDocuments('matches', [
            { field: 'status', operator: '==', value: 'completed' }
        ], { field: 'completedDate', direction: 'desc' }, parseInt(limit));
        
        // Enrich matches with player information
        const enrichedMatches = await enrichMatchesWithPlayerInfo(matches);
        
        logger.info(`Retrieved ${matches.length} recent completed matches`);
        return responseHandler.success(res, enrichedMatches, 'Recent matches retrieved successfully');
        
    } catch (error) {
        logger.error('Get recent matches failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve recent matches');
    }
};

/**
 * Helper function to enrich match with player information
 */
const enrichMatchWithPlayerInfo = async (match) => {
    try {
        const [player1, player2] = await Promise.all([
            dbUtils.getDocument('users', match.player1Id),
            dbUtils.getDocument('users', match.player2Id)
        ]);
        
        return {
            ...match,
            player1: player1 ? {
                id: player1.id,
                name: player1.name,
                photoURL: player1.photoURL
            } : null,
            player2: player2 ? {
                id: player2.id,
                name: player2.name,
                photoURL: player2.photoURL
            } : null
        };
    } catch (error) {
        logger.error('Failed to enrich match with player info:', error.message);
        return match;
    }
};

/**
 * Helper function to enrich multiple matches with player information
 */
const enrichMatchesWithPlayerInfo = async (matches) => {
    return Promise.all(matches.map(match => enrichMatchWithPlayerInfo(match)));
};

/**
 * Helper function to update player statistics
 */
const updatePlayerStatistics = async (player1Id, player2Id, winnerId, loserId) => {
    try {
        // Update statistics for both players
        await Promise.all([
            updateSinglePlayerStats(player1Id, winnerId === player1Id),
            updateSinglePlayerStats(player2Id, winnerId === player2Id)
        ]);
        
        logger.info(`Statistics updated for players ${player1Id} and ${player2Id}`);
    } catch (error) {
        logger.error('Failed to update player statistics:', error.message);
    }
};

/**
 * Helper function to update single player statistics
 */
const updateSinglePlayerStats = async (playerId, isWinner) => {
    try {
        const player = await dbUtils.getDocument('users', playerId);
        if (!player) return;
        
        const stats = player.stats || {
            totalMatches: 0,
            totalWins: 0,
            totalLosses: 0,
            winRate: 0,
            currentStreak: 0,
            streakType: null,
            bestStreak: 0
        };
        
        // Update basic stats
        stats.totalMatches += 1;
        
        if (isWinner) {
            stats.totalWins += 1;
            
            // Update streak
            if (stats.streakType === 'wins') {
                stats.currentStreak += 1;
            } else {
                stats.currentStreak = 1;
                stats.streakType = 'wins';
            }
        } else {
            stats.totalLosses += 1;
            
            // Update streak
            if (stats.streakType === 'losses') {
                stats.currentStreak += 1;
            } else {
                stats.currentStreak = 1;
                stats.streakType = 'losses';
            }
        }
        
        // Update best streak (only for wins)
        if (stats.streakType === 'wins' && stats.currentStreak > stats.bestStreak) {
            stats.bestStreak = stats.currentStreak;
        }
        
        // Calculate win rate
        stats.winRate = stats.totalMatches > 0 ? 
            Math.round((stats.totalWins / stats.totalMatches) * 100) : 0;
        
        // Update player document
        await dbUtils.updateDocument('users', playerId, { stats });
        
    } catch (error) {
        logger.error(`Failed to update stats for player ${playerId}:`, error.message);
    }
};

module.exports = {
    getMatches,
    createMatch,
    getMatchById,
    updateMatchScores,
    updateMatchStatus,
    deleteMatch,
    getUserMatches,
    getUpcomingMatches,
    getRecentMatches
};