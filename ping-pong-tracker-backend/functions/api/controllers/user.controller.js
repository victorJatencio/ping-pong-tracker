const { dbUtils, getAuth } = require('../../config/database');
const { responseHandler } = require('../../utils/response');
const { setCustomClaims } = require('../../config/auth');
const logger = require('../../utils/logger');

/**
 * Get all users (paginated)
 */
const getUsers = async (req, res) => {
    try {
        const { page = 1, limit = 10, excludeSelf = true } = req.query;
        const currentUserId = req.user.uid;
        
        // Calculate pagination
        const offset = (page - 1) * limit;
        
        // Get all users from Firestore
        const allUsers = await dbUtils.queryDocuments('users', [], { field: 'createdAt', direction: 'desc' });
        
        // Filter out current user if requested
        let filteredUsers = excludeSelf 
            ? allUsers.filter(user => user.id !== currentUserId)
            : allUsers;
        
        // Apply pagination
        const total = filteredUsers.length;
        const users = filteredUsers.slice(offset, offset + limit);
        
        // Remove sensitive information
        const sanitizedUsers = users.map(user => ({
            id: user.id,
            uid: user.uid,
            name: user.name,
            email: user.preferences?.privacy?.showEmail ? user.email : null,
            photoURL: user.photoURL,
            location: user.preferences?.privacy?.showLocation ? user.location : null,
            bio: user.bio,
            stats: user.preferences?.privacy?.showStats ? user.stats : null,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt
        }));
        
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        };
        
        logger.info(`Retrieved ${users.length} users for user ${currentUserId}`);
        return responseHandler.paginated(res, sanitizedUsers, pagination, 'Users retrieved successfully');
        
    } catch (error) {
        logger.error('Get users failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve users');
    }
};

/**
 * Search users by name or email
 */
const searchUsers = async (req, res) => {
    try {
        const { query, page = 1, limit = 10, excludeSelf = true } = req.query;
        const currentUserId = req.user.uid;
        
        if (!query || query.trim().length === 0) {
            return responseHandler.validationError(res, 
                [{ field: 'query', message: 'Search query is required' }],
                'Search query is required'
            );
        }
        
        // Get all users (Firestore doesn't support full-text search natively)
        const allUsers = await dbUtils.queryDocuments('users');
        
        // Filter users based on search query
        const searchTerm = query.toLowerCase().trim();
        let matchingUsers = allUsers.filter(user => {
            const name = (user.name || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            
            return name.includes(searchTerm) || email.includes(searchTerm);
        });
        
        // Filter out current user if requested
        if (excludeSelf) {
            matchingUsers = matchingUsers.filter(user => user.id !== currentUserId);
        }
        
        // Apply pagination
        const offset = (page - 1) * limit;
        const total = matchingUsers.length;
        const users = matchingUsers.slice(offset, offset + limit);
        
        // Remove sensitive information
        const sanitizedUsers = users.map(user => ({
            id: user.id,
            uid: user.uid,
            name: user.name,
            email: user.preferences?.privacy?.showEmail ? user.email : null,
            photoURL: user.photoURL,
            location: user.preferences?.privacy?.showLocation ? user.location : null,
            bio: user.bio,
            stats: user.preferences?.privacy?.showStats ? user.stats : null,
            createdAt: user.createdAt
        }));
        
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        };
        
        logger.info(`Search for "${query}" returned ${users.length} users for user ${currentUserId}`);
        return responseHandler.paginated(res, sanitizedUsers, pagination, 'Search completed successfully');
        
    } catch (error) {
        logger.error('Search users failed:', error.message);
        return responseHandler.error(res, 'Failed to search users');
    }
};

/**
 * Get user profile by ID
 */
