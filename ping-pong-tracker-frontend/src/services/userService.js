import { db } from '../config/firebase';
import { 
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    limit
} from 'firebase/firestore';

/**
 * Service for handling user-related operations
 */
const userService = {
    /**
     * Get a user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} - User data
     */
    async getUserById(userId) {
        try {
            // Check if this is a test user ID
            if (userId && userId.startsWith('test-')) {
                // Return a dummy user object for test IDs
                return {
                    uid: userId,
                    name: userId.includes('sender') ? 'Test Sender' : 'Test Opponent',
                    email: 'test@example.com',
                    profileImageUrl: null,
                    isTestUser: true
                };
            }

            // For real users, fetch from Firebase
            const userDoc = await getDoc(doc(db, 'users', userId));
            
            if (!userDoc.exists()) {
                throw new Error('User not found');
            }
            
            return {
                uid: userId,
                ...userDoc.data()
            };
        } catch (error) {
            console.error(`Error fetching user: ${error}`);
            throw error;
        }
    },

    /**
     * Get multiple users by their IDs
     * @param {Array<string>} userIds - Array of user IDs
     * @returns {Promise<Object>} - Map of user IDs to user data
     */
    async getUsersByIds(userIds) {
        try {
            if (!userIds || userIds.length === 0) {
                return {};
            }
            
            // Filter out duplicate IDs
            const uniqueIds = [...new Set(userIds)];
            
            // Get all users in parallel
            const userPromises = uniqueIds.map(async (userId) => {
                try {
                    const user = await this.getUserById(userId);
                    return [userId, user];
                } catch (error) {
                    console.error(`Error fetching user ${userId}: ${error}`);
                    // Return a dummy user for IDs that couldn't be fetched
                    return [userId, {
                        uid: userId,
                        name: userId.includes('sender') ? 'Test Sender' : 'Test Opponent',
                        email: 'test@example.com',
                        profileImageUrl: null,
                        isTestUser: true
                    }];
                }
            });
            
            const userEntries = await Promise.all(userPromises);
            
            // Convert array of entries to object
            return Object.fromEntries(userEntries);
        } catch (error) {
            console.error(`Error fetching users: ${error}`);
            return {};
        }
    },

    /**
     * Get all users except the current user
     * @param {string} currentUserId - Current user ID
     * @param {number} limitCount - Maximum number of users to return
     * @returns {Promise<Array<Object>>} - Array of user data
     */
    async getOtherUsers(currentUserId, limitCount = 20) {
        try {
            const usersQuery = query(
                collection(db, 'users'),
                where('uid', '!=', currentUserId),
                limit(limitCount)
            );
            
            const usersSnapshot = await getDocs(usersQuery);
            
            return usersSnapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error fetching other users:', error);
            throw error;
        }
    }
};

export default userService;