const getUserById = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.uid;
        
        // Get user profile
        const userProfile = await dbUtils.getDocument('users', userId);
        
        if (!userProfile) {
            return responseHandler.notFound(res, 'User not found');
        }
        
        // Check if current user can view this profile
        const isOwnProfile = userId === currentUserId;
        const isAdmin = req.user.role === 'admin';
        
        // Prepare response based on privacy settings and permissions
        const response = {
            id: userProfile.id,
            uid: userProfile.uid,
            name: userProfile.name,
            photoURL: userProfile.photoURL,
            bio: userProfile.bio,
            createdAt: userProfile.createdAt
        };
        
        // Add conditional fields based on privacy settings or ownership
        if (isOwnProfile || isAdmin || userProfile.preferences?.privacy?.showEmail) {
            response.email = userProfile.email;
        }
        
        if (isOwnProfile || isAdmin || userProfile.preferences?.privacy?.showLocation) {
            response.location = userProfile.location;
        }
        
        if (isOwnProfile || isAdmin || userProfile.preferences?.privacy?.showStats) {
            response.stats = userProfile.stats;
        }
        
        // Add admin-only fields
        if (isAdmin) {
            response.lastLoginAt = userProfile.lastLoginAt;
            response.preferences = userProfile.preferences;
        }
        
        // Add own profile fields
        if (isOwnProfile) {
            response.preferences = userProfile.preferences;
            response.lastLoginAt = userProfile.lastLoginAt;
        }
        
        logger.info(`User profile ${userId} retrieved by user ${currentUserId}`);
        return responseHandler.success(res, response, 'User profile retrieved successfully');
        
    } catch (error) {
        logger.error('Get user by ID failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve user profile');
    }
};

/**
 * Update user role (admin only)
 */
const updateUserRole = async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        const currentUserId = req.user.uid;
        
        // Prevent self-role modification
        if (userId === currentUserId) {
            return responseHandler.forbidden(res, 'Cannot modify your own role');
        }
        
        // Get user profile
        const userProfile = await dbUtils.getDocument('users', userId);
        
        if (!userProfile) {
            return responseHandler.notFound(res, 'User not found');
        }
        
        // Set custom claims in Firebase Auth
        await setCustomClaims(userId, { role });
        
        // Update role in user profile
        await dbUtils.updateDocument('users', userId, { role });
        
        logger.info(`User role updated: ${userId} -> ${role} by admin ${currentUserId}`);
        return responseHandler.success(res, { userId, role }, 'User role updated successfully');
        
    } catch (error) {
        logger.error('Update user role failed:', error.message);
        return responseHandler.error(res, 'Failed to update user role');
    }
};

/**
 * Get user statistics
 */
const getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user.uid;
        
        // Get user profile
        const userProfile = await dbUtils.getDocument('users', userId);
        
        if (!userProfile) {
            return responseHandler.notFound(res, 'User not found');
        }
        
        // Check privacy settings
        const isOwnProfile = userId === currentUserId;
        const isAdmin = req.user.role === 'admin';
        const canViewStats = isOwnProfile || isAdmin || userProfile.preferences?.privacy?.showStats;
        
        if (!canViewStats) {
            return responseHandler.forbidden(res, 'User statistics are private');
        }
        
        // Get detailed statistics
        const matches = await dbUtils.queryDocuments('matches', [
            { field: 'participants', operator: 'array-contains', value: userId },
            { field: 'status', operator: '==', value: 'completed' }
        ]);
        
        // Calculate detailed statistics
        const stats = {
            basic: userProfile.stats || {},
            detailed: {
                totalMatches: matches.length,
                wins: matches.filter(match => match.winnerId === userId).length,
                losses: matches.filter(match => match.loserId === userId).length,
                recentMatches: matches
                    .sort((a, b) => b.completedDate?.toDate() - a.completedDate?.toDate())
                    .slice(0, 5)
                    .map(match => ({
                        id: match.id,
                        opponent: match.player1Id === userId ? match.player2Id : match.player1Id,
                        result: match.winnerId === userId ? 'win' : 'loss',
                        score: `${match.player1Score}-${match.player2Score}`,
                        date: match.completedDate
                    }))
            }
        };
        
        logger.info(`Statistics retrieved for user ${userId} by user ${currentUserId}`);
        return responseHandler.success(res, stats, 'User statistics retrieved successfully');
        
    } catch (error) {
        logger.error('Get user stats failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve user statistics');
    }
};

/**
 * Get user's match history
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
        
        const pagination = {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages: Math.ceil(total / limit)
        };
        
        logger.info(`Retrieved ${matches.length} matches for user ${userId}`);
        return responseHandler.paginated(res, matches, pagination, 'User matches retrieved successfully');
        
    } catch (error) {
        logger.error('Get user matches failed:', error.message);
        return responseHandler.error(res, 'Failed to retrieve user matches');
    }
};

module.exports = {
    getUsers,
    searchUsers,
    getUserById,
    updateUserRole,
    getUserStats,
    getUserMatches
};